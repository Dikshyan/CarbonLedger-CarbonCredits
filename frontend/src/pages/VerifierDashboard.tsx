import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProtectedRoute from '@/components/ProtectedRoute';
import VerifierReviewModal, { ReviewableProject } from '@/components/VerifierReviewModal';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  MapPin,
  Leaf,
  FileText,
  Calendar,
  RefreshCw,
} from 'lucide-react';

export default function VerifierDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ReviewableProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedProject, setSelectedProject] = useState<ReviewableProject | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/CarbonLedger/');
      const list: ReviewableProject[] = Array.isArray(data) ? data : (data?.results ?? []);
      setProjects(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load assigned projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  // Robust check for assignment matching the logged-in verifier
  const isAssignedToCurrentUser = (project: ReviewableProject, userId?: number): boolean => {
    if (!userId || !project.assigned_verifier) return false;
    if (typeof project.assigned_verifier === 'number') {
      return project.assigned_verifier === userId;
    }
    if (typeof project.assigned_verifier === 'object' && project.assigned_verifier !== null) {
      return project.assigned_verifier.id === userId;
    }
    return false;
  };

  // Only projects assigned to the logged-in verifier
  const assignedProjects = projects.filter((p) => isAssignedToCurrentUser(p, user?.id));

  const handleReviewSuccess = (updatedProject: any, message: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === updatedProject.id
          ? {
              ...p,
              status: updatedProject.status,
              verifier_notes: updatedProject.verifier_notes ?? p.verifier_notes,
              verified_at: updatedProject.verified_at ?? p.verified_at,
            }
          : p
      )
    );
    setSuccessMessage(message);
    setIsReviewModalOpen(false);
    setSelectedProject(null);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Verified
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="h-3 w-3 text-blue-600" />
            Under Review
          </span>
        );
      case 'Correction Required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <AlertTriangle className="h-3 w-3 text-purple-600" />
            Correction Required
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3 text-red-600" />
            Rejected
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3 text-amber-600" />
            {status || 'Pending'}
          </span>
        );
    }
  };

  return (
    <ProtectedRoute allowedRoles={['Government Official']}>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-7 w-7 text-teal-600" />
                <h1 className="text-3xl font-bold text-slate-900">Verifier Dashboard</h1>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Manage and review restoration projects assigned to you for verification and compliance auditing.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadProjects}
              disabled={loading}
              className="self-start sm:self-auto gap-1.5 text-xs text-slate-700 bg-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Queue
            </Button>
          </div>

          {/* Feedback Alerts */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-6 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage('')}
                className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Content */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
              <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Loading assigned projects...</p>
            </div>
          ) : assignedProjects.length === 0 ? (
            /* Empty State */
            <Card className="p-12 text-center border-slate-200 bg-white shadow-xs">
              <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-800 mb-1">No Projects Assigned</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                No projects are currently assigned to you. When an administrator designates you as the verifier for a project, it will appear here for review.
              </p>
            </Card>
          ) : (
            /* Assigned Projects List */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Showing {assignedProjects.length} assigned project{assignedProjects.length === 1 ? '' : 's'}
                </span>
                <span>
                  {assignedProjects.filter((p) => p.status === 'Under Review').length} awaiting review
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {assignedProjects.map((project) => {
                  const isEligibleForReview = project.status === 'Under Review';

                  return (
                    <Card
                      key={project.id}
                      className="p-6 border-slate-200 bg-white shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Project Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-400">
                              #{project.id}
                            </span>
                            <h2 className="text-lg font-bold text-slate-900">{project.name}</h2>
                            {renderStatusBadge(project.status)}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-2 gap-x-4 text-xs text-slate-600 pt-1">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{project.location || 'Location not specified'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Leaf className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>Area: {project.estimated_area_hectares ? `${project.estimated_area_hectares} ha` : '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>
                                Potential:{' '}
                                {project.expected_carbon_sequestration
                                  ? `${parseFloat(project.expected_carbon_sequestration).toLocaleString()} tCO₂e`
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>
                                Submitted:{' '}
                                {project.added_date
                                  ? new Date(project.added_date).toLocaleDateString()
                                  : '—'}
                              </span>
                            </div>
                          </div>

                          {/* Notes if available */}
                          {project.verifier_notes && (
                            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
                              <span className="font-semibold text-slate-900">Notes: </span>
                              {project.verifier_notes}
                            </div>
                          )}

                          {project.verified_at && (
                            <p className="text-[11px] text-emerald-700 font-medium">
                              Approved on {new Date(project.verified_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Review Action */}
                        <div className="lg:pl-6 lg:border-l border-slate-100 flex items-center justify-end">
                          {isEligibleForReview ? (
                            <Button
                              onClick={() => {
                                setSelectedProject(project);
                                setIsReviewModalOpen(true);
                              }}
                              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-xs w-full sm:w-auto"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                              Review Project
                            </Button>
                          ) : (
                            <div className="text-right">
                              <span className="text-xs text-slate-400 italic">
                                {project.status === 'Verified'
                                  ? 'Project approved'
                                  : project.status === 'Rejected'
                                  ? 'Project rejected'
                                  : project.status === 'Correction Required'
                                  ? 'Awaiting NGO corrections'
                                  : 'Review unavailable'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Review Modal */}
      <VerifierReviewModal
        project={selectedProject}
        isOpen={isReviewModalOpen}
        onClose={() => {
          setIsReviewModalOpen(false);
          setSelectedProject(null);
        }}
        onSuccess={handleReviewSuccess}
      />
    </ProtectedRoute>
  );
}
