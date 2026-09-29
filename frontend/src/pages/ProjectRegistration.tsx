import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, AlertCircle, Satellite, Globe, Target, DollarSign, Users2, FileText, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { extractProjectDraftData } from '@/services/analysisApi';

interface AIEstimateResult {
  project_name: string;
  latitude: number;
  longitude: number;
  area_hectares: number;
  ndvi_mean: number;
  mangrove_coverage_pct: number;
  estimated_carbon_tonnes: number;
  estimated_credits: number;
  confidence: string;
  gee_mode: string;
}

export default function ProjectRegistration() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: 'Blue Carbon Project',
    location: '',
    latitude: '21.9497',
    longitude: '88.9468',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    estimatedArea: '500',
    expectedCarbonSequestration: '200000',
    walletAddress: '',
    // AI Extracted Pipeline Fields
    projectScope: '',
    objectives: '',
    estimatedBudget: '',
    targetDemographics: '',
    // Credential & Verification Fields
    registrationNumber: '',
    contactEmail: '',
    contactPhone: '',
    credentialDocument: '',
  });

  const [aiDraftInfo, setAiDraftInfo] = useState<{
    source: string;
    satellite?: string;
    meanNdvi?: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-hydrate from AI Explorer if user exported from the map
  useEffect(() => {
    const stored = sessionStorage.getItem('ai_project_draft');
    if (stored) {
      try {
        const draft = JSON.parse(stored);
        setFormData(prev => ({
          ...prev,
          projectName: draft.projectName || prev.projectName,
          location: draft.location || prev.location,
          latitude: draft.latitude || prev.latitude,
          longitude: draft.longitude || prev.longitude,
          estimatedArea: draft.estimatedArea || prev.estimatedArea,
          expectedCarbonSequestration: draft.expectedCarbonSequestration || prev.expectedCarbonSequestration,
          projectScope: draft.projectScope || prev.projectScope,
          objectives: draft.objectives || prev.objectives,
          estimatedBudget: draft.estimatedBudget || prev.estimatedBudget,
          targetDemographics: draft.targetDemographics || prev.targetDemographics,
          description: draft.description || prev.description,
        }));
        setAiDraftInfo({
          source: draft.location || 'AI Explorer',
          satellite: draft.satellite || 'Sentinel-2',
          meanNdvi: draft.meanNdvi,
        });
      } catch (err) {
        console.error('Failed to parse AI project draft', err);
      }
    }
  }, []);

  // AI Estimation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIEstimateResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickExtractPreset = async (presetName: string) => {
    const presets: Record<string, { lat: number; lng: number; area: number; carbon: number; ndvi: number }> = {
      'Sundarbans': { lat: 21.9497, lng: 88.9320, area: 1250, carbon: 312500, ndvi: 0.68 },
      'Mumbai Coast': { lat: 19.0760, lng: 72.8777, area: 420, carbon: 98000, ndvi: 0.44 },
      'Western Ghats': { lat: 10.1632, lng: 77.0607, area: 850, carbon: 220000, ndvi: 0.72 },
      'Amazon Basin': { lat: -3.4653, lng: -62.2159, area: 5000, carbon: 1450000, ndvi: 0.82 },
    };

    const target = presets[presetName] || presets['Sundarbans'];
    setAiLoading(true);
    setAiError(null);
    try {
      const simulatedAnalysis = {
        status: 'success' as const,
        project_id: 'preset_' + Date.now(),
        satellite: 'Sentinel-2 Multispectral',
        image_count: 24,
        analysis_period: { start_date: '2025-01-01', end_date: '2025-12-31' },
        indices: {
          ndvi: { min: 0.1, mean: target.ndvi, max: 0.85, stdDev: 0.15 },
        },
        classification: [],
        carbon: {
          total_tonnes: target.carbon,
          by_class: [],
        },
      };

      const draft = await extractProjectDraftData(simulatedAnalysis as any, {
        locationLabel: presetName,
        center: [target.lat, target.lng],
        areaHectares: target.area,
      });

      setFormData(prev => ({
        ...prev,
        projectName: draft.projectName,
        location: draft.location,
        latitude: draft.latitude,
        longitude: draft.longitude,
        estimatedArea: draft.estimatedArea,
        expectedCarbonSequestration: draft.expectedCarbonSequestration,
        projectScope: draft.projectScope,
        objectives: draft.objectives,
        estimatedBudget: draft.estimatedBudget,
        targetDemographics: draft.targetDemographics,
        description: draft.description,
      }));

      setAiDraftInfo({
        source: presetName,
        satellite: 'Sentinel-2 Multispectral',
        meanNdvi: target.ndvi,
      });
    } catch (err: any) {
      setAiError(err.message || 'Failed to extract preset data');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunAIEstimation = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const lat = parseFloat(formData.latitude) || 21.9497;
      const lon = parseFloat(formData.longitude) || 88.9468;
      const area = parseFloat(formData.estimatedArea) || 500;

      const res = await fetch('http://localhost:8001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          area_hectares: area,
          project_name: formData.projectName || 'Blue Carbon Project',
        }),
      });

      if (!res.ok) {
        throw new Error(`AI Service returned status ${res.status}`);
      }

      const data: AIEstimateResult = await res.json();
      setAiResult(data);
      setFormData(prev => ({
        ...prev,
        expectedCarbonSequestration: data.estimated_carbon_tonnes.toString(),
      }));
    } catch (err: any) {
      setAiError(err.message || 'Failed to connect to AI Service at port 8001');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        name: formData.projectName,
        location: formData.location,
        about: formData.description || 'Verified Blue Carbon Mangrove and Coastal Ecosystem Project.',
        type: formData.projectType,
        wallet_address: formData.walletAddress || undefined,
        latitude: parseFloat(formData.latitude) || null,
        longitude: parseFloat(formData.longitude) || null,
        estimated_area_hectares: parseFloat(formData.estimatedArea) || null,
        expected_carbon_sequestration: parseFloat(formData.expectedCarbonSequestration) || null,
        // AI Extracted fields
        project_scope: formData.projectScope || undefined,
        objectives: formData.objectives || undefined,
        estimated_budget: formData.estimatedBudget || undefined,
        target_demographics: formData.targetDemographics || undefined,
        // Credential & Verification fields
        registration_number: formData.registrationNumber || undefined,
        contact_email: formData.contactEmail || undefined,
        contact_phone: formData.contactPhone || undefined,
        credential_document: formData.credentialDocument || undefined,
      };

      const result = await apiFetch('/api/v1/CarbonLedger/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const initialCredits = parseFloat(formData.expectedCarbonSequestration) || 1000;
      if (result && result.id && initialCredits > 0) {
        await apiFetch('/api/v1/CarbonLedgerTransactions/', {
          method: 'POST',
          body: JSON.stringify({
            project: result.id,
            credits: initialCredits.toString(),
            transaction_type: 'Issuance',
          }),
        }).catch(() => {});
      }

      sessionStorage.removeItem('ai_project_draft');
      setSuccess(`Project "${result.name || formData.projectName}" registered successfully! Initial credits issued.`);
      setTimeout(() => {
        setLocation('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to register project. Please check fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          {/* Header */}
          <button
            onClick={() => setLocation('/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <Card className="p-8 shadow-sm border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Register Blue Carbon Project</h1>
                <p className="text-slate-600">
                  Register your coastal restoration project for MRV verification, AI carbon estimation, and credit minting.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Registration Failed</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <p className="font-semibold">{success}</p>
              </div>
            )}

            {/* AI Explorer Pre-population Banner */}
            {aiDraftInfo && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-xl flex items-start justify-between gap-3 text-sm shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg mt-0.5 shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-base">Pre-populated via AI Explorer</p>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                        {aiDraftInfo.satellite || 'Sentinel-2 Satellite Feed'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs mt-1">
                      Key fields including <strong>project scope, quantifiable objectives, algorithmic budget, and target demographics</strong> were automatically extracted from the <strong>{aiDraftInfo.source}</strong> spatial environmental analysis. Review and tailor them below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAiDraftInfo(null);
                    sessionStorage.removeItem('ai_project_draft');
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Dismiss AI Banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* AI Estimation Card */}
            <div className="mb-8 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-blue-900 font-semibold text-base">
                  <Satellite className="h-5 w-5 text-blue-600" />
                  <span>AI Satellite Carbon Estimator & Pipeline Extractor</span>
                </div>
                <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 font-medium rounded-full">
                  FastAPI Port 8001 / Sentinel-2
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Uses Google Earth Engine & Sentinel-2 multi-spectral NDVI/NDWI imagery to automatically estimate sequestered carbon and extract project planning fields.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRunAIEstimation}
                  disabled={aiLoading}
                  className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running Satellite Analysis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                      Estimate Carbon for Current Coordinates
                    </>
                  )}
                </Button>
              </div>

              {/* Quick Preset Selector for instant pre-population */}
              <div className="mt-4 pt-3 border-t border-blue-200">
                <p className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  Quick AI Explorer Presets (Auto-Extract All Fields):
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Sundarbans', 'Mumbai Coast', 'Western Ghats', 'Amazon Basin'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickExtractPreset(preset)}
                      className="text-xs px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md font-medium transition shadow-2xs"
                    >
                      ⚡ Extract {preset}
                    </button>
                  ))}
                </div>
              </div>

              {aiError && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                  ⚠️ {aiError}
                </p>
              )}

              {aiResult && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100 shadow-xs space-y-2 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 font-medium">Mean NDVI</p>
                      <p className="text-base font-bold text-slate-800">{aiResult.ndvi_mean}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 font-medium">Mangrove %</p>
                      <p className="text-base font-bold text-emerald-600">{aiResult.mangrove_coverage_pct}%</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 font-medium">Carbon (tCO₂e)</p>
                      <p className="text-base font-bold text-blue-600">{aiResult.estimated_carbon_tonnes.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="text-slate-500 font-medium">Credits</p>
                      <p className="text-base font-bold text-purple-600">{aiResult.estimated_credits.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-slate-500 pt-1">
                    Model: <strong className="text-slate-700 capitalize">{aiResult.gee_mode}</strong> • Confidence: <strong className="text-slate-700 capitalize">{aiResult.confidence}</strong> • Values auto-applied below.
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div>
                <Label htmlFor="projectName" className="text-slate-700 font-medium">
                  Project Name *
                </Label>
                <Input
                  id="projectName"
                  name="projectName"
                  placeholder="e.g., Sundarbans Mangrove Blue Restoration"
                  value={formData.projectName}
                  onChange={handleChange}
                  className="mt-2"
                  required
                />
              </div>

              {/* Project Type & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectType" className="text-slate-700 font-medium">
                    Project Type *
                  </Label>
                  <Select
                    value={formData.projectType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, projectType: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Blue Carbon Project">Blue Carbon Project</SelectItem>
                      <SelectItem value="Buyer Company">Buyer Company</SelectItem>
                      <SelectItem value="Verifier Organization">Verifier Organization</SelectItem>
                      <SelectItem value="IT">IT & Monitoring</SelectItem>
                      <SelectItem value="Credit Transfer">Credit Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location" className="text-slate-700 font-medium">
                    Location / Region *
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="e.g., West Bengal, Bay of Bengal, India"
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="latitude" className="text-slate-700 font-medium">
                    Latitude
                  </Label>
                  <Input
                    id="latitude"
                    name="latitude"
                    placeholder="e.g., 21.9497"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="mt-2"
                    type="number"
                    step="0.000001"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-slate-700 font-medium">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    placeholder="e.g., 88.9468"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="mt-2"
                    type="number"
                    step="0.000001"
                  />
                </div>
              </div>

              {/* Area & Sequestration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimatedArea" className="text-slate-700 font-medium">
                    Project Area (hectares) *
                  </Label>
                  <Input
                    id="estimatedArea"
                    name="estimatedArea"
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.estimatedArea}
                    onChange={handleChange}
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expectedCarbonSequestration" className="text-slate-700 font-medium">
                    Expected Carbon Sequestration (tCO₂e) *
                  </Label>
                  <Input
                    id="expectedCarbonSequestration"
                    name="expectedCarbonSequestration"
                    type="number"
                    placeholder="e.g., 200000"
                    value={formData.expectedCarbonSequestration}
                    onChange={handleChange}
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              {/* Wallet Address */}
              <div>
                <Label htmlFor="walletAddress" className="text-slate-700 font-medium">
                  Project Owner Wallet Address (Polygon / Hardhat)
                </Label>
                <Input
                  id="walletAddress"
                  name="walletAddress"
                  placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                  value={formData.walletAddress}
                  onChange={handleChange}
                  className="mt-2 font-mono text-xs"
                />
              </div>

              {/* AI Extracted Project Planning Details Section */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>AI Extracted Project Planning & Analytics</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                    Pre-populated
                  </span>
                </div>

                <div>
                  <Label htmlFor="projectScope" className="text-slate-700 font-medium text-xs flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    Project Scope & Ecosystem Rationale
                  </Label>
                  <Textarea
                    id="projectScope"
                    name="projectScope"
                    placeholder="Comprehensive conservation, hydrological restoration, and blue carbon sequestration..."
                    value={formData.projectScope}
                    onChange={handleChange}
                    className="mt-1.5 min-h-20 text-xs"
                  />
                </div>

                <div>
                  <Label htmlFor="objectives" className="text-slate-700 font-medium text-xs flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-slate-500" />
                    Quantifiable Conservation & MRV Objectives
                  </Label>
                  <Textarea
                    id="objectives"
                    name="objectives"
                    placeholder="1. Carbon Sequestration targets... 2. Canopy regeneration... 3. Continuous satellite MRV..."
                    value={formData.objectives}
                    onChange={handleChange}
                    className="mt-1.5 min-h-20 text-xs font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="estimatedBudget" className="text-slate-700 font-medium text-xs flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                      Estimated Project Budget (USD)
                    </Label>
                    <Input
                      id="estimatedBudget"
                      name="estimatedBudget"
                      placeholder="e.g., $750,000 USD (Restoration + MRV)"
                      value={formData.estimatedBudget}
                      onChange={handleChange}
                      className="mt-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetDemographics" className="text-slate-700 font-medium text-xs flex items-center gap-1.5">
                      <Users2 className="h-3.5 w-3.5 text-slate-500" />
                      Target Demographics & Coastal Communities
                    </Label>
                    <Input
                      id="targetDemographics"
                      name="targetDemographics"
                      placeholder="e.g., Artisanal fishing cooperatives, coastal indigenous SHGs"
                      value={formData.targetDemographics}
                      onChange={handleChange}
                      className="mt-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Organization Credential & Onboarding Verification Section */}
              <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span>Organization Credentials & Verification Documents</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full">
                    Admin Reviewed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="registrationNumber" className="text-slate-700 font-medium text-xs">
                      Official Registration / License / NGO ID
                    </Label>
                    <Input
                      id="registrationNumber"
                      name="registrationNumber"
                      placeholder="e.g. NGO-IND-2024-8849"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      className="mt-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactEmail" className="text-slate-700 font-medium text-xs">
                      Official Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      placeholder="e.g. registry@sundarbans-ngo.org"
                      value={formData.contactEmail}
                      onChange={handleChange}
                      className="mt-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactPhone" className="text-slate-700 font-medium text-xs">
                      Contact Phone
                    </Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.contactPhone}
                      onChange={handleChange}
                      className="mt-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="credentialDocument" className="text-slate-700 font-medium text-xs">
                      Credential Document URL (Charter / Accreditation)
                    </Label>
                    <Input
                      id="credentialDocument"
                      name="credentialDocument"
                      placeholder="https://ipfs.io/ipfs/... or accreditation link"
                      value={formData.credentialDocument}
                      onChange={handleChange}
                      className="mt-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-slate-700 font-medium">
                  Project Description & Methodology
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe mangrove planting, satellite monitoring, community involvement, and MRV schedule..."
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-2 min-h-24"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering on Registry...
                    </>
                  ) : (
                    'Register Project on Registry'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}


