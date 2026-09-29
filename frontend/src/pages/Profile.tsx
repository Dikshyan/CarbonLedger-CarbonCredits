import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { useLocation } from 'wouter';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  User as UserIcon,
  Mail,
  Shield,
  Building2,
  Wallet,
  Coins,
  Leaf,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  BarChart3,
  Users,
  Activity,
  AlertTriangle,
  FileEdit,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import NGOEditResubmitModal, { EditableProject } from '@/components/NGOEditResubmitModal';

interface Company {
  id: number;
  name: string;
  location: string;
  type: string;
  about?: string;
  status?: string;
  wallet_address?: string;
  estimated_area_hectares?: string;
  expected_carbon_sequestration?: string;
  created_by?: number | null;
  verifier_notes?: string | null;
  assigned_verifier?: any;
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

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Scoped projects (already filtered by backend for the user's role)
  const [myProjects, setMyProjects] = useState<Company[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedEditProject, setSelectedEditProject] = useState<EditableProject | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [ngoSuccessMessage, setNgoSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadProfileData();
    checkWallet();
  }, [user]);

  const loadProfileData = async () => {
    if (!user) return;
    setLoadingError(null);
    try {
      const [projData, statsData] = await Promise.all([
        apiFetch('/CarbonLedger/').catch(() => []),
        apiFetch('/dashboard-stats/').catch(() => null),
      ]);

      setMyProjects(Array.isArray(projData) ? projData : []);
      setStats(statsData);
    } catch (err: any) {
      setLoadingError(err?.message || 'Failed to load profile data.');
    }
  };

