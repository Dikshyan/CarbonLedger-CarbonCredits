import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatCard from '@/components/StatCard';
import { apiFetch } from '@/lib/api';
import {
  Users, CheckCircle, AlertCircle, TrendingUp, Award,
  UserPlus, Shield, Eye, EyeOff,
} from 'lucide-react';

interface AssignedVerifierInfo {
  id: number;
  username: string;
  role?: string;
}

interface Company {
  id: number;
  name: string;
  location: string;
  status: string;
  active: boolean;
  added_date: string;
  assigned_verifier?: number | AssignedVerifierInfo | null;
  verifier_notes?: string | null;
}

interface BusinessUser {
  id: number;
  username: string;
  email: string;
  role: string;
  active: boolean;
  added_date?: string;
  company?: number | null;
}

interface Transaction {
  transaction_type: string;
  credits: string;
}

// Roles that Admin can create through the admin panel.
// "Admin" is intentionally excluded.
const ADMIN_CREATABLE_ROLES: { label: string; value: string }[] = [
  { label: 'NGO Representative', value: 'NGO Representative' },
  { label: 'Verifier', value: 'Government Official' },
  { label: 'Company Buyer', value: 'Company Buyer' },
];

// Display-friendly label for backend role values
function roleLabel(role: string): string {
  if (role === 'Government Official') return 'Verifier';
  return role;
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
  const [selectedVerifiers, setSelectedVerifiers] = useState<Record<number, number | ''>>({});
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [assignmentError, setAssignmentError] = useState<Record<number, string>>({});
  const [assignmentSuccess, setAssignmentSuccess] = useState<Record<number, string>>({});
  const [projectFilter, setProjectFilter] = useState<'actionable' | 'all'>('actionable');

  // Form state for issuing carbon credits
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [issueAmount, setIssueAmount] = useState<string>('');
  const [issuingCredits, setIssuingCredits] = useState<boolean>(false);
  const [issueSuccess, setIssueSuccess] = useState<string>('');

  // Form state for creating users
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserSuccess, setCreateUserSuccess] = useState('');
  const [createUserError, setCreateUserError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/CarbonLedger/'),
      apiFetch('/admin/users/').catch(() =>
        // Fallback: if admin endpoint not available, use the old one
        apiFetch('/CarbonLedgerUsers/')
      ),
      apiFetch('/CarbonLedgerTransactions/'),
      apiFetch('/pricing/'),
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

  const availableVerifiers = users.filter(
    (u) => u.role === 'Government Official' && u.active !== false
  );

  const actionableCompanies = companies.filter(
    (c) => c.status !== 'Verified' && c.status !== 'Rejected'
  );
  const displayedCompanies = projectFilter === 'actionable' ? actionableCompanies : companies;

  const getAssignedVerifierDisplay = (company: Company): string => {
    if (!company.assigned_verifier) return 'Unassigned';
    if (typeof company.assigned_verifier === 'object') {
      return company.assigned_verifier.username || 'Unassigned';
    }
    const matched = availableVerifiers.find((v) => v.id === company.assigned_verifier);
    if (matched) return matched.username;
    return `Verifier #${company.assigned_verifier}`;
  };

  const renderStatusBadge = (status?: string, active?: boolean) => {
    const currentStatus = status || (active ? 'Verified' : 'Pending');
    switch (currentStatus) {
      case 'Verified':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Verified
          </span>
        );
      case 'Under Review':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Under Review
          </span>
        );
      case 'Correction Required':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            Correction Required
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            Rejected
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            {currentStatus}
          </span>
        );
    }
  };

  const handleAssignVerifier = async (projectId: number, verifierId: number) => {
    if (!verifierId) return;
    setAssigningId(projectId);
    setAssignmentError((prev) => ({ ...prev, [projectId]: '' }));
    setAssignmentSuccess((prev) => ({ ...prev, [projectId]: '' }));

    try {
      const res = await apiFetch(`/admin/projects/${projectId}/assign-verifier/`, {
        method: 'POST',
        body: JSON.stringify({ verifier_id: verifierId }),
      });

      if (res && res.project) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === projectId
              ? {
                  ...c,
                  status: res.project.status,
                  assigned_verifier: res.project.assigned_verifier,
                }
              : c
          )
        );
      }
      setAssignmentSuccess((prev) => ({
        ...prev,
        [projectId]: res?.detail || 'Verifier assigned successfully',
      }));
    } catch (err: any) {
      let errorMsg = 'Failed to assign verifier';
      if (err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('Only administrators')) {
        errorMsg = '403 Forbidden: Only administrators can assign verifiers.';
      } else if (err?.status === 401 || err?.message?.includes('401')) {
        errorMsg = '401 Unauthorized: Session invalid or expired.';
      } else if (err?.status === 400 || err?.message?.includes('400')) {
        errorMsg = err.detail || err.message || '400 Bad Request: Invalid verifier selection.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setAssignmentError((prev) => ({ ...prev, [projectId]: errorMsg }));
    } finally {
      setAssigningId(null);
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
      const res = await apiFetch('/CarbonLedgerTransactions/', {
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
      await apiFetch('/pricing/', {
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSuccess('');

    if (!newUsername || !newEmail || !newPassword || !newRole) {
      setCreateUserError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setCreateUserError('Password must be at least 8 characters.');
      return;
    }
    if (newRole === 'Company Buyer' && !newCompanyId) {
      setCreateUserError('Company Buyers must be assigned to a company.');
      return;
    }

    setCreatingUser(true);
    try {
      const payload: Record<string, any> = {
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
      };
      if (newCompanyId) {
        payload.company = parseInt(newCompanyId, 10);
      }

      const res = await apiFetch('/admin/users/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setCreateUserSuccess(`User "${res.username}" created as ${roleLabel(res.role)}.`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('');
      setNewCompanyId('');
      loadAll();
    } catch (err: any) {
      // Try to extract meaningful validation errors
      let msg = err?.message || 'Failed to create user.';
      try {
        const parsed = JSON.parse(msg.replace(/^.*?:\s*/, ''));
        if (typeof parsed === 'object') {
          msg = Object.entries(parsed)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join('; ');
        }
      } catch {
        // Use original message
      }
      setCreateUserError(msg);
    } finally {
      setCreatingUser(false);
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
            <p className="text-slate-600">Verify projects, issue credits, manage users and pricing</p>
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

          {/* Project Management & Verifier Assignment */}
          <Card className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Project Verification & Assignment</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Assign designated Government Official (Verifier) to restoration projects for audit and review.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setProjectFilter('actionable')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    projectFilter === 'actionable'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Awaiting Review / In Progress ({actionableCompanies.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProjectFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    projectFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Projects ({companies.length})
                </button>
              </div>
            </div>

            {displayedCompanies.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">
                  {projectFilter === 'actionable'
                    ? 'No projects currently awaiting verifier review or assignment.'
                    : 'No projects registered in the system.'}
                </p>
                {projectFilter === 'actionable' && companies.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setProjectFilter('all')}
                    className="mt-3 text-xs"
                  >
                    View All {companies.length} Projects
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                        Project Name
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                        Location
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                        Assigned Verifier
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-900 text-xs uppercase tracking-wider">
                        Assign Verifier
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCompanies.map((project) => {
                      const isUnassigned = !project.assigned_verifier;
                      const verifierName = getAssignedVerifierDisplay(project);
                      const isAssigningThis = assigningId === project.id;
                      const err = assignmentError[project.id];
                      const success = assignmentSuccess[project.id];

                      return (
                        <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <p className="text-slate-900 font-medium text-sm">{project.name}</p>
                            {project.verifier_notes && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1" title={project.verifier_notes}>
                                Note: {project.verifier_notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">{project.location}</td>
                          <td className="py-3 px-4">{renderStatusBadge(project.status, project.active)}</td>
                          <td className="py-3 px-4">
                            {isUnassigned ? (
                              <span className="text-slate-400 italic text-xs font-normal">Unassigned</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded">
                                <Shield className="h-3 w-3 text-teal-600" />
                                {verifierName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            {project.added_date ? new Date(project.added_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center justify-end gap-2">
                                <select
                                  aria-label={`Assign verifier for ${project.name}`}
                                  value={selectedVerifiers[project.id] ?? ''}
                                  onChange={(e) =>
                                    setSelectedVerifiers((prev) => ({
                                      ...prev,
                                      [project.id]: e.target.value ? Number(e.target.value) : '',
                                    }))
                                  }
                                  disabled={isAssigningThis}
                                  className="h-8 text-xs px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 max-w-[160px]"
                                >
                                  <option value="">-- Choose Verifier --</option>
                                  {availableVerifiers.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.username}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  disabled={isAssigningThis || !selectedVerifiers[project.id]}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                                  onClick={() =>
                                    handleAssignVerifier(project.id, Number(selectedVerifiers[project.id]))
                                  }
                                >
                                  {isAssigningThis ? 'Assigning...' : 'Assign'}
                                </Button>
                              </div>

                              {/* Per-row feedback */}
                              {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
                              {success && <p className="text-[11px] text-emerald-600 mt-1">{success}</p>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ═══════════════════════════════════════════
              USER MANAGEMENT
          ═══════════════════════════════════════════ */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              User Management
            </h2>

            {/* Create User Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-indigo-500" />
                Create New User
              </h3>

              {createUserSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mb-4 text-xs text-emerald-700">
                  {createUserSuccess}
                </div>
              )}
              {createUserError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 text-xs text-red-600">
                  {createUserError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Username
                  </label>
                  <Input
                    type="text"
                    placeholder="john_doe"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => { setNewRole(e.target.value); setNewCompanyId(''); }}
                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">— Select Role —</option>
                    {ADMIN_CREATABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {newRole === 'Company Buyer' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Company
                    </label>
                    <select
                      value={newCompanyId}
                      onChange={(e) => setNewCompanyId(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">— Select Company —</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={creatingUser}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {creatingUser ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Users Table */}
            {users.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Username</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Role</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-900 font-medium text-sm">{u.username}</td>
                        <td className="py-3 px-4 text-slate-600 text-sm">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'Admin' ? 'bg-violet-100 text-violet-800' :
                            u.role === 'Government Official' ? 'bg-blue-100 text-blue-800' :
                            u.role === 'NGO Representative' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {u.role === 'Admin' && <Shield className="inline h-3 w-3 mr-1" />}
                            {roleLabel(u.role)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {u.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Issue Credits / Pricing / System Overview */}
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
