import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import {
  X,
  AlertTriangle,
  Send,
  Loader2,
  FileEdit,
  MapPin,
  Leaf,
  Layers,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface EditableProject {
  id: number;
  name: string;
  location: string;
  about?: string;
  type: string;
  status?: string;
  wallet_address?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  estimated_area_hectares?: string | number | null;
  expected_carbon_sequestration?: string | number | null;
  verifier_notes?: string | null;
  assigned_verifier?: any;
}

interface NGOEditResubmitModalProps {
  project: EditableProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProject: any, message: string) => void;
}

export default function NGOEditResubmitModal({
  project,
  isOpen,
  onClose,
  onSuccess,
}: NGOEditResubmitModalProps) {
  if (!isOpen || !project) return null;

  const [formData, setFormData] = useState({
    name: project.name || '',
    location: project.location || '',
    type: project.type || 'Blue Carbon Project',
    about: project.about || '',
    estimatedArea: project.estimated_area_hectares?.toString() || '',
    expectedCarbon: project.expected_carbon_sequestration?.toString() || '',
  });

  const [saving, setSaving] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const isBusy = saving || resubmitting;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
    setSaveSuccess(null);
  };

  // 1. Save Metadata (PATCH /api/v1/CarbonLedger/<id>/ with only permitted fields)
  const handleSaveMetadata = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(null);

    const payload: Record<string, any> = {
      name: formData.name,
      location: formData.location,
      about: formData.about,
      type: formData.type,
      estimated_area_hectares: formData.estimatedArea ? parseFloat(formData.estimatedArea) : null,
      expected_carbon_sequestration: formData.expectedCarbon ? parseFloat(formData.expectedCarbon) : null,
    };

    try {
      const updated = await apiFetch(`/CarbonLedger/${project.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setSaveSuccess('Project metadata updated successfully.');
      onSuccess(updated, 'Project metadata updated.');
    } catch (err: any) {
      let msg = 'Failed to update project metadata.';
      if (err?.status === 403 || err?.message?.includes('403')) {
        msg = '403 Forbidden: You do not have permission to modify this project or its protected fields.';
      } else if (err?.status === 400 || err?.message?.includes('400')) {
        msg = err.detail || err.message || '400 Bad Request: Invalid field values.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // 2. Resubmit Project for Review (POST /api/v1/projects/<id>/resubmit/)
  const handleResubmit = async () => {
    setResubmitting(true);
    setError(null);
    setSaveSuccess(null);

    try {
      // First save any unsaved metadata edits
      const patchPayload: Record<string, any> = {
        name: formData.name,
        location: formData.location,
        about: formData.about,
        type: formData.type,
        estimated_area_hectares: formData.estimatedArea ? parseFloat(formData.estimatedArea) : null,
        expected_carbon_sequestration: formData.expectedCarbon ? parseFloat(formData.expectedCarbon) : null,
      };

      await apiFetch(`/CarbonLedger/${project.id}/`, {
        method: 'PATCH',
        body: JSON.stringify(patchPayload),
      }).catch(() => {});

      // Then call dedicated resubmit endpoint
      const res = await apiFetch(`/projects/${project.id}/resubmit/`, {
        method: 'POST',
      });

      const updatedProject = res?.project || {
        ...project,
        status: 'Under Review',
        ...patchPayload,
      };

      onSuccess(
        updatedProject,
        res?.detail || `Project "${project.name}" resubmitted for review successfully.`
      );
      onClose();
    } catch (err: any) {
      let msg = 'Failed to resubmit project.';
      if (err?.status === 403 || err?.message?.includes('403')) {
        msg = '403 Forbidden: You are not authorized to resubmit this project.';
      } else if (err?.status === 400 || err?.message?.includes('400')) {
        msg = err.detail || err.message || '400 Bad Request: Project cannot be resubmitted.';
      } else if (err?.status === 401 || err?.message?.includes('401')) {
        msg = '401 Unauthorized: Session expired. Please log in again.';
      } else if (err?.status === 404 || err?.message?.includes('404')) {
        msg = '404 Not Found: Project not found.';
      } else if (err?.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setResubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-resubmit-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-purple-600" />
            <div>
              <h2 id="edit-resubmit-title" className="text-lg font-bold text-slate-900">
                Edit & Resubmit Project
              </h2>
              <p className="text-xs text-slate-500">
                Project #{project.id} • {project.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Verifier Feedback Banner (prominently displayed) */}
          {project.verifier_notes && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-purple-900 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4 text-purple-600 shrink-0" />
                <span>Verifier Feedback & Requested Corrections:</span>
              </div>
              <p className="text-sm text-purple-950 pl-6 whitespace-pre-wrap leading-relaxed">
                {project.verifier_notes}
              </p>
            </div>
          )}

          {/* Feedback Messages */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Metadata Edit Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="projectName" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Project Name *
              </Label>
              <Input
                id="projectName"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isBusy}
                className="mt-1 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Location / Region *
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  disabled={isBusy}
                  className="mt-1 text-sm"
                  required
                />
              </div>

              <div>
                <Label htmlFor="projectType" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Project Type *
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
                  disabled={isBusy}
                >
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Blue Carbon Project">Blue Carbon Project</SelectItem>
                    <SelectItem value="Coastal Wetland Restoration">Coastal Wetland Restoration</SelectItem>
                    <SelectItem value="Mangrove Conservation">Mangrove Conservation</SelectItem>
                    <SelectItem value="Seagrass Meadow">Seagrass Meadow</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedArea" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Estimated Area (hectares)
                </Label>
                <Input
                  id="estimatedArea"
                  name="estimatedArea"
                  type="number"
                  step="any"
                  value={formData.estimatedArea}
                  onChange={handleChange}
                  disabled={isBusy}
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="expectedCarbon" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Expected Carbon (tCO₂e)
                </Label>
                <Input
                  id="expectedCarbon"
                  name="expectedCarbon"
                  type="number"
                  step="any"
                  value={formData.expectedCarbon}
                  onChange={handleChange}
                  disabled={isBusy}
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="about" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Project Description & Methodology
              </Label>
              <Textarea
                id="about"
                name="about"
                rows={3}
                value={formData.about}
                onChange={handleChange}
                disabled={isBusy}
                placeholder="Describe restoration activities, methodology, species planted, community engagement..."
                className="mt-1 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={handleSaveMetadata}
              className="text-xs font-medium"
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isBusy}
              onClick={handleResubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
            >
              {resubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Resubmitting...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Resubmit for Review
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
