import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { Plus, Leaf, TrendingUp, Award, Activity } from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  active: boolean;
  status: string;
}

interface Transaction {
  id: number;
  project: number;
  credits: string;
  transaction_type: string;
  ipfs_cid: string | null;
}

const ADDS = ["Issuance", "Recieve"];
const SUBTRACTS = ["Transfer", "Cancellation", "Cancellatiobn"];

function availableCredits(transactions: Transaction[], companyId: number) {
  return transactions
    .filter((t) => t.project === companyId)
    .reduce((sum, t) => {
      const amt = parseFloat(t.credits);
      if (ADDS.includes(t.transaction_type)) return sum + amt;
      if (SUBTRACTS.includes(t.transaction_type)) return sum - amt;
      return sum;
    }, 0);
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricePerCredit, setPricePerCredit] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);

        const [projectResponse, txData, pricingData] = await Promise.all([
          apiFetch('/api/v1/CarbonLedger/'),
          apiFetch('/api/v1/CarbonLedgerTransactions/'),
          apiFetch('/api/v1/pricing/'),
        ]);

        const projectList = Array.isArray(projectResponse)
          ? projectResponse
          : (projectResponse?.results && Array.isArray(projectResponse.results))
            ? projectResponse.results
            : [];

        // A Company Buyer only sees their own company; other roles see everything.
        const scoped =
          user?.role === 'Company Buyer' && user.company
            ? projectList.filter((c: Company) => c.id === user.company)
            : projectList;

        setProjects(scoped);
        setTransactions(txData);
        setPricePerCredit(parseFloat(pricingData.price_per_credit));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user]);

  const totalCredits = projects.reduce(
    (sum: number, project: Company) => sum + availableCredits(transactions, project.id),
    0
  );
  const verifiedCredits = transactions.filter((t) => t.ipfs_cid).length
    ? transactions
        .filter((t) => t.ipfs_cid && projects.some((project: Company) => project.id === t.project))
        .reduce((sum: number, t: Transaction) => sum + parseFloat(t.credits), 0)
    : 0;

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600">
              Monitor your blue carbon projects and track your environmental impact
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              label="Total Projects"
              value={projects.length}
              icon={<Activity className="h-6 w-6" />}
              description="Visible to your role"
            />
            <StatCard
              label="Carbon Credits"
              value={totalCredits.toLocaleString()}
              icon={<Leaf className="h-6 w-6" />}
              description="Net available balance"
            />
            <StatCard
              label="Pinned to IPFS"
              value={verifiedCredits.toLocaleString()}
              icon={<Award className="h-6 w-6" />}
              description="Credits with an on-chain record"
            />
            <StatCard
              label="Potential Revenue"
              value={`$${(totalCredits * pricePerCredit).toLocaleString()}`}
              icon={<TrendingUp className="h-6 w-6" />}
              description={`At $${pricePerCredit}/credit`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation('/projects')}
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Register Project</h3>
                  <p className="text-sm text-slate-600">Add a new restoration project</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation('/maps-charts')}
            >
              <div className="flex items-center gap-4">
                <div className="bg-teal-100 p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">View Analytics</h3>
                  <p className="text-sm text-slate-600">See maps and charts</p>
                </div>
              </div>
            </Card>
            <Card
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setLocation('/carbon-history')}
            >
              <div className="flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Credit History</h3>
                  <p className="text-sm text-slate-600">Track transactions</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Your Projects</h2>
              <Button
                onClick={() => setLocation('/projects')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>

            {projects.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No projects to show yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Project Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900">Status</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900">Credits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-900 font-medium">{project.name}</td>
                        <td className="py-3 px-4 text-slate-600">{project.location}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              project.status === 'Verified'
                                ? 'bg-green-100 text-green-700'
                                : project.status === 'Rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {project.status || (project.active ? 'Active' : 'Pending')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-900 font-medium">
                          {availableCredits(transactions, project.id).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
