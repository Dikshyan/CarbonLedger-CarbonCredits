from fastapi import APIRouter, HTTPException
import ee

from models.schemas import (
    AnalyzeRequest, AnalysisResult, TileUrls,
    ProjectDataExtractionRequest, ProjectDataExtractionResponse,
)
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

router = APIRouter()
sentinel_service = SentinelService()


@router.post("/api/analyze", response_model=AnalysisResult)
def analyze_area(request: AnalyzeRequest) -> AnalysisResult:
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


@router.post("/api/extract-project-data", response_model=ProjectDataExtractionResponse)
def extract_project_data(req: ProjectDataExtractionRequest) -> ProjectDataExtractionResponse:
    loc = req.location_label or "Coastal Blue Zone"
    area = req.area_hectares or 500.0
    carbon = req.total_carbon_tonnes or (area * 240.0)
    ndvi = req.mean_ndvi or 0.52
    lat = req.latitude or 21.9497
    lon = req.longitude or 88.9320

    project_name = req.project_name or f"{loc} Blue Carbon & Coastal Restoration"

    scope = (
        f"Comprehensive conservation, hydrological restoration, and blue carbon sequestration across "
        f"{area:,.1f} hectares in the {loc} coastal ecosystem. The project deploys satellite-guided "
        f"remote sensing (Sentinel-2 multi-spectral NDVI/NDWI) combined with community-led nursery "
        f"propagation to rehabilitate degraded mangrove fringes, preserve existing dense vegetation, "
        f"and protect intertidal wetlands from erosion."
    )

    objectives = (
        f"1. Carbon Sequestration: Capture and store an estimated {carbon:,.0f} tCO₂e in aboveground biomass and tidal sediment sinks.\n"
        f"2. Canopy Regeneration: Restore and actively monitor {area:,.0f} hectares of coastal mangrove and wetland habitats.\n"
        f"3. Continuous MRV Compliance: Implement periodic multi-spectral satellite audits (NDVI/EVI indices) paired with independent field verifications.\n"
        f"4. Climate Resilience: Enhance coastal storm-surge barriers and establish sustainable economic livelihoods for adjacent coastal communities."
    )

    restoration_cost = area * 1250.0
    mrv_cost = 25000.0 + (area * 25.0)
    community_stewardship = (restoration_cost + mrv_cost) * 0.10
    total_budget = restoration_cost + mrv_cost + community_stewardship
    estimated_budget = f"${total_budget:,.0f} USD (Restoration: ${restoration_cost:,.0f}, MRV & Verification: ${mrv_cost:,.0f}, Community Stewardship: ${community_stewardship:,.0f})"

    target_demographics = (
        f"Coastal artisanal fishing communities, local indigenous wetland collectives, "
        f"mangrove forestry self-help groups (SHGs), and youth climate monitoring stewards in the "
        f"{loc} region vulnerable to cyclones and tidal erosion."
    )

    description = (
        f"Multi-spectral satellite baseline analysis performed via Sentinel-2 imagery. Estimated vegetation "
        f"canopy health reflects a mean NDVI of {ndvi:.2f}. The area supports a total estimated blue carbon "
        f"biomass of {carbon:,.0f} tonnes CO₂e with high soil organic carbon retention potential. Verification "
        f"protocol is aligned with Verra VM0033 / Plan Vivo coastal wetland standards."
    )

    return ProjectDataExtractionResponse(
        project_name=project_name,
        location=loc,
        latitude=lat,
        longitude=lon,
        estimated_area_hectares=area,
        expected_carbon_sequestration=carbon,
        project_scope=scope,
        objectives=objectives,
        estimated_budget=estimated_budget,
        target_demographics=target_demographics,
        description=description,
    )


