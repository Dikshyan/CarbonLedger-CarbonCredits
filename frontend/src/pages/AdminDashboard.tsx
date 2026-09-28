import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatCard from '@/components/StatCard';
import { apiFetch } from '@/lib/api';
import { Users, CheckCircle, AlertCircle, TrendingUp, Award } from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  status: string;
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

  // Form state for issuing carbon credits
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [issueAmount, setIssueAmount] = useState<string>('');
  const [issuingCredits, setIssuingCredits] = useState<boolean>(false);
  const [issueSuccess, setIssueSuccess] = useState<string>('');

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/v1/CarbonLedger/'),
      apiFetch('/api/v1/CarbonLedgerUsers/'),
      apiFetch('/api/v1/CarbonLedgerTransactions/'),
      apiFetch('/api/v1/pricing/'),
    ])
      .then(([companyData, userData, txData, pricingData]) => {
        const companies = Array.isArray(companyData)
          ? companyData
          : (companyData?.results ?? []);
        const users = Array.isArray(userData)
          ? userData
          : (userData?.results ?? []);
        const txs = Array.isArray(txData)
          ? txData
          : (txData?.results ?? []);
        setCompanies(companies);
        setUsers(users);
        setTransactions(txs);
        setPricePerCredit(parseFloat(pricingData?.price_per_credit ?? '18.50'));
        setNewPrice(pricingData?.price_per_credit ?? '18.50');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const pendingCompanies = companies.filter(
    (c) => c.status === 'Pending' || (!c.active && c.status !== 'Verified')
  );
  const verifiedCompanies = companies.filter(
    (c) => c.status === 'Verified' || c.active
  );
  const totalCreditsIssued = transactions
    .filter((t) => t.transaction_type === 'Issuance')
    .reduce((sum, t) => sum + parseFloat(t.credits), 0);

  const handleApprove = async (id: number) => {
    setApprovingId(id);
    setError('');
    try {
      await apiFetch(`/api/v1/CarbonLedger/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Verified', active: true }),
      });
      loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to verify project');
    } finally {
      setApprovingId(null);
    }
  };

  const handleIssueCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !issueAmount || parseFloat(issueAmount) <= 0) {
      setError('Please select a project and enter a valid positive credit amount.');
      return;
    }
    setIssuingCredits(true);
    setError('');
    setIssueSuccess('');
    try {
      const res = await apiFetch('/api/v1/CarbonLedgerTransactions/', {
        method: 'POST',
        body: JSON.stringify({
          project: Number(selectedProjectId),
          credits: issueAmount,
          transaction_type: 'Issuance',
        }),
      });
      setIssueSuccess(`Successfully issued ${issueAmount} carbon credits! (Transaction #${res.id || 'Created'})`);
      setIssueAmount('');
      loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to issue credits.');
    } finally {
      setIssuingCredits(false);
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
    { label: 'Pending Review', value: pendingCompanies.length, icon: <AlertCircle className="h-6 w-6" />, description: 'Awaiting verification' },
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
            <p className="text-slate-600">Verify projects, issue credits, manage pricing, and monitor system metrics</p>
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
              <h2 className="text-xl font-bold text-slate-900">Pending Project Verification</h2>
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                {pendingCompanies.length} pending
              </span>
            </div>

            {pendingCompanies.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No pending projects awaiting verification.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Project Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Submitted</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCompanies.map((project) => (
                      <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-900 font-medium">{project.name}</td>
                        <td className="py-3 px-4 text-slate-600">{project.location}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            {project.status || 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-sm">
                          {project.added_date ? new Date(project.added_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            disabled={approvingId === project.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                            onClick={() => handleApprove(project.id)}
                          >
                            {approvingId === project.id ? 'Verifying...' : 'Verify Project'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                Issue Carbon Credits
              </h2>
              {issueSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mb-4 text-xs text-emerald-700">
                  {issueSuccess}
                </div>
              )}
              <form onSubmit={handleIssueCredits} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Project
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  >
                    <option value="">-- Select Project --</option>
                    {companies.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.status || (proj.active ? 'Verified' : 'Pending')})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Credits Amount (tCO₂e)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 5000"
                    value={issueAmount}
                    onChange={(e) => setIssueAmount(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  disabled={issuingCredits}
                >
                  {issuingCredits ? 'Issuing Credits...' : 'Issue Credits'}
                </Button>
              </form>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Carbon Credit Pricing
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-600 text-sm">Current Price per Credit</p>
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={handleUpdatePrice}
                  disabled={savingPrice}
                >
                  {savingPrice ? 'Updating...' : 'Update Pricing'}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                System Overview
              </h2>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <p>Total Projects</p>
                  <p className="font-medium text-slate-900">{companies.length}</p>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <p>Verified Projects</p>
                  <p className="font-medium text-slate-900">{verifiedCompanies.length}</p>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <p>Total Transactions</p>
                  <p className="font-medium text-slate-900">{transactions.length}</p>
                </div>
                <div className="flex items-center justify-between py-1">
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
