import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Card } from '@/components/ui/card';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Company {
  id: number;
  name: string;
  type: string;
  latitude: string | null;
  longitude: string | null;
}

interface Transaction {
  project: number;
  credits: string;
  transaction_type: string;
}

const ADDS = ['Issuance', 'Recieve'];
const SUBTRACTS = ['Transfer', 'Cancellation'];

const COLORS = ['#1e5a8e', '#0ea5a5', '#06b6d4', '#0891b2', '#64748b'];

export default function MapsCharts() {
  const [isMounted, setIsMounted] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsMounted(true);
    Promise.all([
      apiFetch('/api/v1/CarbonLedger/'),
      apiFetch('/api/v1/CarbonLedgerTransactions/'),
    ])
      .then(([companyData, txData]) => {
        setCompanies(companyData);
        setTransactions(txData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const mappable = companies.filter((c) => c.latitude && c.longitude);

  const availableCredits = (companyId: number) =>
    transactions
      .filter((t) => t.project === companyId)
      .reduce((sum, t) => {
        const amt = parseFloat(t.credits);
        if (ADDS.includes(t.transaction_type)) return sum + amt;
        if (SUBTRACTS.includes(t.transaction_type)) return sum - amt;
        return sum;
      }, 0);

  const creditsByProject = companies
    .map((c) => ({ name: c.name, credits: availableCredits(c.id) }))
    .filter((c) => c.credits !== 0);

  const typeCounts: Record<string, number> = {};
  companies.forEach((c) => {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  });
  const projectTypeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-500 text-sm">Loading analytics...</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Maps & Analytics</h1>
            <p className="text-slate-600">Visualize your projects and track carbon metrics</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Card className="p-6 mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Project Locations</h2>
            {mappable.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                No projects have coordinates yet. Add latitude/longitude when registering a project.
              </p>
            ) : (
              isMounted && (
                <div className="rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  <MapContainer center={[0, 0]} zoom={2} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {mappable.map((project) => (
                      <Marker key={project.id} position={[parseFloat(project.latitude!), parseFloat(project.longitude!)]}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">{project.name}</p>
                            <p className="text-slate-600">{availableCredits(project.id).toLocaleString()} available credits</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>
              )
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Project Type Distribution</h2>
              {projectTypeData.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No projects yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectTypeData}
                      cx="50%" cy="50%" labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80} dataKey="value"
                    >
                      {projectTypeData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Available Credits by Project</h2>
              {creditsByProject.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No transactions yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={creditsByProject}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="credits" fill="#1e5a8e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

