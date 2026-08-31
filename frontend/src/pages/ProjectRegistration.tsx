import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, AlertCircle, Satellite, Globe } from 'lucide-react';
import { apiFetch } from '@/lib/api';

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
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // AI Estimation state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIEstimateResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRunAIEstimation = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const lat = parseFloat(formData.latitude) || 21.9497;
      const lon = parseFloat(formData.longitude) || 88.9468;
      const area = parseFloat(formData.estimatedArea) || 500;

      const res = await fetch('http://localhost:8001/analyze', {
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
      };

      const result = await apiFetch('/CarbonLedger/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccess(`Project "${result.name || formData.projectName}" registered successfully!`);
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

            {/* AI Estimation Card */}
            <div className="mb-8 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-blue-900 font-semibold text-base">
                  <Satellite className="h-5 w-5 text-blue-600" />
                  <span>AI Satellite Carbon Estimator</span>
                </div>
                <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-700 font-medium rounded-full">
                  FastAPI Port 8001
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Uses Google Earth Engine & Sentinel-2 NDVI satellite imagery (with IPCC wetlands density fallback) to automatically estimate sequestered carbon.
              </p>

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
