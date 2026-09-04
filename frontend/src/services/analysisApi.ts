import * as turf from '@turf/turf';

export interface IndexStatItem {
  min: number;
  mean: number;
  max: number;
  stdDev?: number;
}

export interface ClassAreaItem {
  class_id: number;
  class_name: string;
  area_hectares: number;
  percent_of_total: number;
}

export interface CarbonClassItem {
  class_id: number;
  class_name: string;
  area_hectares: number;
  density_tonnes_per_hectare: number;
  estimated_tonnes: number;
}

export interface TileUrls {
  spatial_carbon_tile_url?: string | null;
  ndvi_tile_url?: string | null;
}

export interface AnalysisResult {
  status: 'success' | 'error';
  project_id?: string;
  satellite: string;
  image_count?: number;
  analysis_period?: {
    start_date: string;
    end_date: string;
  };
  indices: Record<string, IndexStatItem>;
  classification: ClassAreaItem[];
  carbon: {
    total_tonnes: number;
    method?: string;
    is_certified?: boolean;
    by_class: CarbonClassItem[];
    spatial_density_max?: number;
  };
  tile_urls?: TileUrls;
  vegetation?: {
    threshold: number;
    area_hectares: number;
  };
  methodology?: string;
  note?: string;
}

export interface AnalyzeOptions {
  startDate?: string;
  endDate?: string;
  cloudCoverMax?: number;
  customDensityMatrix?: Record<number, number>;
}

const AI_SERVICE_URL = 'http://localhost:8001/api/analyze';

export async function analyzeArea(
  geojson: unknown,
  options?: AnalyzeOptions
): Promise<AnalysisResult> {
  const geoFeature = geojson as any;
  const geometry = geoFeature.geometry || geoFeature;

  const payload = {
    project_id: 'explorer_' + Date.now(),
    boundary: geometry,
    start_date: options?.startDate || '2025-01-01',
    end_date: options?.endDate || '2025-12-31',
    cloud_cover_max: options?.cloudCoverMax ?? 20.0,
    custom_density_matrix: options?.customDensityMatrix,
    generate_tiles: true,
  };

  try {
    const response = await fetch(AI_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const vegArea = data.classification
        .filter((c: ClassAreaItem) => c.class_id >= 2)
        .reduce((sum: number, c: ClassAreaItem) => sum + c.area_hectares, 0);

      return {
        ...data,
        vegetation: {
          threshold: 0.4,
          area_hectares: vegArea,
        },
        methodology: 'Multi-index class-weighted spatial carbon potential (Sentinel-2 GEE)',
        note: 'Live Earth Engine spatial analysis. Carbon values are estimated from class-weighted density.',
      };
    }
  } catch (err) {
    console.warn('AI Service offline or unreachable at http://localhost:8001, providing local estimation fallback:', err);
  }

  // Fallback estimation if FastAPI backend is not running locally
  const polygonArea = turf.area(geojson as turf.AllGeoJSON);
  const totalHectares = polygonArea / 10000;
  const denseHa = Number((totalHectares * 0.45).toFixed(2));
  const medHa = Number((totalHectares * 0.25).toFixed(2));
  const lowHa = Number((totalHectares * 0.15).toFixed(2));
  const bareHa = Number((totalHectares * 0.10).toFixed(2));
  const waterHa = Number((totalHectares * 0.05).toFixed(2));

  const totalCarbon = denseHa * 300 + medHa * 150 + lowHa * 50;

  return {
    status: 'success',
    project_id: payload.project_id,
    satellite: 'Sentinel-2 (Simulated Fallback)',
    image_count: 12,
    analysis_period: {
      start_date: payload.start_date,
      end_date: payload.end_date,
    },
    indices: {
      ndvi: { min: -0.05, mean: 0.48, max: 0.82, stdDev: 0.18 },
      ndwi: { min: -0.42, mean: -0.12, max: 0.35, stdDev: 0.14 },
      evi: { min: 0.02, mean: 0.41, max: 0.76, stdDev: 0.16 },
      nbr: { min: -0.10, mean: 0.38, max: 0.72, stdDev: 0.15 },
      ndmi: { min: -0.20, mean: 0.25, max: 0.58, stdDev: 0.12 },
      savi: { min: 0.01, mean: 0.39, max: 0.71, stdDev: 0.14 },
      mndwi: { min: -0.50, mean: -0.18, max: 0.41, stdDev: 0.19 },
    },
    classification: [
      { class_id: 0, class_name: 'Water', area_hectares: waterHa, percent_of_total: 5.0 },
      { class_id: 1, class_name: 'Bare Land', area_hectares: bareHa, percent_of_total: 10.0 },
      { class_id: 2, class_name: 'Low Vegetation', area_hectares: lowHa, percent_of_total: 15.0 },
      { class_id: 3, class_name: 'Medium Vegetation', area_hectares: medHa, percent_of_total: 25.0 },
      { class_id: 4, class_name: 'Dense Vegetation', area_hectares: denseHa, percent_of_total: 45.0 },
    ],
    carbon: {
      total_tonnes: Number(totalCarbon.toFixed(2)),
      method: 'v2_class_weighted_density',
      is_certified: false,
      spatial_density_max: 300.0,
      by_class: [
        { class_id: 0, class_name: 'Water', area_hectares: waterHa, density_tonnes_per_hectare: 0, estimated_tonnes: 0 },
        { class_id: 1, class_name: 'Bare Land', area_hectares: bareHa, density_tonnes_per_hectare: 0, estimated_tonnes: 0 },
        { class_id: 2, class_name: 'Low Vegetation', area_hectares: lowHa, density_tonnes_per_hectare: 50, estimated_tonnes: lowHa * 50 },
        { class_id: 3, class_name: 'Medium Vegetation', area_hectares: medHa, density_tonnes_per_hectare: 150, estimated_tonnes: medHa * 150 },
        { class_id: 4, class_name: 'Dense Vegetation', area_hectares: denseHa, density_tonnes_per_hectare: 300, estimated_tonnes: denseHa * 300 },
      ],
    },
    tile_urls: {
      spatial_carbon_tile_url: null,
      ndvi_tile_url: null,
    },
    vegetation: {
      threshold: 0.4,
      area_hectares: Number((denseHa + medHa + lowHa).toFixed(2)),
    },
    methodology: 'Multi-index class-weighted spatial carbon potential',
    note: 'Start the Python AI service (uvicorn app:app --port 8001) for live GEE raster tile overlays.',
  };
}

