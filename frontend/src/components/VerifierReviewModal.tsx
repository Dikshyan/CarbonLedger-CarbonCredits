import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  MapPin,
  Leaf,
  Layers,
  Loader2,
} from 'lucide-react';

export interface ReviewableProject {
  id: number;
  name: string;
  location: string;
  status: string;
  type?: string;
  about?: string;
  estimated_area_hectares?: string;
  expected_carbon_sequestration?: string;
  assigned_verifier?: number | { id: number; username?: string; role?: string } | null;
  verifier_notes?: string | null;
  verified_at?: string | null;
  added_date?: string;
}

interface VerifierReviewModalProps {
  project: ReviewableProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProject: any, successMessage: string) => void;
}

type ReviewAction = 'approve' | 'request_correction' | 'reject';

export default function VerifierReviewModal({
  project,
  isOpen,
  onClose,
  onSuccess,
}: VerifierReviewModalProps) {
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submittingAction, setSubmittingAction] = useState<ReviewAction | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNotes(project?.verifier_notes || '');
      setValidationError('');
      setApiError('');
      setSubmittingAction(null);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const isSubmitting = submittingAction !== null;

  const handleAction = async (action: ReviewAction) => {
    setValidationError('');
    setApiError('');

    const trimmedNotes = notes.trim();

    // Frontend validation
    if ((action === 'request_correction' || action === 'reject') && !trimmedNotes) {
      setValidationError(
        action === 'request_correction'
          ? 'Notes are required when requesting corrections.'
          : 'Notes are required when rejecting a project.'
      );
      return;
    }

    setSubmittingAction(action);

    try {
      const res = await apiFetch(`/projects/${project.id}/review/`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          notes: trimmedNotes,
        }),
      });

      if (res && res.project) {
        onSuccess(
          res.project,
          res.detail || `Review action '${action}' applied successfully.`
        );
      } else {
        onSuccess(
          { id: project.id, status: action === 'approve' ? 'Verified' : action === 'reject' ? 'Rejected' : 'Correction Required' },
          `Review action '${action}' applied.`
        );
      }
    } catch (err: any) {
      let msg = 'Failed to submit review.';
      if (err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('assigned verifier')) {
        msg = 'You are not authorized to review this project.';
      } else if (err?.status === 401 || err?.message?.includes('401')) {
        msg = '401 Unauthorized: Session invalid or expired. Please log in again.';
      } else if (err?.status === 404 || err?.message?.includes('404')) {
        msg = '404 Not Found: Project not found.';
      } else if (err?.status === 400 || err?.message?.includes('400')) {
        msg = err.detail || err.message || '400 Bad Request: Invalid review action or notes.';
      } else if (err?.message) {
        msg = err.message;
      }
      setApiError(msg);
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 id="review-modal-title" className="text-lg font-bold text-slate-900">
              Project Verification Review
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Project #{project.id} • {project.name}
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors disabled:opacity-50"
            aria-label="Close review dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Project Details Snapshot */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Project Information
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {project.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{project.location || '—'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{project.type || 'Blue Carbon Project'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Leaf className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Area: {project.estimated_area_hectares ? `${project.estimated_area_hectares} ha` : '—'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>
                  Potential:{' '}
                  {project.expected_carbon_sequestration
                    ? `${parseFloat(project.expected_carbon_sequestration).toLocaleString()} tCO₂e`
                    : '—'}
                </span>
              </div>
            </div>

            {project.about && (
              <p className="text-xs text-slate-600 pt-2 border-t border-slate-200">
                {project.about}
              </p>
            )}
          </div>

          {/* Existing Verifier Notes (if any) */}
          {project.verifier_notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <p className="font-semibold text-amber-800 mb-1">Previous Verifier Notes:</p>
              <p>{project.verifier_notes}</p>
            </div>
          )}

          {/* Notes Input Area */}
          <div>
            <label
              htmlFor="verifier-notes-textarea"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Verifier Review Notes
            </label>
            <Textarea
              id="verifier-notes-textarea"
              rows={4}
              disabled={isSubmitting}
              placeholder="Enter your verification findings, audit checklist results, or correction instructions..."
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (validationError) setValidationError('');
              }}
              className="w-full text-sm"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              * Notes are optional for <strong>Approve</strong>, but strictly required for{' '}
              <strong>Request Correction</strong> and <strong>Reject</strong>.
            </p>
          </div>

          {/* Validation Error Message */}
          {validationError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* API Error Message */}
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{apiError}</span>
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            Cancel
          </Button>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Reject Button */}
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleAction('reject')}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
            >
              {submittingAction === 'reject' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </>
              )}
            </Button>

            {/* Request Correction Button */}
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleAction('request_correction')}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
            >
              {submittingAction === 'request_correction' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Requesting...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" /> Request Correction
                </>
              )}
            </Button>

            {/* Approve Button */}
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleAction('approve')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 flex-1 sm:flex-initial"
            >
              {submittingAction === 'approve' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