  const checkWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) setWalletAddress(accounts[0]);
      } catch {
        // wallet not connected
      }
    }
  };

  const role = user?.role || '';
  const isAdmin = role === 'Admin';
  const isGovOfficial = role === 'Government Official';
  const isNGO = role === 'NGO Representative';
  const isBuyer = role === 'Company Buyer';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">

          {/* ── Profile Header ── */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-8 text-white mb-8 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-full bg-blue-500/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold">
                  {user?.username ? user.username[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{user?.username || 'Authenticated User'}</h1>
                  <p className="text-blue-200 text-sm flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{user?.email || '—'}</span>
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-blue-400/20 border border-blue-300/30 rounded-full text-xs font-medium text-blue-100">
                    {role || 'Member'}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2">
                {isNGO && (
                  <Button
                    onClick={() => setLocation('/projects')}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    Register Project
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    onClick={() => setLocation('/admin')}
                    className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Dashboard
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={logout}
                  className="bg-transparent border-white/30 text-white hover:bg-white/10 text-xs font-medium"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {loadingError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {loadingError}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              ADMIN / GOVERNMENT OFFICIAL — Platform Stats
          ══════════════════════════════════════════════ */}
          {isAdmin && stats && (
            <>
              <div className="mb-2">
                <h2 className="text-lg font-bold text-slate-900">Platform Overview</h2>
                <p className="text-xs text-slate-500 mt-0.5">Global statistics across all projects and users.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Projects', value: stats.total_projects ?? 0, icon: <Leaf className="h-5 w-5" />, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Pending Review', value: stats.pending_projects ?? 0, icon: <Clock className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Verified Active', value: stats.verified_projects ?? 0, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Registered Users', value: stats.total_users ?? 0, icon: <Users className="h-5 w-5" />, color: 'text-violet-600 bg-violet-50' },
                  { label: 'Credits Issued', value: (stats.total_credits_issued ?? 0).toLocaleString(), icon: <Coins className="h-5 w-5" />, color: 'text-teal-600 bg-teal-50' },
                  { label: 'Credits Cancelled', value: (stats.total_credits_cancelled ?? 0).toLocaleString(), icon: <XCircle className="h-5 w-5" />, color: 'text-red-600 bg-red-50' },
                  { label: 'Total Transactions', value: stats.total_transactions ?? 0, icon: <Activity className="h-5 w-5" />, color: 'text-slate-600 bg-slate-100' },
                  { label: 'Rejected Projects', value: stats.rejected_projects ?? 0, icon: <XCircle className="h-5 w-5" />, color: 'text-rose-600 bg-rose-50' },
                ].map((m) => (
                  <Card key={m.label} className="p-4 border-slate-200 bg-white shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${m.color}`}>{m.icon}</div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider leading-tight">{m.label}</p>
                        <p className="text-xl font-bold text-slate-900">{m.value}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Project Oversight Table */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">All Registered Projects</h2>
                  <Button variant="ghost" size="sm" onClick={() => setLocation('/dashboard')} className="text-blue-600 text-xs font-medium gap-1">
                    <span>Full Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Card className="border-slate-200 bg-white overflow-hidden">
                  {myProjects.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No projects in system yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Project</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Location</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Type</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myProjects.map((proj) => (
                            <tr key={proj.id} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-3 px-4 font-medium text-slate-900">{proj.name}</td>
                              <td className="py-3 px-4 text-slate-500">📍 {proj.location}</td>
                              <td className="py-3 px-4 text-slate-500">{proj.type}</td>
                              <td className="py-3 px-4"><StatusBadge status={proj.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════════
              NGO REPRESENTATIVE — My Projects + Credits
          ══════════════════════════════════════════════ */}
          {isNGO && stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Card className="p-5 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Leaf className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">My Projects</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_projects ?? 0}</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Coins className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Credits Issued</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{(stats.credits_issued ?? 0).toLocaleString()} tCO₂e</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Wallet className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Net Credits</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{(stats.net_credits ?? 0).toLocaleString()} tCO₂e</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Project Status Breakdown */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                {[
                  { label: 'Pending', value: stats.pending_projects ?? 0, color: 'bg-amber-100 text-amber-800' },
                  { label: 'Verified', value: stats.verified_projects ?? 0, color: 'bg-emerald-100 text-emerald-800' },
                  { label: 'Rejected', value: stats.rejected_projects ?? 0, color: 'bg-red-100 text-red-800' },
                ].map((b) => (
                  <span key={b.label} className={`px-3 py-1 rounded-full text-xs font-semibold ${b.color}`}>
                    {b.label}: {b.value}
                  </span>
                ))}
              </div>

              {/* NGO Resubmit Success Notification */}
              {ngoSuccessMessage && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-sm shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{ngoSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setNgoSuccessMessage(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">My Registered Projects</h2>
                  <Button
                    onClick={() => setLocation('/projects')}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Register New
                  </Button>
                </div>

                {myProjects.length === 0 ? (
                  <Card className="p-8 text-center border-slate-200 bg-white">
                    <Leaf className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 font-medium">You haven't registered any projects yet.</p>
                    <Button
                      size="sm"
                      onClick={() => setLocation('/projects')}
                      className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                    >
                      Register First Project
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myProjects.map((proj) => {
                      const isCorrection = proj.status === 'Correction Required';
                      const hasNotes = Boolean(proj.verifier_notes && proj.verifier_notes.trim());

                      return (
                        <Card key={proj.id} className="p-5 border-slate-200 bg-white hover:border-blue-300 transition-colors flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                {proj.type}
                              </span>
                              <StatusBadge status={proj.status} />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base mb-1">{proj.name}</h3>
                            <p className="text-xs text-slate-500 mb-3">📍 {proj.location}</p>

                            {/* Verifier Feedback Box */}
                            {hasNotes && (
                              <div
                                id={`verifier-feedback-profile-${proj.id}`}
                                className={`mb-3 p-2.5 rounded-lg border text-xs ${
                                  isCorrection
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : proj.status === 'Rejected'
                                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="font-bold mb-1 flex items-center gap-1.5">
                                  <span>Verifier Feedback</span>
                                  {isCorrection && (
                                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 bg-amber-200 text-amber-800 rounded">
                                      Action Needed
                                    </span>
                                  )}
                                </div>
                                <p className="whitespace-pre-wrap leading-relaxed">{proj.verifier_notes}</p>
                              </div>
                            )}

                            {/* Correction Required Action Notice */}
                            {isCorrection && (
                              <div className="mb-3 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
                                <p className="font-semibold mb-1">Corrections Requested</p>
                                <p className="text-blue-700 leading-relaxed mb-2.5">
                                  Please address the verifier's feedback above by updating your project details and resubmitting for review.
                                </p>
                                <Button
                                  id={`edit-resubmit-btn-profile-${proj.id}`}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEditProject(proj);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-1.5 h-auto flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                  <FileEdit className="h-3.5 w-3.5" />
                                  Edit & Resubmit
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs py-2 border-t border-slate-100 text-slate-600 mt-2">
                            <span>Area: {proj.estimated_area_hectares || '—'} ha</span>
                            <span className="font-semibold text-blue-600">
                              {proj.expected_carbon_sequestration
                                ? parseFloat(proj.expected_carbon_sequestration).toLocaleString()
                                : '—'}{' '}
                              tCO₂e potential
                            </span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* NGO Edit & Resubmit Modal */}
              <NGOEditResubmitModal
                isOpen={isEditModalOpen}
                project={selectedEditProject}
                onClose={() => {
                  setIsEditModalOpen(false);
                  setSelectedEditProject(null);
                }}
                onSuccess={(updatedProject) => {
                  setMyProjects((prev) =>
                    prev.map((p) => (p.id === updatedProject.id ? { ...p, ...updatedProject } : p))
                  );
                  setNgoSuccessMessage(
                    `Project "${updatedProject.name}" resubmitted successfully! It is now Under Review.`
                  );
                  setTimeout(() => setNgoSuccessMessage(null), 6000);
                }}
              />
            </>
          )}

          {/* ══════════════════════════════════════════════
              COMPANY BUYER — Credit balance + wallet
          ══════════════════════════════════════════════ */}
          {isBuyer && stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="p-5 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Coins className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Credits Purchased</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{(stats.credits_purchased ?? 0).toLocaleString()} tCO₂e</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><XCircle className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Credits Retired</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{(stats.credits_retired ?? 0).toLocaleString()} tCO₂e</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Net Balance</p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">{(stats.net_credits ?? 0).toLocaleString()} tCO₂e</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-5 border-slate-200 bg-white shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Wallet className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Web3 Wallet</p>
                      <p className="text-xs font-mono font-bold text-slate-800 mt-1 truncate max-w-[140px]">
                        {walletAddress || 'Not Connected'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* No company linked notice */}
              {!user?.company && (
                <Card className="p-6 text-center border-dashed border-slate-300 bg-white mb-8">
                  <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Your account is not linked to a company yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Contact an administrator to link your account to a buyer company.</p>
                </Card>
              )}

              <div className="flex gap-3">
                <Button onClick={() => setLocation('/marketplace')} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold gap-2">
                  <BarChart3 className="h-4 w-4" /> Browse Marketplace
                </Button>
                <Button variant="outline" onClick={() => setLocation('/carbon-history')} className="text-sm font-medium gap-2">
                  <Activity className="h-4 w-4" /> View Transaction History
                </Button>
              </div>
            </>
          )}

          {/* ── Wallet strip (NGO + Buyer) ── */}
          {(isNGO || isBuyer) && (
            <div className="mt-8">
              <Card className="p-5 border-slate-200 bg-white shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Wallet className="h-6 w-6" /></div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Web3 Wallet</p>
                    <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">
                      {walletAddress || 'Not Connected — open Marketplace to connect MetaMask'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
