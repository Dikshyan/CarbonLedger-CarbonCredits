import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export default function ProjectRegistration() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    location: '',
    latitude: '',
    longitude: '',
    description: '',
    startDate: '',
    estimatedArea: '',
    expectedCarbonSequestration: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission
    alert('Project registered successfully! (Demo mode)');
    setLocation('/dashboard');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl">
          {/* Header */}
          <button
            onClick={() => setLocation('/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <Card className="p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Register New Project</h1>
            <p className="text-slate-600 mb-8">
              Provide details about your blue carbon restoration project for verification and tracking.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div>
                <Label htmlFor="projectName" className="text-slate-700 font-medium">
                  Project Name *
                </Label>
                <Input
                  id="projectName"
                  name="projectName"
                  placeholder="e.g., Coastal Mangrove Restoration Initiative"
                  value={formData.projectName}
                  onChange={handleChange}
                  className="mt-2"
                  required
                />
              </div>

              {/* Project Type */}
              <div>
                <Label htmlFor="projectType" className="text-slate-700 font-medium">
                  Project Type *
                </Label>
                <Select value={formData.projectType} onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, projectType: value }))
                }>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mangrove">Mangrove Restoration</SelectItem>
                    <SelectItem value="seagrass">Seagrass Meadow</SelectItem>
                    <SelectItem value="saltmarsh">Salt Marsh Enhancement</SelectItem>
                    <SelectItem value="kelp">Kelp Forest</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location" className="text-slate-700 font-medium">
                  Location / Country *
                </Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g., Indonesia"
                  value={formData.location}
                  onChange={handleChange}
                  className="mt-2"
                  required
                />
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
                    placeholder="e.g., -6.2088"
                    value={formData.latitude}
                    onChange={handleChange}
                    className="mt-2"
                    type="number"
                    step="0.0001"
                  />
                </div>
                <div>
                  <Label htmlFor="longitude" className="text-slate-700 font-medium">
                    Longitude
                  </Label>
                  <Input
                    id="longitude"
                    name="longitude"
                    placeholder="e.g., 106.8456"
                    value={formData.longitude}
                    onChange={handleChange}
                    className="mt-2"
                    type="number"
                    step="0.0001"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-slate-700 font-medium">
                  Project Description *
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your restoration project, methodology, and expected outcomes..."
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-2 min-h-32"
                  required
                />
              </div>

              {/* Start Date */}
              <div>
                <Label htmlFor="startDate" className="text-slate-700 font-medium">
                  Project Start Date *
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="mt-2"
                  required
                />
              </div>

              {/* Estimated Area */}
              <div>
                <Label htmlFor="estimatedArea" className="text-slate-700 font-medium">
                  Estimated Project Area (hectares) *
                </Label>
                <Input
                  id="estimatedArea"
                  name="estimatedArea"
                  type="number"
                  placeholder="e.g., 250"
                  value={formData.estimatedArea}
                  onChange={handleChange}
                  className="mt-2"
                  required
                />
              </div>

              {/* Expected Carbon Sequestration */}
              <div>
                <Label htmlFor="expectedCarbonSequestration" className="text-slate-700 font-medium">
                  Expected Annual Carbon Sequestration (tonnes CO₂) *
                </Label>
                <Input
                  id="expectedCarbonSequestration"
                  name="expectedCarbonSequestration"
                  type="number"
                  placeholder="e.g., 1500"
                  value={formData.expectedCarbonSequestration}
                  onChange={handleChange}
                  className="mt-2"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Register Project
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
