import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatCard from '@/components/StatCard';
import { apiFetch } from '@/lib/api';
import { Users, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  active: boolean;
  added_date: string;
}

interface BusinessUser {
  id: number;
}

interface Transaction {
  transaction_type: string;
  credits: string;
}

export default function AdminDashboard() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricePerCredit, setPricePerCredit] = useState(0);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/v1/CarbonLedger/'),
      apiFetch('/api/v1/CarbonLedgerUsers/'),
      apiFetch('/api/v1/CarbonLedgerTransactions/'),
      apiFetch('/api/v1/pricing/'),
    ])
      .then(([companyData, userData, txData, pricingData]) => {
        setCompanies(companyData);
        setUsers(userData);
        setTransactions(txData);
        setPricePerCredit(parseFloat(pricingData.price_per_credit));
        setNewPrice(pricingData.price_per_credit);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const pendingCompanies = companies.filter((c) => !c.active);
  const verifiedCompanies = companies.filter((c) => c.active);
  const totalCreditsIssued = transactions
    .filter((t) => t.transaction_type === 'Issuance')
    .reduce((sum, t) => sum + parseFloat(t.credits), 0);

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    try {
      await apiFetch(`/api/v1/CarbonLedger/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ active: true }),
      });
      loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  const handleUpdatePrice = async () => {
    setSavingPrice(true);
    setError('');
    try {
      await apiFetch('/api/v1/pricing/', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_credit: newPrice }),
      });
      setPricePerCredit(parseFloat(newPrice));
    } catch (err: any) {
      setError(err.message || 'Only admins can update pricing.');
    } finally {
      setSavingPrice(false);
    }
  };

  const systemMetrics = [
    { label: 'Total Users', value: users.length, icon: <Users className="h-6 w-6" /> },
    { label: 'Verified Projects', value: verifiedCompanies.length, icon: <CheckCircle className="h-6 w-6" /> },
    { label: 'Pending Review', value: pendingCompanies.length, icon: <AlertCircle className="h-6 w-6" />, description: 'Awaiting activation' },
    { label: 'Total Credits Issued', value: totalCreditsIssued.toLocaleString(), icon: <TrendingUp className="h-6 w-6" /> },
  ];

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500 text-sm">Loading admin dashboard...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
            <p className="text-slate-600">Manage projects, users, and system-wide metrics</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {systemMetrics.map((metric, index) => (
              <StatCard key={index} label={metric.label} value={metric.value} icon={metric.icon} description={metric.description} />
            ))}
          </div>

          <Card className="p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Pending Project Activations</h2>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                {pendingCompanies.length} pending
              </span>
            </div>

            {pendingCompanies.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Nothing pending right now.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Project Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Submitted</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCompanies.map((project) => (
                      <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-900 font-medium">{project.name}</td>
                        <td className="py-3 px-4 text-slate-600">{project.location}</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">
                          {new Date(project.added_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            disabled={approvingId === project.id}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            onClick={() => handleApprove(project.id)}
                          >
                            {approvingId === project.id ? 'Approving...' : 'Approve'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Carbon Credit Pricing</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-600">Current Price per Credit</p>
                  <p className="text-2xl font-bold text-slate-900">${pricePerCredit.toFixed(2)}</p>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="New price"
                />
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleUpdatePrice}
                  disabled={savingPrice}
                >
                  {savingPrice ? 'Updating...' : 'Update Pricing'}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">System Overview</h2>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <p>Total Projects</p>
                  <p className="font-medium text-slate-900">{companies.length}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p>Total Transactions</p>
                  <p className="font-medium text-slate-900">{transactions.length}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p>Total Registered Users</p>
                  <p className="font-medium text-slate-900">{users.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

