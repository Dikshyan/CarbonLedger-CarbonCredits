import { useMemo, useState, useEffect } from 'react';
import { MapContainer, Polygon, TileLayer, CircleMarker, Tooltip, useMapEvents, useMap } from 'react-leaflet';


import { area as turfArea } from '@turf/turf';
import type { Feature, Polygon as GeoPolygon } from 'geojson';
import 'leaflet/dist/leaflet.css';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { analyzeArea, type AnalysisResult, type IndexStatItem } from '@/services/analysisApi';

type GeoPoint = [number, number];
type LocationPreset = {
  label: string;
  center: [number, number];
  zoom: number;
};

type ActiveLayer = 'base' | 'satellite' | 'nasa_daily' | 'carbon_heatmap' | 'ndvi_overlay';

const locationPresets: LocationPreset[] = [
  { label: 'Sundarbans', center: [21.9497, 88.932], zoom: 9 },
  { label: 'Mumbai Coast', center: [19.076, 72.8777], zoom: 9 },
  { label: 'Western Ghats', center: [10.1632, 77.0607], zoom: 9 },
  { label: 'Bengaluru', center: [12.9716, 77.5946], zoom: 10 },
  { label: 'Delhi NCR', center: [28.7041, 77.1025], zoom: 10 },
  { label: 'Kolkata', center: [22.5726, 88.3639], zoom: 10 },
  { label: 'Amazon Basin', center: [-3.4653, -62.2159], zoom: 6 },
];

const INDEX_LABELS: Record<string, { name: string; full: string; desc: string }> = {
  ndvi: { name: 'NDVI', full: 'Normalized Difference Vegetation Index', desc: 'Canopy chlorophyll & green vegetation density' },
  ndwi: { name: 'NDWI', full: 'Normalized Difference Water Index', desc: 'Surface water & wetness saturation' },
  evi: { name: 'EVI', full: 'Enhanced Vegetation Index', desc: 'Canopy structure in high-density vegetation' },
  nbr: { name: 'NBR', full: 'Normalized Burn Ratio', desc: 'Disturbance, degradation & burn severity' },
  ndmi: { name: 'NDMI', full: 'Normalized Difference Moisture Index', desc: 'Foliage & canopy water stress' },
  savi: { name: 'SAVI', full: 'Soil Adjusted Vegetation Index', desc: 'Corrected for soil background brightness' },
  mndwi: { name: 'MNDWI', full: 'Modified NDWI', desc: 'Enhanced water surface extraction' },
};

const formatAreaKm = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '0.00';
  return value >= 100 ? value.toFixed(1) : value.toFixed(2);
};

const formatAreaHa = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
};

const polygonToGeoJSON = (points: GeoPoint[]): Feature<GeoPolygon> | null => {
  if (points.length < 3) return null;

  const closed = [...points];
  const first = closed[0];
  const last = closed[closed.length - 1];

  if (first[0] !== last[0] || first[1] !== last[1]) {
    closed.push(first);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [closed],
    },
  } as Feature<GeoPolygon>;
};

function AreaMapHandler({
  isDrawing,
  onPointAdd,
}: {
  isDrawing: boolean;
  onPointAdd: (point: GeoPoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (!isDrawing) return;
      onPointAdd([event.latlng.lng, event.latlng.lat]);
    },
  });

  return null;
}

function MapViewController({
  flyToTarget,
}: {
  flyToTarget: { location: LocationPreset; id: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (flyToTarget) {
      map.flyTo(flyToTarget.location.center, flyToTarget.location.zoom, {
        duration: 1.4,
        easeLinearity: 0.25,
      });
    }
  }, [flyToTarget, map]);

  return null;
}

