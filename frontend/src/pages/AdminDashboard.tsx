import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatCard from '@/components/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import {
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Award,
  ShieldCheck,
  XCircle,
  FileText,
  ExternalLink,
  Filter,
  Search,
  Compass,
  Briefcase,
  Clock,
  Send,
  Calendar,
  Sparkles,
  UserCheck,
  Building2,
  X,
  CheckCircle2,
  MapPin,
  Activity,
  FileCheck,
  ChevronRight,
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  location: string;
  type: string;
  about: string;
  status: 'Pending' | 'Verified' | 'Rejected' | string;
  active: boolean;
  added_date: string;
  wallet_address?: string;
  latitude?: number;
  longitude?: number;
  estimated_area_hectares?: number;
  expected_carbon_sequestration?: number;
  registration_number?: string;
  contact_email?: string;
  contact_phone?: string;
  credential_document?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by_username?: string;
  project_scope?: string;
  objectives?: string;
  estimated_budget?: string;
  target_demographics?: string;
}

interface BusinessUser {
  id: number;
  username: string;
  email: string;
  role: string;
  region?: string;
  domain_expertise?: string;
  active_task_count?: number;
  active: boolean;
}

interface VerificationTask {
  id: number;
  project: number;
  project_name: string;
  project_location: string;
  project_type: string;
  project_area?: string;
  project_carbon?: string;
  project_status?: string;
  verifier: number;
  verifier_name: string;
  verifier_email?: string;
  verifier_region?: string;
  verifier_expertise?: string;
  assigned_by?: number;
  assigned_by_name?: string;
  assigned_date: string;
  due_date?: string;
  priority: 'Normal' | 'High' | 'Urgent';
  status: 'Assigned' | 'In Progress' | 'Completed' | 'Needs Revision';
  notes?: string;
  field_report?: string;
  evidence_document?: string;
  completed_at?: string;
}

interface VerifierRecommendation {
  verifier_id: number;
  verifier_name: string;
  email: string;
  region: string;
  domain_expertise: string;
  active_tasks: number;
  score: number;
  reasons: string[];
}

interface Transaction {
  transaction_type: string;
  credits: string;
}

