"""
CarbonLedger AI Service — FastAPI stub
Port: 8001

Provides satellite-based carbon estimation using Google Earth Engine.
Currently a functional stub; GEE integration requires a service account key.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="CarbonLedger AI Service",
    description="Blue Carbon MRV — Satellite Analysis via Google Earth Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEE_AVAILABLE = False
try:
    import ee
    service_account = os.getenv("GEE_SERVICE_ACCOUNT")
    key_file = os.getenv("GEE_KEY_FILE")
    if service_account and key_file and os.path.exists(key_file):
        credentials = ee.ServiceAccountCredentials(service_account, key_file)
        ee.Initialize(credentials)
        GEE_AVAILABLE = True
        print("[INFO] Google Earth Engine initialized successfully")
    else:
        print("[INFO] GEE credentials not configured - running in stub mode")
except ImportError:
    print("[INFO] earthengine-api not installed - running in stub mode")
except Exception as e:
    print(f"[WARN] GEE init failed: {e} - running in stub mode")


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    latitude: float
    longitude: float
    area_hectares: float
    project_name: Optional[str] = "Unknown"


class AnalyzeResponse(BaseModel):
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


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    gee_available: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Health check endpoint — verify the service is running."""
    return {
        "status": "ok",
        "service": "carbonledger-ai",
        "version": "1.0.0",
        "gee_available": GEE_AVAILABLE,
    }


@app.post("/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
def analyze_project(req: AnalyzeRequest):
    """
    Estimate carbon sequestration for a given project area.

    When GEE is available: fetches Sentinel-2 NDVI → mangrove detection → carbon model.
    When in stub mode: returns estimated values based on input area.
    """
    if GEE_AVAILABLE:
        return _analyze_with_gee(req)
    else:
        return _analyze_stub(req)


def _analyze_stub(req: AnalyzeRequest) -> dict:
    """
    Stub analysis using published mangrove carbon density averages.
    Blue carbon mangroves: ~400 tCO2e/ha (IPCC Wetlands Supplement 2014)
    """
    # Simplified model: assume 60% mangrove coverage, 400 tCO2e/ha
    mangrove_coverage_pct = 60.0
    carbon_density_per_ha = 400.0  # tCO2e/ha
    effective_area = req.area_hectares * (mangrove_coverage_pct / 100)
    estimated_carbon = effective_area * carbon_density_per_ha
    estimated_credits = int(estimated_carbon)  # 1 credit = 1 tCO2e

    return {
        "project_name": req.project_name,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "area_hectares": req.area_hectares,
        "ndvi_mean": 0.72,  # typical healthy mangrove NDVI
        "mangrove_coverage_pct": mangrove_coverage_pct,
        "estimated_carbon_tonnes": round(estimated_carbon, 2),
        "estimated_credits": estimated_credits,
        "confidence": "medium",
        "gee_mode": "stub",
    }


def _analyze_with_gee(req: AnalyzeRequest) -> dict:
    """Real GEE analysis using Sentinel-2 NDVI and mangrove classification."""
    import ee
    try:
        point = ee.Geometry.Point([req.longitude, req.latitude])
        region = point.buffer(req.area_hectares * 100)  # rough buffer in meters

        # Sentinel-2 SR, cloud-filtered, last 12 months
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

        # NDVI: (NIR - Red) / (NIR + Red) — Sentinel-2 bands B8, B4
        ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI")
        ndvi_mean = ndvi.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()

        if ndvi_mean is None:
            ndvi_mean = 0.65

        # Mangrove proxy: NDVI > 0.4 classified as mangrove
        mangrove_mask = ndvi.gt(0.4)
        mangrove_area = mangrove_mask.multiply(ee.Image.pixelArea()).reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=region,
            scale=10,
            maxPixels=1e9,
        ).get("NDVI").getInfo()

        total_area_m2 = region.area().getInfo()
        coverage_pct = (mangrove_area / total_area_m2 * 100) if total_area_m2 > 0 else 0

        carbon_density = 400.0  # tCO2e/ha — IPCC Wetlands Supplement default
        effective_ha = req.area_hectares * (coverage_pct / 100)
        carbon_total = effective_ha * carbon_density

        return {
            "project_name": req.project_name,
            "latitude": req.latitude,
            "longitude": req.longitude,
            "area_hectares": req.area_hectares,
            "ndvi_mean": round(ndvi_mean, 4),
            "mangrove_coverage_pct": round(coverage_pct, 2),
            "estimated_carbon_tonnes": round(carbon_total, 2),
            "estimated_credits": int(carbon_total),
            "confidence": "high",
            "gee_mode": "live",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GEE analysis failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