export default function AIExplorer() {
  const [selectedLocation, setSelectedLocation] = useState('Sundarbans');
  const [flyToTarget, setFlyToTarget] = useState<{ location: LocationPreset; id: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState<GeoPoint[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Interactive controls
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>('base');
  const [selectedIdx, setSelectedIdx] = useState<string>('ndvi');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  const [cloudCoverMax, setCloudCoverMax] = useState(20);

  const nasaTodayDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const polygon = useMemo(() => polygonToGeoJSON(drawnPoints), [drawnPoints]);

  const mapPolygon = useMemo(
    () => drawnPoints.map(([lng, lat]) => [lat, lng] as [number, number]),
    [drawnPoints],
  );

  const areaSquareKm = useMemo(() => {
    if (!polygon) return null;
    return turfArea(polygon) / 1_000_000;
  }, [polygon]);

  const areaHectares = useMemo(() => {
    if (!polygon) return null;
    return turfArea(polygon) / 10_000;
  }, [polygon]);

  const handlePointAdd = (point: GeoPoint) => {
    setDrawnPoints((prev) => [...prev, point]);
  };

  const flyToLocation = (location: LocationPreset) => {
    setSelectedLocation(location.label);
    setFlyToTarget({ location, id: Date.now() });
  };

  const handleResetMap = () => {
    setDrawnPoints([]);
    setIsDrawing(false);
    setError('');
    setAnalysis(null);
    setActiveLayer('base');
    setSelectedIdx('ndvi');
    const defaultLoc = locationPresets[0];
    setSelectedLocation(defaultLoc.label);
    flyToLocation(defaultLoc);
  };

  const handleSelectArea = () => {
    setError('');
    setIsDrawing(true);
  };

  const handleFinishArea = () => {
    if (drawnPoints.length < 3) {
      setError('Please add at least three points to define an area.');
      return;
    }

    setIsDrawing(false);
    setError('');
  };

  const handleClearArea = () => {
    setDrawnPoints([]);
    setIsDrawing(false);
    setError('');
    setAnalysis(null);
  };


  const handleAnalyze = async () => {
    if (!polygon) {
      setError('Please draw a polygon before analyzing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await analyzeArea(polygon, {
        startDate,
        endDate,
        cloudCoverMax,
      });
      setAnalysis(result);
      if (result.tile_urls?.spatial_carbon_tile_url) {
        setActiveLayer('carbon_heatmap');
      }
    } catch (err) {
      console.error(err);
      setError("CarbonLedger couldn't analyze this area right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasPolygon = drawnPoints.length >= 3;

  return (
    <div className="relative z-0 min-h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-950 text-slate-900">
      <MapContainer
        center={locationPresets[0].center}
        zoom={locationPresets[0].zoom}
        scrollWheelZoom
        className="relative z-0 h-[calc(100vh-4rem)] w-full"
      >
        {activeLayer === 'satellite' ? (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {/* NASA GIBS Daily Real-Time True Color Satellite & Cloud Overlay */}
        {activeLayer === 'nasa_daily' && (
          <TileLayer
            attribution="NASA Global Imagery Browse Services (GIBS) - Daily True Color & Cloud Coverage Feed"
            url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${nasaTodayDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
            maxNativeZoom={9}
          />
        )}

        {/* Live Earth Engine Spatial Carbon Potential Heatmap Overlay */}
        {activeLayer === 'carbon_heatmap' && analysis?.tile_urls?.spatial_carbon_tile_url && (
          <TileLayer
            url={analysis.tile_urls.spatial_carbon_tile_url}
            opacity={0.75}
            attribution="Google Earth Engine - Spatial Carbon Density"
          />
        )}

        {/* Live Earth Engine NDVI Overlay */}
        {activeLayer === 'ndvi_overlay' && analysis?.tile_urls?.ndvi_tile_url && (
          <TileLayer
            url={analysis.tile_urls.ndvi_tile_url}
            opacity={0.75}
            attribution="Google Earth Engine - Sentinel-2 NDVI"
          />
        )}


        {hasPolygon && (
          <Polygon
            positions={mapPolygon}
            pathOptions={{ color: '#10b981', fillColor: '#34d399', fillOpacity: 0.22, weight: 2.5 }}
          />
        )}

        {/* Clicked Boundary Point Markers */}
        {drawnPoints.map(([lng, lat], index) => (
          <CircleMarker
            key={`point-${index}-${lat}-${lng}`}
            center={[lat, lng]}
            radius={6}
            pathOptions={{
              color: '#ffffff',
              fillColor: '#10b981',
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -6]}
              className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-700 shadow-md"
            >
              P{index + 1}
            </Tooltip>
          </CircleMarker>
        ))}

        <AreaMapHandler isDrawing={isDrawing} onPointAdd={handlePointAdd} />
        <MapViewController flyToTarget={flyToTarget} />

      </MapContainer>

      <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-slate-950/15 via-transparent to-slate-950/30" />

      {/* Top Left: Location Picker */}
      <div className="absolute left-4 top-4 z-40 w-[min(24rem,calc(100%-2rem))] rounded-2xl border border-white/20 bg-white/90 p-3 shadow-xl backdrop-blur-md">
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Location Preset
        </label>
        <div className="flex gap-2">
          <select
            aria-label="Search a location"
            value={selectedLocation}
            onChange={(event) => {
              const match = locationPresets.find((location) => location.label === event.target.value);
              if (match) {
                flyToLocation(match);
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 focus:border-emerald-500"
          >
            {locationPresets.map((location) => (
              <option key={location.label} value={location.label}>
                {location.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top Left below Search: AI Explorer Controls */}
      <div className="absolute left-4 top-28 z-40 w-[min(22rem,calc(100%-2rem))] rounded-2xl border border-emerald-200 bg-[#f1fbf8]/95 p-4 shadow-xl backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Interactive Environmental Analysis
        </p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">
          Multi-Index & Spatial Carbon Explorer
        </h1>

        <div className="mt-3 space-y-2 text-xs text-slate-600">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-slate-500">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-800"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] font-semibold uppercase text-slate-500">
              <span>Max Cloud Cover</span>
              <span className="text-emerald-700">{cloudCoverMax}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              value={cloudCoverMax}
              onChange={(e) => setCloudCoverMax(Number(e.target.value))}
              className="mt-1 w-full accent-emerald-600"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleSelectArea} className="bg-emerald-600 text-white hover:bg-emerald-700">
            {drawnPoints.length === 0 ? 'Select Area' : 'Add Points'}
          </Button>
          {drawnPoints.length > 0 && (
            <Button variant="outline" onClick={() => setIsDrawing(true)}>
              Edit Area
            </Button>
          )}
          {drawnPoints.length >= 3 && (
            <Button variant="outline" onClick={handleFinishArea}>
              Finish Area
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleResetMap}
            className="flex items-center gap-1 text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Map
          </Button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {isDrawing ? 'Click the map to add polygon boundary points.' : 'Ready to analyze environmental metrics.'}
        </p>
      </div>

      {/* Floating Map Layer Selector (Top Right) */}
      <div className="absolute right-5 top-4 z-40 rounded-2xl border border-white/20 bg-slate-900/90 p-2 shadow-xl backdrop-blur-md text-white text-xs">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Map Visual Overlay</p>
        <div className="mt-1 flex flex-col gap-1">
          <button
            onClick={() => setActiveLayer('base')}
            className={`rounded-lg px-3 py-1.5 text-left font-medium transition ${activeLayer === 'base' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            Standard Base
          </button>
          <button
            onClick={() => setActiveLayer('satellite')}
            className={`rounded-lg px-3 py-1.5 text-left font-medium transition flex items-center justify-between ${activeLayer === 'satellite' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <span>Clear Base Satellite Feed</span>
            <span className="ml-2 rounded bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-sky-300">Base</span>
          </button>
          <button
            onClick={() => setActiveLayer('nasa_daily')}
            className={`rounded-lg px-3 py-1.5 text-left font-medium transition flex items-center justify-between ${activeLayer === 'nasa_daily' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <span>NASA Daily Satellite & Cloud Feed</span>
            <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">Daily Cloud</span>
          </button>

          <button
            onClick={() => {
              if (!analysis?.tile_urls?.spatial_carbon_tile_url) {
                setError('Please draw an area and click "Compute Multi-Index Analysis" first to view spatial carbon tiles.');
                return;
              }
              setActiveLayer('carbon_heatmap');
            }}
            className={`rounded-lg px-3 py-1.5 text-left font-medium transition flex items-center justify-between ${activeLayer === 'carbon_heatmap' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <span>Spatial Carbon Heatmap</span>
            {!analysis?.tile_urls?.spatial_carbon_tile_url && (
              <span className="ml-2 text-[9px] text-slate-400 italic">Analysis required</span>
            )}
          </button>
          <button
            onClick={() => {
              if (!analysis?.tile_urls?.ndvi_tile_url) {
                setError('Please draw an area and click "Compute Multi-Index Analysis" first to view NDVI raster tiles.');
                return;
              }
              setActiveLayer('ndvi_overlay');
            }}
            className={`rounded-lg px-3 py-1.5 text-left font-medium transition flex items-center justify-between ${activeLayer === 'ndvi_overlay' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
          >
            <span>NDVI Density Raster</span>
            {!analysis?.tile_urls?.ndvi_tile_url && (
              <span className="ml-2 text-[9px] text-slate-400 italic">Analysis required</span>
            )}
          </button>
        </div>

        <div className="mt-2 pt-1.5 border-t border-slate-800">
          <button
            onClick={handleResetMap}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition font-medium text-[11px]"
          >
            <RotateCcw className="h-3 w-3" /> Reset Map View
          </button>
        </div>
      </div>

      {/* Selected Area Card (Bottom Right) */}
      {hasPolygon && (
        <div className="absolute bottom-6 right-5 z-40 w-[min(21rem,calc(100%-2rem))] rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Geometry defined
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Selected Area</h2>

          <div className="mt-3 space-y-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Total Area</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatAreaKm(areaSquareKm)} km²</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Hectares</p>
                <p className="mt-1 font-semibold text-slate-900">{formatAreaHa(areaHectares)} ha</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Satellite</p>
                <p className="mt-1 font-semibold text-slate-900">Sentinel-2</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsDrawing(true)}>
                Edit
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleClearArea}>
                Clear
              </Button>
              <Button variant="outline" className="flex-1 text-slate-700" onClick={handleResetMap}>
                Reset
              </Button>
            </div>


            <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 font-semibold" onClick={handleAnalyze} disabled={loading}>
              {loading ? 'Analyzing Earth Engine...' : 'Compute Multi-Index Analysis'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-6 left-1/2 z-50 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          {error}
        </div>
      )}

      {/* Comprehensive Analysis Dashboard (Bottom Left Overlay) */}
      {analysis && (
        <div className="absolute bottom-6 left-4 z-40 max-h-[calc(100vh-14rem)] w-[min(26rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Analysis Results
            </p>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                {analysis.satellite}
              </span>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800" title={`Analyzed ${analysis.image_count ?? 0} cloud-filtered satellite scenes`}>
                {analysis.image_count ?? 0} Clear Scenes
              </span>
            </div>
          </div>

          <h3 className="mt-1 text-xl font-bold text-slate-900">Environmental Dashboard</h3>

          {/* Key Metrics Grid */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Vegetation Area</p>
              <p className="mt-1 text-base font-bold text-slate-900">
                {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(analysis.vegetation?.area_hectares || 0)} ha
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-emerald-50/80 p-2.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-700">Total Carbon Stock</p>
              <p className="mt-1 text-base font-bold text-emerald-900">
                {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(analysis.carbon.total_tonnes)} t
              </p>
            </div>
          </div>

          {/* Multi-Index Suite Viewer */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Multi-Index Spectral Suite
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Object.keys(analysis.indices).map((idxKey) => (
                <button
                  key={idxKey}
                  onClick={() => setSelectedIdx(idxKey)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${selectedIdx === idxKey
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {idxKey.toUpperCase()}
                </button>
              ))}
            </div>

            {analysis.indices[selectedIdx] && (
              <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-slate-900">
                    {INDEX_LABELS[selectedIdx]?.full || selectedIdx.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500">{selectedIdx.toUpperCase()}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {INDEX_LABELS[selectedIdx]?.desc}
                </p>

                <div className="mt-2 grid grid-cols-4 gap-1 text-center font-mono text-[11px]">
                  <div className="rounded bg-white p-1 border">
                    <span className="block text-[9px] text-slate-400">MIN</span>
                    <span className="font-bold text-slate-800">{analysis.indices[selectedIdx].min}</span>
                  </div>
                  <div className="rounded bg-emerald-100 p-1 border border-emerald-200">
                    <span className="block text-[9px] text-emerald-700 font-sans">MEAN</span>
                    <span className="font-bold text-emerald-900">{analysis.indices[selectedIdx].mean}</span>
                  </div>
                  <div className="rounded bg-white p-1 border">
                    <span className="block text-[9px] text-slate-400">MAX</span>
                    <span className="font-bold text-slate-800">{analysis.indices[selectedIdx].max}</span>
                  </div>
                  <div className="rounded bg-white p-1 border">
                    <span className="block text-[9px] text-slate-400">STD</span>
                    <span className="font-bold text-slate-800">{analysis.indices[selectedIdx].stdDev ?? '0.00'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Per-Class Spatial Carbon Breakdown */}
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Spatial Carbon Breakdown by Class
            </p>
            <div className="mt-2 space-y-1.5 text-xs">
              {analysis.carbon.by_class.map((item) => (
                <div key={item.class_id} className="rounded-xl border border-slate-200 bg-white p-2 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">{item.class_name}</span>
                    <span className="ml-2 text-[10px] text-slate-500">({item.density_tonnes_per_hectare} t/ha)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700">{new Intl.NumberFormat('en-IN').format(item.estimated_tonnes)} t</span>
                    <span className="block text-[10px] text-slate-400">{item.area_hectares} ha</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spatial Heatmap Legend */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-900 p-3 text-white text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Spatial Carbon Heatmap Palette
            </p>
            <div className="mt-2 h-2.5 w-full rounded-full bg-gradient-to-r from-yellow-200 via-emerald-400 to-emerald-900" />
            <div className="mt-1 flex justify-between text-[10px] text-slate-300">
              <span>0 t/ha (Water/Bare)</span>
              <span>150 t/ha (Medium)</span>
              <span>300+ t/ha (Dense)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

