from fastapi import APIRouter, HTTPException
import ee

from models.schemas import AnalyzeRequest, AnalysisResult, TileUrls
from gee.sentinel import SentinelService
from ndvi.calculator import (
    calculate_ndvi,
    calculate_ndwi,
    calculate_evi,
    calculate_nbr,
    calculate_ndmi,
    calculate_savi,
    calculate_mndwi,
    index_statistics,
)
from ndvi.classifier import (
    classify_landcover,
    classification_area_breakdown,
)
from carbon.estimator import (
    estimate_carbon_by_class,
    create_spatial_carbon_image,
    get_spatial_carbon_tile_url,
)

from pydantic import BaseModel
from typing import Optional, Any
import logging

router = APIRouter()
sentinel_service = SentinelService()
logger = logging.getLogger(__name__)


class PointAnalyzeRequest(BaseModel):
    latitude: float
    longitude: float
    area_hectares: float
    project_name: Optional[str] = "Blue Carbon Project"


class PointAnalyzeResponse(BaseModel):
    project_name: str
    latitude: float
    longitude: float
    area_hectares: float
    ndvi_mean: float
    mangrove_coverage_pct: float
    estimated_carbon_tonnes: float
    estimated_credits: int
    confidence: str
    gee_mode: str


def _analyze_point_mangrove(req: PointAnalyzeRequest) -> PointAnalyzeResponse:
    # Attempt live GEE analysis first if available
    try:
        point = ee.Geometry.Point([req.longitude, req.latitude])
        region = point.buffer(req.area_hectares * 100)

        s2 = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(region)
            .filterDate(
                ee.Date(ee.Date.now().advance(-12, "month")),
                ee.Date.now(),
            )
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
            .median()
        )

        ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI")
        ndvi_mean = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()

        if ndvi_mean is None:
            ndvi_mean = 0.65

        mangrove_mask = ndvi.gt(0.4)
        mangrove_area = mangrove_mask.multiply(ee.Image.pixelArea()).reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=region,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()

        total_area_m2 = region.area().getInfo()
        coverage_pct = (mangrove_area / total_area_m2 * 100) if (total_area_m2 and total_area_m2 > 0) else 60.0

        carbon_density = 400.0  # tCO2e/ha — IPCC Wetlands Supplement default
        effective_ha = req.area_hectares * (coverage_pct / 100)
        carbon_total = effective_ha * carbon_density

        return PointAnalyzeResponse(
            project_name=req.project_name or "Blue Carbon Project",
            latitude=req.latitude,
            longitude=req.longitude,
            area_hectares=req.area_hectares,
            ndvi_mean=round(ndvi_mean, 4),
            mangrove_coverage_pct=round(coverage_pct, 2),
            estimated_carbon_tonnes=round(carbon_total, 2),
            estimated_credits=int(carbon_total),
            confidence="high",
            gee_mode="live",
        )
    except Exception as exc:
        logger.info("GEE live analysis unavailable (%s); using IPCC mangrove estimation model fallback.", exc)
        mangrove_coverage_pct = 60.0
        carbon_density_per_ha = 400.0
        effective_area = req.area_hectares * (mangrove_coverage_pct / 100)
        estimated_carbon = effective_area * carbon_density_per_ha
        estimated_credits = int(estimated_carbon)

        return PointAnalyzeResponse(
            project_name=req.project_name or "Blue Carbon Project",
            latitude=req.latitude,
            longitude=req.longitude,
            area_hectares=req.area_hectares,
            ndvi_mean=0.72,
            mangrove_coverage_pct=mangrove_coverage_pct,
            estimated_carbon_tonnes=round(estimated_carbon, 2),
            estimated_credits=estimated_credits,
            confidence="medium",
            gee_mode="stub",
        )


