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

// Fix default Leaflet marker icon paths (required with bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom coloured marker icons
const verifiedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

const pendingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
  popupAnchor:[1, -34],
  shadowSize: [41, 41],
});

interface Company {
  id: number;
  name: string;
  type: string;
  status: string;
  latitude:  string | null;
  longitude: string | null;
}

interface Transaction {
  project: number;
  credits: string;
  transaction_type: string;
}

const ADDS      = ['Issuance', 'Recieve'];
const SUBTRACTS = ['Transfer', 'Cancellation'];

const COLORS = ['#1e5a8e', '#0ea5a5', '#06b6d4', '#0891b2', '#64748b'];

// Default map center: Sundarbans, West Bengal
const SUNDARBANS_CENTER: [number, number] = [21.9497, 88.9320];
const DEFAULT_ZOOM = 7;

export default function MapsCharts() {
  const [isMounted, setIsMounted]       = useState(false);
  const [companies, setCompanies]       = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const [mapType, setMapType]           = useState<'vector' | 'satellite'>('satellite');

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
        if (ADDS.includes(t.transaction_type))      return sum + amt;
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

  const statusBadge = (status: string) => {
    if (status === 'Verified') return 'bg-green-100 text-green-700';
    if (status === 'Rejected') return 'bg-red-100 text-red-700';
    return 'bg-orange-100 text-orange-700';
  };

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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Maps &amp; Analytics</h1>
            <p className="text-slate-600">Visualize your projects and track carbon metrics</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* ─── Project Map ─── */}
          <Card className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-slate-900">Project Locations</h2>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setMapType('vector')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      mapType === 'vector' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🗺️ Vector Map
                  </button>
                  <button
                    onClick={() => setMapType('satellite')}
                    className={`px-2.5 py-1 rounded-md font-medium transition ${
                      mapType === 'satellite' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🛰️ Satellite Feed
                  </button>
                </div>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span> Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-full bg-orange-400"></span> Pending
                </span>
              </div>
            </div>

            {isMounted && (
              <div className="rounded-lg overflow-hidden" style={{ height: '420px' }}>
                <MapContainer
                  center={mappable.length > 0
                    ? [parseFloat(mappable[0].latitude!), parseFloat(mappable[0].longitude!)]
                    : SUNDARBANS_CENTER}
                  zoom={DEFAULT_ZOOM}
                  style={{ height: '100%', width: '100%' }}
                >
                  {mapType === 'satellite' ? (
                    <TileLayer
                      attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  ) : (
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                  )}


                  {/* FIX 4: Project markers with Verified (green) / Pending (orange) icons */}
                  {mappable.map((project) => (
                    <Marker
                      key={project.id}
                      position={[parseFloat(project.latitude!), parseFloat(project.longitude!)]}
                      icon={project.status === 'Verified' ? verifiedIcon : pendingIcon}
                    >
                      <Popup>
                        <div className="text-sm min-w-[160px]">
                          <p className="font-semibold mb-1">{project.name}</p>
                          <p className="text-slate-600 mb-1">
                            {availableCredits(project.id).toLocaleString()} available credits
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(project.status)}`}>
                            {project.status}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* FIX 3: If no coordinates, map still defaults to Sundarbans */}
                  {mappable.length === 0 && (
                    <Marker position={SUNDARBANS_CENTER}>
                      <Popup>
                        <p className="text-sm font-semibold">Sundarbans Region</p>
                        <p className="text-xs text-slate-500">Register projects to see them here</p>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            )}

            {mappable.length === 0 && (
              <p className="text-xs text-slate-400 mt-2 text-center">
                Showing default Sundarbans view — add latitude/longitude when registering a project to place it on the map.
              </p>
            )}
          </Card>

          {/* ─── Charts ─── */}
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
