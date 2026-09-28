import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiFetch } from '@/lib/api';
import {
  Globe,
  Maximize2,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ZoomIn,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// Fix default Leaflet marker icon paths (required with bundlers)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create crisp, self-contained SVG pins that never fail to load due to 3rd-party CDN blocks
function createMarkerIcon(status: string, isSelected: boolean = false) {
  let bg = '#10b981'; // Emerald 500
  let symbolSvg = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>`;

  if (status === 'Pending') {
    bg = '#f59e0b'; // Amber 500
    symbolSvg = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>`;
  } else if (status === 'Rejected') {
    bg = '#ef4444'; // Rose 500
    symbolSvg = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
  }

  const ringStyle = isSelected
    ? `box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6); transform: scale(1.15);`
    : ``;

  const html = `
    <div style="position: relative; width: 32px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35)); transition: transform 0.2s; ${ringStyle}">
      <svg width="32" height="40" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0C7.611 0 0 7.611 0 17C0 27.5 14.5 39.5 16.2 40.9C16.65 41.28 17.35 41.28 17.8 40.9C19.5 39.5 34 27.5 34 17C34 7.611 26.389 0 17 0Z" fill="${bg}"/>
        <circle cx="17" cy="16" r="11" fill="rgba(255,255,255,0.25)"/>
      </svg>
      <div style="position: absolute; top: 9px; left: 10px; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
        ${symbolSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -38],
  });
}

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

const ADDS      = ['Issuance', 'Recieve'];
const SUBTRACTS = ['Transfer', 'Cancellation'];
const COLORS    = ['#1e5a8e', '#0ea5a5', '#06b6d4', '#0891b2', '#64748b'];

// Coordinates validation helper
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

// Default global center if no projects
const GLOBAL_DEFAULT_CENTER: [number, number] = [20.0, 0.0];
const GLOBAL_DEFAULT_ZOOM = 2;

// Sub-component controlling viewport bounds & transitions
function MapController({
  projects,
  selectedProject,
  viewMode,
  triggerFit,
}: {
  projects: Company[];
  selectedProject: Company | null;
  viewMode: 'fit' | 'global' | 'project';
  triggerFit: number;
}) {
  const map = useMap();

  // Invalidate size once map is attached to avoid blank tile render bugs
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (viewMode === 'global') {
      map.flyTo(GLOBAL_DEFAULT_CENTER, GLOBAL_DEFAULT_ZOOM, { duration: 1.2 });
      return;
    }

    if (viewMode === 'project' && selectedProject && isValidCoordinate(selectedProject.latitude, selectedProject.longitude)) {
      const lat = parseFloat(selectedProject.latitude!);
      const lng = parseFloat(selectedProject.longitude!);
      map.flyTo([lat, lng], 10, { duration: 1.2 });
      return;
    }

    // Default 'fit' mode: auto-fit all global exposures
    if (projects.length === 0) {
      map.flyTo(GLOBAL_DEFAULT_CENTER, GLOBAL_DEFAULT_ZOOM, { duration: 1 });
    } else if (projects.length === 1) {
      const lat = parseFloat(projects[0].latitude!);
      const lng = parseFloat(projects[0].longitude!);
      map.flyTo([lat, lng], 8, { duration: 1.2 });
    } else {
      const bounds = L.latLngBounds(
        projects.map((p) => [parseFloat(p.latitude!), parseFloat(p.longitude!)])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [projects, selectedProject, viewMode, triggerFit, map]);

  return null;
}

export default function MapsCharts() {
  const [isMounted, setIsMounted]       = useState(false);
  const [companies, setCompanies]       = useState<Company[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  
  // Interactive view state
  const [viewMode, setViewMode]         = useState<'fit' | 'global' | 'project'>('fit');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [triggerFit, setTriggerFit]     = useState(0);

  const [mapType, setMapType]           = useState<'vector' | 'satellite'>('satellite');

  useEffect(() => {
    setIsMounted(true);
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

  const mappable = useMemo(
    () => companies.filter((c) => isValidCoordinate(c.latitude, c.longitude)),
    [companies]
  );

  const unmappableCount = companies.length - mappable.length;

  const selectedProject = useMemo(
    () => companies.find((c) => c.id === selectedProjectId) || null,
    [companies, selectedProjectId]
  );

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

  const totalCreditsAllProjects = companies.reduce(
    (sum, c) => sum + Math.max(0, availableCredits(c.id)),
    0
  );

  const typeCounts: Record<string, number> = {};
  companies.forEach((c) => {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  });
  const projectTypeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

  const statusBadge = (status: string) => {
    if (status === 'Verified') return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
    if (status === 'Rejected') return 'bg-red-100 text-red-700 border border-red-300';
    return 'bg-amber-100 text-amber-700 border border-amber-300';
  };

  const handleSelectProject = (id: number) => {
    setSelectedProjectId(id);
    setViewMode('project');
  };

  const handleFitAll = () => {
    setSelectedProjectId(null);
    setViewMode('fit');
    setTriggerFit((prev) => prev + 1);
  };

  const handleGlobalView = () => {
    setSelectedProjectId(null);
    setViewMode('global');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            <p className="text-slate-600 font-medium text-sm">Loading global project map &amp; metrics...</p>
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
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Maps &amp; Analytics</h1>
              <p className="text-slate-600 mt-1">
                Real-time geospatial visualization of projects and carbon credit exposure worldwide
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-slate-700">
                  {mappable.length} Mapped Areas
                </span>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {companies.filter((c) => c.status === 'Verified').length} Verified
                </span>
              </div>
              <div className="bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
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

          {/* ─── Project Geospatial Map ─── */}
          <Card className="p-6 mb-8 border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Global Project Exposures
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing {mappable.length} of {companies.length} projects with active GPS coordinates
                </p>
              </div>

              {/* Map View Controls & Legend */}
              <div className="flex items-center flex-wrap gap-2">
                <div className="flex items-center gap-3 text-xs text-slate-600 mr-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Verified
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pending
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span> Rejected
                  </span>
                </div>

                <Button
                  variant={viewMode === 'fit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleFitAll}
                  className="gap-1.5 text-xs h-8"
                  title="Fit all project coordinates into view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fit All Areas
                </Button>

                <Button
                  variant={viewMode === 'global' ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleGlobalView}
                  className="gap-1.5 text-xs h-8"
                  title="Zoom out to world map overview"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Global View
                </Button>
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

            {/* Quick-Jump Project Navigator Bar */}
            {mappable.length > 0 && (
              <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 font-medium whitespace-nowrap">Jump to area:</span>
                {mappable.map((proj) => {
                  const isCur = selectedProjectId === proj.id && viewMode === 'project';
                  return (
                    <button
                      key={proj.id}
                      onClick={() => handleSelectProject(proj.id)}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all font-medium border flex items-center gap-1.5 ${
                        isCur
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          proj.status === 'Verified'
                            ? 'bg-emerald-400'
                            : proj.status === 'Rejected'
                            ? 'bg-rose-400'
                            : 'bg-amber-400'
                        }`}
                      />
                      {proj.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Map Container */}
            {isMounted && (
              <div className="rounded-xl overflow-hidden border border-slate-200 relative shadow-inner" style={{ height: '460px' }}>
                <MapContainer
                  center={GLOBAL_DEFAULT_CENTER}
                  zoom={GLOBAL_DEFAULT_ZOOM}
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                >
                  {/* Dynamic Auto-Fit / Camera Controller */}
                  <MapController
                    projects={mappable}
                    selectedProject={selectedProject}
                    viewMode={viewMode}
                    triggerFit={triggerFit}
                  />

                  {/* OpenStreetMap Tile Layer */}
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                  />
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


                  {/* Project Markers */}
                  {mappable.map((project) => {
                    const lat = parseFloat(project.latitude!);
                    const lng = parseFloat(project.longitude!);
                    const isSelected = selectedProjectId === project.id;
                    const credits = availableCredits(project.id);

                    return (
                      <Marker
                        key={project.id}
                        position={[lat, lng]}
                        icon={createMarkerIcon(project.status, isSelected)}
                        eventHandlers={{
                          click: () => {
                            setSelectedProjectId(project.id);
                            setViewMode('project');
                          },
                        }}
                      >
                        <Popup className="custom-project-popup">
                          <div className="p-1 min-w-[200px] text-slate-800">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${statusBadge(project.status)}`}>
                                {project.status.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID #{project.id}
                              </span>
                            </div>

                            <h3 className="font-bold text-sm text-slate-900 leading-snug mb-1">
                              {project.name}
                            </h3>

                            <p className="text-xs text-slate-500 mb-2">
                              {project.type || 'Blue Carbon Project'}
                            </p>

                            <div className="bg-slate-50 rounded-md p-2 text-xs border border-slate-100 mb-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Available Credits:</span>
                                <span className="font-bold text-primary">
                                  {credits.toLocaleString()} tCO₂e
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] font-mono text-slate-500">
                                <span>Coordinates:</span>
                                <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                              </div>
                              {project.location && (
                                <div className="flex justify-between items-center text-[11px] text-slate-500">
                                  <span>Location:</span>
                                  <span className="truncate max-w-[110px]" title={project.location}>
                                    {project.location}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-7 gap-1"
                                onClick={() => handleSelectProject(project.id)}
                              >
                                <ZoomIn className="w-3 h-3" /> Focus View
                              </Button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            )}

            {unmappableCount > 0 && (
              <p className="text-xs text-amber-600 mt-3 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {unmappableCount} project(s) do not have GPS coordinates assigned and are excluded from the map.
                </span>
              </p>
            )}

            {mappable.length === 0 && (
              <p className="text-xs text-slate-400 mt-3 text-center">
                No projects with GPS coordinates registered yet. Register projects with latitude and longitude to visualize them globally.
              </p>
            )}
          </Card>

          {/* ─── Charts ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Project Type Distribution</h2>
              {projectTypeData.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No projects registered yet.</p>
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

            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Available Credits by Project</h2>
              {creditsByProject.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No transaction records found.</p>
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