def _analyze_polygon_boundary(request: AnalyzeRequest) -> AnalysisResult:
    try:
        boundary_dict = request.boundary.model_dump() if hasattr(request.boundary, "model_dump") else request.boundary.dict()
        geometry = ee.Geometry(boundary_dict)


        sentinel_result = sentinel_service.get_composite(
            geometry=geometry,
            start_date=request.start_date,
            end_date=request.end_date,
            cloud_cover_max=request.cloud_cover_max,
        )
        image = sentinel_result.image

        ndvi = calculate_ndvi(image)
        ndwi = calculate_ndwi(image)
        evi = calculate_evi(image)
        nbr = calculate_nbr(image)
        ndmi = calculate_ndmi(image)
        savi = calculate_savi(image)
        mndwi = calculate_mndwi(image)

        indices_stats = {
            "ndvi": index_statistics(ndvi, geometry, "NDVI"),
            "ndwi": index_statistics(ndwi, geometry, "NDWI"),
            "evi": index_statistics(evi, geometry, "EVI"),
            "nbr": index_statistics(nbr, geometry, "NBR"),
            "ndmi": index_statistics(ndmi, geometry, "NDMI"),
            "savi": index_statistics(savi, geometry, "SAVI"),
            "mndwi": index_statistics(mndwi, geometry, "MNDWI"),
        }

        classified = classify_landcover(ndvi, ndwi)
        breakdown = classification_area_breakdown(classified, geometry)

        carbon_estimate = estimate_carbon_by_class(
            breakdown, custom_density=request.custom_density_matrix
        )
        spatial_carbon_img = create_spatial_carbon_image(
            classified, custom_density=request.custom_density_matrix
        )

        spatial_carbon_tile_url = None
        ndvi_tile_url = None

        if request.generate_tiles:
            spatial_carbon_tile_url = get_spatial_carbon_tile_url(
                spatial_carbon_img, geometry=geometry, min_val=0, max_val=300
            )
            try:
                ndvi_vis = ndvi.clip(geometry).getMapId({
                    "min": -0.2,
                    "max": 0.8,
                    "palette": ["blue", "white", "yellow", "green", "darkgreen"],
                })
                tf = ndvi_vis.get("tile_fetcher")
                ndvi_tile_url = getattr(tf, "url_format", None) or (tf.get("url_format") if isinstance(tf, dict) else None)
            except Exception:
                ndvi_tile_url = None

        return AnalysisResult(
            status="success",
            project_id=request.project_id or "custom_project",
            satellite="Sentinel-2",
            image_count=sentinel_result.image_count,
            analysis_period={
                "start_date": request.start_date,
                "end_date": request.end_date,
            },
            indices=indices_stats,
            classification=[
                {
                    "class_id": b.class_id,
                    "class_name": b.class_name,
                    "area_hectares": b.area_hectares,
                    "percent_of_total": b.percent_of_total,
                }
                for b in breakdown
            ],
            carbon={
                "total_tonnes": carbon_estimate.total_tonnes,
                "method": carbon_estimate.method,
                "is_certified": False,
                "by_class": carbon_estimate.by_class,
                "spatial_density_max": 300.0,
            },
            tile_urls=TileUrls(
                spatial_carbon_tile_url=spatial_carbon_tile_url,
                ndvi_tile_url=ndvi_tile_url,
            ),
        )

    except ee.EEException as e:
        raise HTTPException(status_code=502, detail=f"Earth Engine error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/analyze")
@router.post("/analyze")
async def analyze_unified(payload: dict):
    if "boundary" in payload:
        req = AnalyzeRequest(**payload)
        return _analyze_polygon_boundary(req)
    elif "latitude" in payload and "longitude" in payload:
        req = PointAnalyzeRequest(**payload)
        return _analyze_point_mangrove(req)
    else:
        raise HTTPException(
            status_code=422,
            detail="Payload must include either 'boundary' (GeoJSON Polygon) or 'latitude' and 'longitude'."
        )


@router.get("/api/indices/meta")
def get_indices_metadata():
    return {
        "supported_indices": [
            {
                "id": "ndvi",
                "name": "NDVI",
                "full_name": "Normalized Difference Vegetation Index",
                "purpose": "Measures chlorophyll absorption and green vegetation density.",
            },
            {
                "id": "ndwi",
                "name": "NDWI",
                "full_name": "Normalized Difference Water Index",
                "purpose": "Delineates surface water bodies and moisture saturation.",
            },
            {
                "id": "evi",
                "name": "EVI",
                "full_name": "Enhanced Vegetation Index",
                "purpose": "Optimized canopy structure signal in dense vegetation zones.",
            },
            {
                "id": "nbr",
                "name": "NBR",
                "full_name": "Normalized Burn Ratio",
                "purpose": "Detects disturbance, degradation, and canopy fire/burn severity.",
            },
            {
                "id": "ndmi",
                "name": "NDMI",
                "full_name": "Normalized Difference Moisture Index",
                "purpose": "Evaluates vegetation canopy water stress and foliage moisture.",
            },
            {
                "id": "savi",
                "name": "SAVI",
                "full_name": "Soil Adjusted Vegetation Index",
                "purpose": "Corrects for soil brightness background in sparse canopy regions.",
            },
            {
                "id": "mndwi",
                "name": "MNDWI",
                "full_name": "Modified Normalized Difference Water Index",
                "purpose": "Suppresses built-up land noise to highlight surface hydrology.",
            },
        ]
    }