type TabType = 'organizations' | 'verifier_distribution' | 'issuance_pricing';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(
    user?.role === 'Government Official' ? 'verifier_distribution' : 'organizations'
  );

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<BusinessUser[]>([]);
  const [verificationTasks, setVerificationTasks] = useState<VerificationTask[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pricePerCredit, setPricePerCredit] = useState(0);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Organization filter & modal state
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Verified' | 'Rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingCompany, setInspectingCompany] = useState<Company | null>(null);
  const [rejectionModalId, setRejectionModalId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);

  // Verifier Task Distribution State
  const [selectedProjectForAssignment, setSelectedProjectForAssignment] = useState<number | ''>('');
  const [recommendations, setRecommendations] = useState<VerifierRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [selectedVerifierId, setSelectedVerifierId] = useState<number | ''>('');
  const [assignmentPriority, setAssignmentPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [assignmentDueDate, setAssignmentDueDate] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [dispatchingAssignment, setDispatchingAssignment] = useState(false);
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [inspectingTask, setInspectingTask] = useState<VerificationTask | null>(null);

  // Issue Credits & Price state
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [issueAmount, setIssueAmount] = useState<string>('');
  const [issuingCredits, setIssuingCredits] = useState<boolean>(false);
  const [savingPrice, setSavingPrice] = useState(false);

  const loadAll = () => {
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch('/api/v1/CarbonLedger/'),
      apiFetch('/api/v1/CarbonLedgerUsers/'),
      apiFetch('/api/v1/CarbonLedgerTransactions/'),
      apiFetch('/api/v1/VerificationAssignments/').catch(() => []),
      apiFetch('/api/v1/pricing/'),
    ])
      .then(([companyData, userData, txData, tasksData, pricingData]) => {
        const comps = Array.isArray(companyData) ? companyData : companyData?.results ?? [];
        const usrs = Array.isArray(userData) ? userData : userData?.results ?? [];
        const txs = Array.isArray(txData) ? txData : txData?.results ?? [];
        const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.results ?? [];

        setCompanies(comps);
        setUsers(usrs);
        setTransactions(txs);
        setVerificationTasks(tasks);
        setPricePerCredit(parseFloat(pricingData?.price_per_credit ?? '18.50'));
        setNewPrice(pricingData?.price_per_credit ?? '18.50');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  // When project selected for verifier assignment, fetch smart recommendations
  useEffect(() => {
    if (!selectedProjectForAssignment) {
      setRecommendations([]);
      return;
    }
    setLoadingRecommendations(true);
    apiFetch(`/api/v1/VerificationAssignments/recommendations/?project_id=${selectedProjectForAssignment}`)
      .then((recs) => {
        setRecommendations(Array.isArray(recs) ? recs : []);
        if (recs && recs.length > 0) {
          setSelectedVerifierId(recs[0].verifier_id);
        }
      })
      .catch((err) => console.error('Failed to load recommendations', err))
      .finally(() => setLoadingRecommendations(false));
  }, [selectedProjectForAssignment]);

  const pendingCompanies = companies.filter((c) => c.status === 'Pending' || (!c.active && c.status !== 'Verified'));
  const verifiedCompanies = companies.filter((c) => c.status === 'Verified' || c.active);
  const rejectedCompanies = companies.filter((c) => c.status === 'Rejected');
  const verifiers = users.filter((u) => u.role === 'Verifier');
  const activeTasks = verificationTasks.filter((t) => t.status === 'Assigned' || t.status === 'In Progress');
  const totalCreditsIssued = transactions
    .filter((t) => t.transaction_type === 'Issuance')
    .reduce((sum, t) => sum + parseFloat(t.credits), 0);

  // Filter organizations
  const filteredCompanies = companies.filter((c) => {
    if (statusFilter !== 'all' && (c.status || 'Pending') !== statusFilter) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchLoc = c.location?.toLowerCase().includes(q);
      const matchReg = c.registration_number?.toLowerCase().includes(q);
      const matchEmail = c.contact_email?.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchReg && !matchEmail) return false;
    }
    return true;
  });

  // Action: Approve / Verify Organization
  const handleVerify = async (id: number) => {
    setActionInProgressId(id);
    setError('');
    setSuccessMsg('');
    try {
      await apiFetch(`/api/v1/CarbonLedger/${id}/verify/`, {
        method: 'POST',
      });
      setSuccessMsg('Organization successfully verified! Automated notification email sent to applicant.');
      if (inspectingCompany?.id === id) {
        setInspectingCompany(null);
      }
      loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to verify organization.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Action: Reject Organization
  const handleReject = async (id: number) => {
    setActionInProgressId(id);
    setError('');
    setSuccessMsg('');
    try {
      await apiFetch(`/api/v1/CarbonLedger/${id}/reject/`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason || 'Submitted credentials could not be verified by registry administrators.' }),
      });
      setSuccessMsg('Organization registration rejected. Automated status update email sent to applicant.');
      setRejectionModalId(null);
      setRejectionReason('');
      if (inspectingCompany?.id === id) {
        setInspectingCompany(null);
      }
      loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to reject organization.');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Action: Dispatch Verifier Assignment
  const handleDispatchAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForAssignment || !selectedVerifierId) {
      setError('Please select both a project and a designated field verifier.');
      return;
    }
    setDispatchingAssignment(true);
    setError('');
    setSuccessMsg('');
    try {
      await apiFetch('/api/v1/VerificationAssignments/', {
        method: 'POST',
        body: JSON.stringify({
          project: Number(selectedProjectForAssignment),
          verifier: Number(selectedVerifierId),
          priority: assignmentPriority,
          due_date: assignmentDueDate || null,
          notes: assignmentNotes,
          status: 'Assigned',
        }),
      });
      setSuccessMsg('Verification task assigned successfully! Notification dispatched to the designated field verifier.');
      setSelectedProjectForAssignment('');
      setSelectedVerifierId('');
      setAssignmentNotes('');
      setAssignmentDueDate('');
      loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification task.');
    } finally {
      setDispatchingAssignment(false);
    }
  };

  // Action: Update Task Status
  const handleUpdateTaskStatus = async (taskId: number, newStatus: string) => {
    setError('');
    setSuccessMsg('');
    try {
      await apiFetch(`/api/v1/VerificationAssignments/${taskId}/submit_report/`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccessMsg(`Task status updated to "${newStatus}".`);
      if (inspectingTask?.id === taskId) {
        setInspectingTask(null);
      }
      loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to update task status.');
    }
  };

  // Action: Issue Carbon Credits
  const handleIssueCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !issueAmount || parseFloat(issueAmount) <= 0) {
      setError('Please select a project and enter a valid positive credit amount.');
      return;
    }
    setIssuingCredits(true);
    setError('');
    try {
      const res = await apiFetch('/api/v1/CarbonLedgerTransactions/', {
        method: 'POST',
        body: JSON.stringify({
          project: Number(selectedProjectId),
          credits: issueAmount,
          transaction_type: 'Issuance',
        }),
      });
      setSuccessMsg(`Successfully issued ${issueAmount} carbon credits! (Transaction #${res.id || 'Recorded'})`);
      setIssueAmount('');
      loadAll();
    } catch (err: any) {
      setError(err.message || 'Failed to issue credits.');
    } finally {
      setIssuingCredits(false);
    }
  };

  // Action: Update Price
  const handleUpdatePrice = async () => {
    setSavingPrice(true);
    setError('');
    try {
      await apiFetch('/api/v1/pricing/', {
        method: 'PATCH',
        body: JSON.stringify({ price_per_credit: newPrice }),
      });
      setPricePerCredit(parseFloat(newPrice));
      setSuccessMsg('Carbon credit price updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Only admins can update pricing.');
    } finally {
      setSavingPrice(false);
    }
  };

  const systemMetrics = [
    {
      label: 'Pending Onboarding',
      value: pendingCompanies.length,
      icon: <Clock className="h-6 w-6 text-amber-600" />,
      description: 'NGOs & companies awaiting verification',
    },
    {
      label: 'Verified Entities',
      value: verifiedCompanies.length,
      icon: <ShieldCheck className="h-6 w-6 text-emerald-600" />,
      description: 'Active registry organizations',
    },
    {
      label: 'Active Verifications',
      value: activeTasks.length,
      icon: <Activity className="h-6 w-6 text-blue-600" />,
      description: `${verificationTasks.filter(t => t.status === 'Completed').length} audits completed`,
    },
    {
      label: 'Total Credits Issued',
      value: totalCreditsIssued.toLocaleString() + ' t',
      icon: <TrendingUp className="h-6 w-6 text-teal-600" />,
      description: `Current price: $${pricePerCredit.toFixed(2)} / tCO₂e`,
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute adminOnly>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500 text-sm">Loading oversight dashboard...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute adminOnly>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  {user?.role === 'Government Official' ? 'Government Oversight & Verification' : 'Registry Administration Portal'}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
                  {user?.role || 'Admin'}
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Manage NGO & corporate registrations, assign field verifiers, review compliance pipelines, and issue verified carbon credits.
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAll}
                className="text-xs bg-white border-slate-300 hover:bg-slate-100"
              >
                Refresh Data
              </Button>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Action Failed</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 flex items-center justify-between text-sm text-emerald-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <p className="font-semibold">{successMsg}</p>
              </div>
              <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {systemMetrics.map((metric, index) => (
              <StatCard key={index} label={metric.label} value={metric.value} icon={metric.icon} description={metric.description} />
            ))}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 mb-6 bg-white p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveTab('organizations')}
              className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === 'organizations'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="h-4 w-4" />
              <span>NGO & Company Onboarding</span>
              {pendingCompanies.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'organizations' ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingCompanies.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('verifier_distribution')}
              className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === 'verifier_distribution'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span>Verifier Distribution & Allocation</span>
              {activeTasks.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'verifier_distribution' ? 'bg-blue-400 text-slate-900' : 'bg-blue-100 text-blue-800'
                }`}>
                  {activeTasks.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('issuance_pricing')}
              className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === 'issuance_pricing'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="h-4 w-4" />
              <span>Credits & Pricing Config</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: NGO & COMPANY REGISTRATION & VERIFICATION (BUG 1)      */}
          {/* ============================================================== */}
          {activeTab === 'organizations' && (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Organization & Project Registration Applications</h2>
                    <p className="text-slate-600 text-xs mt-1">
                      Inspect submitted NGO charters, government registrations, and corporate credentials before approving accounts.
                    </p>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search orgs, licenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-9 text-xs w-48 sm:w-60 bg-white"
                      />
                    </div>

                    {/* Status Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
                      {(['all', 'Pending', 'Verified', 'Rejected'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2.5 py-1 rounded-md transition capitalize ${
                            statusFilter === st ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {st}
                          {st === 'Pending' && pendingCompanies.length > 0 && ` (${pendingCompanies.length})`}
                        </button>
                      ))}
                    </div>

                    {/* Type Filter */}
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="h-9 px-2.5 text-xs rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none"
                    >
                      <option value="all">All Organization Types</option>
                      <option value="Blue Carbon Project">Blue Carbon Project</option>
                      <option value="Buyer Company">Buyer Company</option>
                      <option value="Verifier Organization">Verifier Organization</option>
                      <option value="IT">IT & Monitoring</option>
                      <option value="Credit Transfer">Credit Transfer</option>
                    </select>
                  </div>
                </div>

                {filteredCompanies.length === 0 ? (
                  <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No organizations found matching the filter criteria.</p>
                    <p className="text-xs text-slate-500 mt-1">Try resetting the status or search filter above.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Organization / Project</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Reg / License #</th>
                          <th className="py-3 px-4">Location & Contact</th>
                          <th className="py-3 px-4">Credentials</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredCompanies.map((comp) => {
                          const status = comp.status || (comp.active ? 'Verified' : 'Pending');
                          return (
                            <tr key={comp.id} className="hover:bg-slate-50 transition">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div>{comp.name}</div>
                                {comp.estimated_area_hectares && (
                                  <span className="text-[11px] text-slate-500 font-normal">
                                    {comp.estimated_area_hectares} ha • {comp.expected_carbon_sequestration?.toLocaleString()} tCO₂e
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                                  {comp.type}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-700">
                                {comp.registration_number || <span className="text-slate-400 italic">Not provided</span>}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                <div className="font-medium text-slate-800">{comp.location}</div>
                                {comp.contact_email && <div className="text-[11px] text-slate-500">{comp.contact_email}</div>}
                              </td>
                              <td className="py-3.5 px-4">
                                {comp.credential_document ? (
                                  <a
                                    href={comp.credential_document}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>Doc Link</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400 italic">None attached</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                {status === 'Verified' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle className="h-3 w-3" />
                                    Verified
                                  </span>
                                ) : status === 'Rejected' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                    <XCircle className="h-3 w-3" />
                                    Rejected
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                    <Clock className="h-3 w-3" />
                                    Pending Review
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setInspectingCompany(comp)}
                                    className="text-xs h-7 px-2.5"
                                  >
                                    Inspect
                                  </Button>

                                  {status !== 'Verified' && (
                                    <Button
                                      size="sm"
                                      disabled={actionInProgressId === comp.id}
                                      onClick={() => handleVerify(comp.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-2.5 font-medium"
                                    >
                                      {actionInProgressId === comp.id ? 'Verifying...' : 'Verify'}
                                    </Button>
                                  )}

                                  {status !== 'Rejected' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={actionInProgressId === comp.id}
                                      onClick={() => {
                                        setRejectionModalId(comp.id);
                                        setRejectionReason('');
                                      }}
                                      className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs h-7 px-2 font-medium"
                                    >
                                      Reject
                                    </Button>
                                  )}
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
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: VERIFIER ALLOCATION BY GOVERNMENT OFFICIALS (BUG 2)     */}
          {/* ============================================================== */}
          {activeTab === 'verifier_distribution' && (
            <div className="space-y-8">
              {/* Allocation Workspace Card */}
              <Card className="p-6 border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Field Verifier Assignment & Routing Engine</h2>
                      <p className="text-xs text-slate-600">
                        Assign designated field compliance verifiers based on regional proximity, domain expertise, and current workload.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                    {verifiers.length} Certified Verifiers Available
                  </span>
                </div>

                <form onSubmit={handleDispatchAssignment} className="space-y-6">
                  {/* Step 1: Select Project */}
                  <div>
                    <Label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      1. Select Project Awaiting Verification
                    </Label>
                    <select
                      value={selectedProjectForAssignment}
                      onChange={(e) => setSelectedProjectForAssignment(e.target.value ? Number(e.target.value) : '')}
                      className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                      required
                    >
                      <option value="">-- Choose a Blue Carbon Project / Organization --</option>
                      {companies.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name} • Location: {proj.location} • Status: {proj.status} • Area: {proj.estimated_area_hectares || 'N/A'} ha
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 2: Automated Smart Verifier Recommendations */}
                  {selectedProjectForAssignment && (
                    <div className="p-4 bg-white rounded-xl border border-blue-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
                          2. Recommended Field Verifiers (Ranked by Region & Domain Expertise)
                        </Label>
                        {loadingRecommendations && (
                          <span className="text-xs text-blue-600 animate-pulse">Calculating optimal routing...</span>
                        )}
                      </div>

                      {recommendations.length === 0 && !loadingRecommendations ? (
                        <p className="text-xs text-slate-500 py-3 text-center">
                          No registered verifiers found. You can register verifiers with role "Verifier" in the registration portal.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {recommendations.map((rec) => {
                            const isSelected = selectedVerifierId === rec.verifier_id;
                            return (
                              <div
                                key={rec.verifier_id}
                                onClick={() => setSelectedVerifierId(rec.verifier_id)}
                                className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50/90 shadow-sm ring-2 ring-blue-500'
                                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-bold text-slate-900 text-sm">{rec.verifier_name}</span>
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                    rec.score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {rec.score}% Match
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-2">{rec.email}</p>

                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-1 text-slate-700">
                                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Region: <strong>{rec.region}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-700">
                                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Specialty: <strong>{rec.domain_expertise}</strong></span>
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-700">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Workload: <strong>{rec.active_tasks} active tasks</strong></span>
                                  </div>
                                </div>

                                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex flex-wrap gap-1">
                                  {rec.reasons.map((r, i) => (
                                    <span key={i} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                      ✓ {r}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 3: Priority, Due Date & Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Priority Level
                      </Label>
                      <select
                        id="priority"
                        value={assignmentPriority}
                        onChange={(e) => setAssignmentPriority(e.target.value as any)}
                        className="mt-1.5 w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Normal">Normal Priority</option>
                        <option value="High">High Priority</option>
                        <option value="Urgent">Urgent Priority (Immediate Field Visit)</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="dueDate" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Target Completion Due Date
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={assignmentDueDate}
                        onChange={(e) => setAssignmentDueDate(e.target.value)}
                        className="mt-1.5 bg-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="assignmentNotes" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Official Instructions & Inspection Guidelines
                    </Label>
                    <Textarea
                      id="assignmentNotes"
                      placeholder="Specify required drone / ground ground-truthing, soil core sampling, canopy density verification, or community interview requirements..."
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      className="mt-1.5 bg-white min-h-20 text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={dispatchingAssignment || !selectedProjectForAssignment || !selectedVerifierId}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-sm"
                  >
                    {dispatchingAssignment ? 'Dispatching & Notifying Verifier...' : 'Confirm Assignment & Dispatch Task to Verifier'}
                  </Button>
                </form>
              </Card>

              {/* Active Verification Task Pipeline Table */}
              <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Verification Tasks & Audit Status Pipeline</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Monitor status of delegated compliance audits across all field review teams.
                    </p>
                  </div>

                  {/* Task Filter */}
                  <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
                    {['all', 'Assigned', 'In Progress', 'Completed', 'Needs Revision'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setTaskStatusFilter(st)}
                        className={`px-3 py-1 rounded-md transition ${
                          taskStatusFilter === st ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {st === 'all' ? 'All Tasks' : st}
                      </button>
                    ))}
                  </div>
                </div>

                {verificationTasks.length === 0 ? (
                  <p className="text-sm text-slate-500 py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No verification tasks have been assigned yet. Select a project above to allocate a field verifier.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold uppercase tracking-wider">
                          <th className="py-3 px-4">Task # & Project</th>
                          <th className="py-3 px-4">Designated Verifier</th>
                          <th className="py-3 px-4">Assigned By</th>
                          <th className="py-3 px-4">Priority</th>
                          <th className="py-3 px-4">Dates</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {verificationTasks
                          .filter((t) => taskStatusFilter === 'all' || t.status === taskStatusFilter)
                          .map((task) => (
                            <tr key={task.id} className="hover:bg-slate-50 transition">
                              <td className="py-3.5 px-4 font-semibold text-slate-900">
                                <div>Task #{task.id} • {task.project_name}</div>
                                <span className="text-[11px] text-slate-500 font-normal">{task.project_location}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-800">{task.verifier_name}</div>
                                <span className="text-[11px] text-slate-500">{task.verifier_region || 'Territory unassigned'}</span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium">
                                {task.assigned_by_name || 'Government Official'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  task.priority === 'Urgent'
                                    ? 'bg-rose-100 text-rose-800'
                                    : task.priority === 'High'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}>
                                  {task.priority}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                <div>Assigned: {task.assigned_date ? new Date(task.assigned_date).toLocaleDateString() : 'N/A'}</div>
                                {task.due_date && <div className="text-[11px] text-blue-600 font-semibold">Due: {task.due_date}</div>}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  task.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : task.status === 'In Progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : task.status === 'Needs Revision'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {task.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setInspectingTask(task)}
                                  className="text-xs h-7 px-2.5 font-medium"
                                >
                                  View Audit / Update
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CARBON CREDITS ISSUANCE & PRICING CONFIG                */}
          {/* ============================================================== */}
          {activeTab === 'issuance_pricing' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-600" />
                  Issue Carbon Credits
                </h2>
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
                    <p>Total Registered Organizations</p>
                    <p className="font-medium text-slate-900">{companies.length}</p>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <p>Verified Organizations</p>
                    <p className="font-medium text-slate-900">{verifiedCompanies.length}</p>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <p>Field Verifier Workforce</p>
                    <p className="font-medium text-slate-900">{verifiers.length}</p>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <p>Total Transactions</p>
                    <p className="font-medium text-slate-900">{transactions.length}</p>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <p>Total Users</p>
                    <p className="font-medium text-slate-900">{users.length}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL: ORGANIZATION INSPECTION DIALOG (BUG 1)                   */}
          {/* ============================================================== */}
          {inspectingCompany && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">{inspectingCompany.type}</span>
                    <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{inspectingCompany.name}</h2>
                    <p className="text-xs text-slate-500">{inspectingCompany.location}</p>
                  </div>
                  <button
                    onClick={() => setInspectingCompany(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-semibold block uppercase tracking-wider">Registration / Tax ID</span>
                    <span className="font-bold text-slate-800 text-sm">{inspectingCompany.registration_number || 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-semibold block uppercase tracking-wider">Verification Status</span>
                    <span className={`font-bold text-sm ${
                      inspectingCompany.status === 'Verified' ? 'text-emerald-700' : inspectingCompany.status === 'Rejected' ? 'text-rose-700' : 'text-amber-700'
                    }`}>
                      {inspectingCompany.status || 'Pending'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-semibold block uppercase tracking-wider">Official Email</span>
                    <span className="font-medium text-slate-800">{inspectingCompany.contact_email || 'Not provided'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="text-slate-500 font-semibold block uppercase tracking-wider">Contact Phone</span>
                    <span className="font-medium text-slate-800">{inspectingCompany.contact_phone || 'Not provided'}</span>
                  </div>
                </div>

                {/* Credential Document Inspection */}
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">Submitted Credential Documents</span>
                  {inspectingCompany.credential_document ? (
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <span className="text-xs font-medium text-slate-800 break-all">{inspectingCompany.credential_document}</span>
                      </div>
                      <a
                        href={inspectingCompany.credential_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold flex items-center gap-1 flex-shrink-0"
                      >
                        Inspect Document <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No external document link provided by applicant.</p>
                  )}
                </div>

                {/* AI Planning Fields if present */}
                {inspectingCompany.project_scope && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                    <span className="font-bold text-slate-800">Project Scope & Ecosystem Rationale:</span>
                    <p className="text-slate-600">{inspectingCompany.project_scope}</p>
                  </div>
                )}

                {inspectingCompany.objectives && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                    <span className="font-bold text-slate-800">Conservation Objectives:</span>
                    <p className="text-slate-600 whitespace-pre-line font-mono">{inspectingCompany.objectives}</p>
                  </div>
                )}

                {inspectingCompany.estimated_budget && (
                  <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-xs">
                    <span className="font-bold text-slate-800">Estimated Budget & Communities:</span>
                    <p className="text-slate-600">Budget: {inspectingCompany.estimated_budget}</p>
                    {inspectingCompany.target_demographics && (
                      <p className="text-slate-600 mt-1">Demographics: {inspectingCompany.target_demographics}</p>
                    )}
                  </div>
                )}

                {inspectingCompany.rejection_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-rose-800">Rejection Reason on Record:</span>
                    <p className="text-rose-700">{inspectingCompany.rejection_reason}</p>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {inspectingCompany.reviewed_by_username && (
                      <span>Reviewed by: {inspectingCompany.reviewed_by_username}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setInspectingCompany(null)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                    {inspectingCompany.status !== 'Rejected' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setRejectionModalId(inspectingCompany.id);
                          setRejectionReason('');
                        }}
                        className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                      >
                        Reject
                      </Button>
                    )}
                    {inspectingCompany.status !== 'Verified' && (
                      <Button
                        onClick={() => handleVerify(inspectingCompany.id)}
                        disabled={actionInProgressId === inspectingCompany.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        {actionInProgressId === inspectingCompany.id ? 'Verifying...' : 'Approve & Verify'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL: REJECTION REASON PROMPT                                 */}
          {/* ============================================================== */}
          {rejectionModalId !== null && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-2 text-rose-700">
                  <XCircle className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">Reject Registration Application</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Provide an official reason for rejection. This explanation will be recorded in the registry and sent automatically via email notification to the applicant.
                </p>
                <Textarea
                  placeholder="e.g. Credential document could not be validated against the national registry; missing tax accreditation charter."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="min-h-24 text-xs"
                />
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectionModalId(null);
                      setRejectionReason('');
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleReject(rejectionModalId)}
                    disabled={actionInProgressId === rejectionModalId}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                  >
                    {actionInProgressId === rejectionModalId ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* MODAL: TASK AUDIT & STATUS UPDATE                              */}
          {/* ============================================================== */}
          {inspectingTask && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Verification Task #{inspectingTask.id}</span>
                    <h3 className="text-lg font-bold text-slate-900">{inspectingTask.project_name}</h3>
                    <p className="text-xs text-slate-500">Verifier: {inspectingTask.verifier_name} • Region: {inspectingTask.verifier_region || 'N/A'}</p>
                  </div>
                  <button onClick={() => setInspectingTask(null)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">Official Instructions:</span>
                    <p className="text-slate-600">{inspectingTask.notes || 'Standard MRV baseline audit'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <span className="font-bold text-slate-800 block mb-1">Verifier Field Report:</span>
                    <p className="text-slate-600 whitespace-pre-line">{inspectingTask.field_report || 'No field report submitted yet by verifier.'}</p>
                  </div>

                  {inspectingTask.evidence_document && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <span className="font-bold text-blue-900 block mb-1">Audit Evidence Document:</span>
                      <a
                        href={inspectingTask.evidence_document}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {inspectingTask.evidence_document} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div>
                    <Label className="block text-xs font-bold text-slate-700 mb-1">Update Task Status:</Label>
                    <div className="flex gap-2">
                      {(['In Progress', 'Completed', 'Needs Revision'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleUpdateTaskStatus(inspectingTask.id, st)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold border transition ${
                            inspectingTask.status === st
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-200">
                  <Button variant="outline" size="sm" onClick={() => setInspectingTask(null)} className="text-xs">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
