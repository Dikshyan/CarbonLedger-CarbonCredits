import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Card } from '@/components/ui/card';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Fix leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function MapsCharts() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sample project locations
  const projects = [
    { id: 1, name: 'Coastal Mangrove Restoration', lat: -6.2088, lng: 106.8456, credits: 1250 },
    { id: 2, name: 'Seagrass Meadow Protection', lat: -25.2744, lng: 133.7751, credits: 890 },
    { id: 3, name: 'Salt Marsh Enhancement', lat: 40.7128, lng: -74.0060, credits: 650 },
  ];

  // Carbon sequestration trend data
  const sequestrationData = [
    { month: 'Jan', credits: 450, target: 500 },
    { month: 'Feb', credits: 520, target: 500 },
    { month: 'Mar', credits: 580, target: 550 },
    { month: 'Apr', credits: 650, target: 600 },
    { month: 'May', credits: 720, target: 650 },
    { month: 'Jun', credits: 890, target: 700 },
  ];

  // Project type distribution
  const projectTypeData = [
    { name: 'Mangrove', value: 45 },
    { name: 'Seagrass', value: 30 },
    { name: 'Salt Marsh', value: 15 },
    { name: 'Kelp Forest', value: 10 },
  ];

  // Credits by project
  const creditsByProject = [
    { name: 'Mangrove Restoration', credits: 1250 },
    { name: 'Seagrass Meadow', credits: 890 },
    { name: 'Salt Marsh', credits: 650 },
  ];

  const COLORS = ['#1e5a8e', '#0ea5a5', '#06b6d4', '#0891b2'];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Maps & Analytics</h1>
            <p className="text-slate-600">
              Visualize your projects and track carbon sequestration metrics
            </p>
          </div>

          {/* Map Section */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Project Locations</h2>
            {isMounted && (
              <div className="rounded-lg overflow-hidden" style={{ height: '400px' }}>
                <MapContainer
                  center={[0, 0]}
                  zoom={2}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {projects.map((project) => (
                    <Marker key={project.id} position={[project.lat, project.lng]}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">{project.name}</p>
                          <p className="text-slate-600">{project.credits.toLocaleString()} credits</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </Card>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Carbon Sequestration Trend */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Carbon Sequestration Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sequestrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="credits"
                    stroke="#1e5a8e"
                    strokeWidth={2}
                    dot={{ fill: '#1e5a8e', r: 4 }}
                    name="Actual Credits"
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    stroke="#0ea5a5"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#0ea5a5', r: 4 }}
                    name="Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Project Type Distribution */}
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Project Type Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Credits by Project */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Credits by Project</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={creditsByProject}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="credits" fill="#1e5a8e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
