import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import {
  Globe,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Building2,
  Coins,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Filter,
} from 'lucide-react';

interface Company {
  id: number;
  name: string;
  type: string;
  status: string;
  location?: string;
  latitude: string | null;
  longitude: string | null;
}

interface Transaction {
  project: number;
  credits: string;
  transaction_type: string;
}

const ADDS = ['Issuance', 'Recieve'];
const SUBTRACTS = ['Transfer', 'Cancellation', 'Cancellatiobn'];

const PALETTE = [
  'bg-emerald-500 text-emerald-500',
  'bg-teal-500 text-teal-500',
  'bg-sky-500 text-sky-500',
  'bg-indigo-500 text-indigo-500',
  'bg-cyan-500 text-cyan-500',
  'bg-blue-500 text-blue-500',
  'bg-amber-500 text-amber-500',
];

function isValidCoordinate(lat: string | null | undefined, lng: string | null | undefined): boolean {
  if (lat == null || lng == null) return false;
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  return (
    !isNaN(nLat) &&
    !isNaN(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

export default function MapsCharts() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Verified' | 'Pending' | 'Rejected'>('ALL');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/v1/CarbonLedger/'),
      apiFetch('/api/v1/CarbonLedgerTransactions/'),
    ])
      .then(([companyData, txData]) => {
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setTransactions(Array.isArray(txData) ? txData : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const availableCredits = (companyId: number) =>
    transactions
      .filter((t) => t.project === companyId)
      .reduce((sum, t) => {
        const amt = parseFloat(t.credits);
        if (ADDS.includes(t.transaction_type)) return sum + amt;
        if (SUBTRACTS.includes(t.transaction_type)) return sum - amt;
        return sum;
      }, 0);

  const totalCreditsAllProjects = useMemo(() => {
    return companies.reduce(
      (sum, c) => sum + Math.max(0, availableCredits(c.id)),
      0
    );
  }, [companies, transactions]);

  const verifiedCount = useMemo(() => {
    return companies.filter((c) => c.status === 'Verified').length;
  }, [companies]);

  const pendingCount = useMemo(() => {
    return companies.filter((c) => c.status === 'Pending').length;
  }, [companies]);

  const geotaggedCount = useMemo(() => {
    return companies.filter((c) => isValidCoordinate(c.latitude, c.longitude)).length;
  }, [companies]);

  // Project Type Breakdown (CSS-based, 0 external chart dependencies)
  const projectTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    companies.forEach((c) => {
      const type = c.type?.trim() || 'Blue Carbon Project';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const total = companies.length || 1;
    return Object.entries(typeCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [companies]);

  // Credit Distribution by Project (CSS-based, 0 external chart dependencies)
  const creditsByProject = useMemo(() => {
    const maxCredit = Math.max(
      ...companies.map((c) => Math.max(0, availableCredits(c.id))),
      1
    );

    return companies
      .map((c) => {
        const credits = availableCredits(c.id);
        const relativePct = Math.min(100, Math.round((Math.max(0, credits) / maxCredit) * 100));
        return {
          id: c.id,
          name: c.name,
          type: c.type || 'Blue Carbon',
          status: c.status,
          credits,
          relativePct,
        };
      })
      .sort((a, b) => b.credits - a.credits);
  }, [companies, transactions]);

  // Filtered project list for directory view
  const filteredProjects = useMemo(() => {
    return companies.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.type && c.type.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [companies, statusFilter, searchQuery]);

  const statusBadge = (status: string) => {
    if (status === 'Verified') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Rejected') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-slate-600 font-medium text-sm">Loading project analytics &amp; registry...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Project Analytics &amp; Registry</h1>
              <p className="text-slate-600 mt-1">
                Geographic coordinates, verification status, and carbon credit allocation across all registered projects
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-slate-700">
                  {companies.length} Total Projects
                </span>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {verifiedCount} Verified
                </span>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {pendingCount} Pending
                </span>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-slate-700">
                  {totalCreditsAllProjects.toLocaleString()} Credits Active
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ─── Geographic & Project Registry Section ─── */}
          <Card className="p-6 mb-8 border-slate-200 shadow-sm bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Geographic &amp; Project Registry
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed coordinates and registration metadata for {filteredProjects.length} of {companies.length} project(s)
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex items-center flex-wrap gap-2.5">
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder="Search name, location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({companies.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('Verified')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      statusFilter === 'Verified'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Verified ({verifiedCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('Pending')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      statusFilter === 'Pending'
                        ? 'bg-white text-amber-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('Rejected')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      statusFilter === 'Rejected'
                        ? 'bg-white text-rose-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rejected ({companies.filter((c) => c.status === 'Rejected').length})
                  </button>
                </div>
              </div>
            </div>

            {/* Project Registry Grid / Table */}
            {filteredProjects.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                <Globe className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium">No projects match the selected criteria.</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or status filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Location &amp; Coordinates</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Available Credits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredProjects.map((project) => {
                      const credits = availableCredits(project.id);
                      const hasCoords = isValidCoordinate(project.latitude, project.longitude);

                      return (
                        <tr key={project.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900">{project.name}</div>
                            <div className="text-xs text-slate-400 font-mono">ID #{project.id}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {project.type || 'Blue Carbon'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-medium text-slate-800">
                              {project.location || 'Location Not Specified'}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1">
                              {hasCoords ? (
                                <>
                                  <MapPin className="w-3 h-3 text-primary shrink-0" />
                                  <span>
                                    {parseFloat(project.latitude!).toFixed(4)}°, {parseFloat(project.longitude!).toFixed(4)}°
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400 italic">No GPS coordinates</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(project.status)}`}>
                              {project.status === 'Verified' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {project.status === 'Pending' && <Clock className="w-3 h-3 text-amber-600" />}
                              {project.status === 'Rejected' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                              {project.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-semibold text-slate-900">
                            {credits.toLocaleString()}{' '}
                            <span className="text-xs font-normal text-slate-500">tCO₂e</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                <span>Geotagged projects: <strong>{geotaggedCount}</strong> of <strong>{companies.length}</strong></span>
              </span>
              <span>Showing {filteredProjects.length} project(s)</span>
            </div>
          </Card>

          {/* ─── Statistical Breakdown Cards (Pure CSS, 0 External Dependencies) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            
            {/* Project Type Distribution */}
            <Card className="p-6 border-slate-200 shadow-sm bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-slate-900">Project Type Distribution</h2>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {projectTypeData.length} category(ies)
                </span>
              </div>

              {projectTypeData.length === 0 ? (
                <p className="text-sm text-slate-500 py-12 text-center">No projects registered yet.</p>
              ) : (
                <div className="space-y-4 pt-1">
                  {projectTypeData.map((item, index) => {
                    const colorClass = PALETTE[index % PALETTE.length].split(' ')[0];
                    return (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                            {item.name}
                          </span>
                          <span className="text-slate-600 font-mono">
                            {item.count} project{item.count !== 1 ? 's' : ''} ({item.pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                            style={{ width: `${Math.max(5, item.pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Available Credits by Project */}
            <Card className="p-6 border-slate-200 shadow-sm bg-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-slate-900">Available Credits by Project</h2>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {creditsByProject.filter((c) => c.credits > 0).length} active balance(s)
                </span>
              </div>

              {creditsByProject.length === 0 ? (
                <p className="text-sm text-slate-500 py-12 text-center">No transaction records found.</p>
              ) : (
                <div className="space-y-4 pt-1">
                  {creditsByProject.slice(0, 7).map((item) => (
                    <div key={item.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={item.name}>
                          {item.name}
                        </span>
                        <span className="text-slate-700 font-mono font-semibold">
                          {item.credits.toLocaleString()}{' '}
                          <span className="text-slate-400 font-normal">tCO₂e</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.max(4, item.relativePct)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {creditsByProject.length > 7 && (
                    <p className="text-[11px] text-slate-400 text-center pt-2">
                      + {creditsByProject.length - 7} more project(s) listed in table above
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


