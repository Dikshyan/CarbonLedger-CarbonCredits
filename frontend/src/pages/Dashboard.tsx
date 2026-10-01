import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import StatCard from '@/components/StatCard';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import {
  Plus, Leaf, TrendingUp, Award, Activity,
  Users, CheckCircle2, AlertCircle, Coins, BarChart3,
  Clock, XCircle, Shield, FileEdit, AlertTriangle,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import NGOEditResubmitModal, { EditableProject } from '@/components/NGOEditResubmitModal';

interface Company {
  id: number;
  name: string;
  location: string;
  active: boolean;
  status: string;
  type: string;
  about?: string;
  estimated_area_hectares?: string;
  expected_carbon_sequestration?: string;
  created_by?: number | null;
  verifier_notes?: string | null;
  assigned_verifier?: any;
}

interface Transaction {
  id: number;
  project: number;
  credits: string;
  transaction_type: string;
  ipfs_cid: string | null;
  created_at?: string;
}

interface DashboardStats {
  role: string;
  // Admin / Gov
  total_projects?: number;
  pending_projects?: number;
  verified_projects?: number;
  rejected_projects?: number;
  total_users?: number;
  total_transactions?: number;
  total_credits_issued?: number;
  total_credits_cancelled?: number;
  // NGO
  net_credits?: number;
  credits_issued?: number;
  // Buyer
  credits_purchased?: number;
  credits_retired?: number;
  transactions?: number;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [projects, setProjects] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pricePerCredit, setPricePerCredit] = useState<number>(18.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEditProject, setSelectedEditProject] = useState<EditableProject | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ngoSuccessMessage, setNgoSuccessMessage] = useState<string | null>(null);

  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const isGovOfficial = role === 'Government Official';
  const isNGO = role === 'NGO Representative';
  const isBuyer = role === 'Company Buyer';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [projData, txData, pricingData, statsData] = await Promise.all([
          apiFetch('/CarbonLedger/').catch(() => []),
          apiFetch('/CarbonLedgerTransactions/').catch(() => []),
          apiFetch('/pricing/').catch(() => ({ price_per_credit: '18.50' })),
          apiFetch('/dashboard-stats/').catch(() => null),
        ]);

        const projList = Array.isArray(projData)
          ? projData
          : (projData?.results ?? []);
        setProjects(projList);
        setTransactions(Array.isArray(txData) ? txData : []);
        const parsedPrice = parseFloat(pricingData?.price_per_credit);
        setPricePerCredit(!isNaN(parsedPrice) ? parsedPrice : 18.5);
        setStats(statsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Credits for a specific project from the scoped transaction list
  const projectCredits = (companyId: number) =>
    transactions
      .filter((t) => t.project === companyId)
      .reduce((sum, t) => {
        const amt = parseFloat(t.credits);
        if (['Issuance', 'Recieve'].includes(t.transaction_type)) return sum + amt;
        if (['Transfer', 'Cancellation'].includes(t.transaction_type)) return sum - amt;
        return sum;
      }, 0);

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

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-1">Dashboard</h1>
            <p className="text-slate-500 text-sm">
              {isAdmin && 'Platform-wide oversight — all projects, users, and transactions.'}
              {isGovOfficial && 'Verifier portal overview.'}
              {isNGO && 'Track your registered projects and carbon credit status.'}
              {isBuyer && 'Monitor your carbon credit portfolio and transaction activity.'}
              {!isAdmin && !isGovOfficial && !isNGO && !isBuyer && 'Your BlueChain overview.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ══════════════════════════════════════════
              ADMIN / GOVERNMENT — platform stats
          ══════════════════════════════════════════ */}
          {isAdmin && stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  label="Total Projects"
                  value={stats.total_projects ?? 0}
                  icon={<Leaf className="h-6 w-6" />}
                  description="All registered projects"
                />
                <StatCard
                  label="Pending Verification"
                  value={stats.pending_projects ?? 0}
                  icon={<AlertCircle className="h-6 w-6" />}
                  description="Awaiting admin review"
                />
                <StatCard
                  label="Verified Active"
                  value={stats.verified_projects ?? 0}
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  description="Approved projects"
                />
                <StatCard
                  label="Registered Users"
                  value={stats.total_users ?? 0}
                  icon={<Users className="h-6 w-6" />}
                  description="Business profiles"
                />
                <StatCard
                  label="Credits Issued (tCO₂e)"
                  value={(stats.total_credits_issued ?? 0).toLocaleString()}
                  icon={<Coins className="h-6 w-6" />}
                  description="Total platform issuances"
                />
                <StatCard
                  label="Credits Cancelled"
                  value={(stats.total_credits_cancelled ?? 0).toLocaleString()}
                  icon={<XCircle className="h-6 w-6" />}
                  description="Retired from circulation"
                />
                <StatCard
                  label="Total Transactions"
                  value={stats.total_transactions ?? 0}
                  icon={<Activity className="h-6 w-6" />}
                  description="All ledger events"
                />
                <StatCard
                  label="Rejected Projects"
                  value={stats.rejected_projects ?? 0}
                  icon={<XCircle className="h-6 w-6" />}
                  description="Failed verification"
                />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/admin')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-violet-100 p-3 rounded-lg"><Shield className="h-6 w-6 text-violet-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Admin Dashboard</h3>
                      <p className="text-sm text-slate-600">Verify projects & issue credits</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/maps-charts')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-100 p-3 rounded-lg"><Activity className="h-6 w-6 text-teal-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">View Analytics</h3>
                      <p className="text-sm text-slate-600">Maps and charts</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/carbon-history')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg"><Award className="h-6 w-6 text-green-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Credit History</h3>
                      <p className="text-sm text-slate-600">All transactions</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* All Projects Table */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">All Registered Projects</h2>
                </div>
                {projects.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No projects in system yet.</p>
                ) : (
                  <div className="overflow-x-auto responsive-table-wrap">
                    <table className="w-full min-w-[550px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Project</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Location</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Status</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-900 text-sm">Net Credits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project) => (
                          <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-slate-900 font-medium">{project.name}</td>
                            <td className="py-3 px-4 text-slate-600">{project.location}</td>
                            <td className="py-3 px-4">
                              <StatusBadge status={project.status} active={project.active} />
                            </td>
                            <td className="py-3 px-4 text-right text-slate-900 font-medium">
                              {projectCredits(project.id).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

          {/* ══════════════════════════════════════════
              GOVERNMENT OFFICIAL / VERIFIER
          ══════════════════════════════════════════ */}
          {isGovOfficial && (
            <Card className="p-8 text-center border-slate-200 bg-white mb-8 shadow-xs">
              <Shield className="h-10 w-10 text-teal-600 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Verifier Portal</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-4">
                Access your designated verification queue to review project metrics, audit compliance, and submit verification decisions.
              </p>
              <Button
                onClick={() => setLocation('/verifier')}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5"
              >
                Open Verifier Queue
              </Button>
            </Card>
          )}

          {/* ══════════════════════════════════════════
              NGO REPRESENTATIVE — own projects
          ══════════════════════════════════════════ */}
          {isNGO && stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  label="My Projects"
                  value={stats.total_projects ?? 0}
                  icon={<Leaf className="h-6 w-6" />}
                  description="Projects you registered"
                />
                <StatCard
                  label="Credits Issued"
                  value={(stats.credits_issued ?? 0).toLocaleString()}
                  icon={<Coins className="h-6 w-6" />}
                  description="Across your projects"
                />
                <StatCard
                  label="Net Credits"
                  value={(stats.net_credits ?? 0).toLocaleString()}
                  icon={<TrendingUp className="h-6 w-6" />}
                  description="After transfers"
                />
                <StatCard
                  label="Pending Review"
                  value={stats.pending_projects ?? 0}
                  icon={<Clock className="h-6 w-6" />}
                  description="Awaiting verification"
                />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/projects')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg"><Plus className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Register Project</h3>
                      <p className="text-sm text-slate-600">Add a restoration project</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/maps-charts')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-100 p-3 rounded-lg"><Activity className="h-6 w-6 text-teal-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">View Analytics</h3>
                      <p className="text-sm text-slate-600">Maps and charts</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/carbon-history')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg"><Award className="h-6 w-6 text-green-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Credit History</h3>
                      <p className="text-sm text-slate-600">Your project transactions</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Feedback Alert for NGO */}
              {ngoSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-6 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{ngoSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNgoSuccessMessage(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* My Projects Table */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">My Projects</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track the verification lifecycle and audit feedback for your registered blue carbon projects.
                    </p>
                  </div>
                  <Button onClick={() => setLocation('/projects')} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                    <Plus className="h-4 w-4 mr-1.5" /> New Project
                  </Button>
                </div>

                {projects.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    You haven't registered any projects yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto responsive-table-wrap">
                    <table className="w-full min-w-[650px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">Project</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">Location</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">Status</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">Net Credits</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project) => {
                          const isCorrectionRequired = project.status === 'Correction Required';

                          return (
                            <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="space-y-1.5">
                                  <span className="font-semibold text-slate-900 text-sm block">
                                    {project.name}
                                  </span>

                                  {/* Verifier Feedback Display */}
                                  {project.verifier_notes && (
                                    <div className="p-2.5 rounded-lg border text-xs bg-purple-50/80 border-purple-200 text-purple-900 max-w-md">
                                      <p className="font-semibold text-purple-800 flex items-center gap-1.5 mb-0.5">
                                        <AlertTriangle className="h-3.5 w-3.5 text-purple-600" />
                                        Verifier Feedback:
                                      </p>
                                      <p className="whitespace-pre-wrap">{project.verifier_notes}</p>
                                    </div>
                                  )}

                                  {/* Correction Required Explanatory Notice */}
                                  {isCorrectionRequired && (
                                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 max-w-md">
                                      ⚠️ The verifier requested changes. Please review the feedback above, update project metadata, and resubmit for review.
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-slate-600 text-xs">
                                {project.location}
                              </td>

                              <td className="py-3 px-4">
                                <StatusBadge status={project.status} active={project.active} />
                              </td>

                              <td className="py-3 px-4 text-right text-slate-900 font-medium text-sm">
                                {projectCredits(project.id).toLocaleString()}
                              </td>

                              <td className="py-3 px-4 text-right">
                                {isCorrectionRequired ? (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEditProject(project);
                                      setIsEditModalOpen(true);
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                                  >
                                    <FileEdit className="h-3.5 w-3.5" />
                                    Edit & Resubmit
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400 italic">
                                    {project.status === 'Verified'
                                      ? 'Verified'
                                      : project.status === 'Under Review'
                                      ? 'In review'
                                      : project.status === 'Rejected'
                                      ? 'Rejected'
                                      : 'Submitted'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Edit & Resubmit Modal for NGO */}
              <NGOEditResubmitModal
                project={selectedEditProject}
                isOpen={isEditModalOpen}
                onClose={() => {
                  setIsEditModalOpen(false);
                  setSelectedEditProject(null);
                }}
                onSuccess={(updatedProject, msg) => {
                  setProjects((prev) =>
                    prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
                  );
                  setNgoSuccessMessage(msg);
                }}
              />
            </>
          )}

          {/* ══════════════════════════════════════════
              COMPANY BUYER — credit portfolio
          ══════════════════════════════════════════ */}
          {isBuyer && stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  label="Credits Purchased"
                  value={(stats.credits_purchased ?? 0).toLocaleString()}
                  icon={<Coins className="h-6 w-6" />}
                  description="Total credits acquired"
                />
                <StatCard
                  label="Credits Retired"
                  value={(stats.credits_retired ?? 0).toLocaleString()}
                  icon={<XCircle className="h-6 w-6" />}
                  description="Used / cancelled"
                />
                <StatCard
                  label="Net Balance"
                  value={(stats.net_credits ?? 0).toLocaleString()}
                  icon={<TrendingUp className="h-6 w-6" />}
                  description={`At $${pricePerCredit.toFixed(2)}/credit`}
                />
                <StatCard
                  label="Transactions"
                  value={stats.transactions ?? 0}
                  icon={<Activity className="h-6 w-6" />}
                  description="Total ledger events"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/marketplace')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-3 rounded-lg"><BarChart3 className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Browse Marketplace</h3>
                      <p className="text-sm text-slate-600">Buy carbon credits</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/carbon-history')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-lg"><Award className="h-6 w-6 text-green-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Transaction History</h3>
                      <p className="text-sm text-slate-600">View certificates</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation('/maps-charts')}>
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-100 p-3 rounded-lg"><Activity className="h-6 w-6 text-teal-600" /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Analytics</h3>
                      <p className="text-sm text-slate-600">Maps and charts</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recent Transactions */}
              <Card className="p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6">My Recent Transactions</h2>
                {transactions.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center">No transactions yet. Head to the marketplace to buy credits.</p>
                ) : (
                  <div className="overflow-x-auto responsive-table-wrap">
                    <table className="w-full min-w-[450px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">Credits</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-900 text-sm">IPFS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 10).map((tx) => (
                          <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                tx.transaction_type === 'Issuance' ? 'bg-emerald-100 text-emerald-700' :
                                tx.transaction_type === 'Recieve' ? 'bg-blue-100 text-blue-700' :
                                tx.transaction_type === 'Transfer' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-900 font-medium">
                              {parseFloat(tx.credits).toLocaleString()} tCO₂e
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-xs font-mono">
                              {tx.ipfs_cid ? `${tx.ipfs_cid.slice(0, 14)}…` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
