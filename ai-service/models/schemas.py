from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any


class PolygonBoundary(BaseModel):
    type: str = Field(default="Polygon")
    coordinates: list



class AnalyzeRequest(BaseModel):
    project_id: Optional[str] = "custom_project"
    boundary: PolygonBoundary
    start_date: Optional[str] = "2025-01-01"
    end_date: Optional[str] = "2025-12-31"
    cloud_cover_max: Optional[float] = 20.0
    custom_density_matrix: Optional[Dict[int, float]] = None
    generate_tiles: Optional[bool] = True


class IndexStats(BaseModel):
    min: float
    mean: float
    max: float
    stdDev: Optional[float] = 0.0


class ClassAreaItem(BaseModel):
    class_id: int
    class_name: str
    area_hectares: float
    percent_of_total: float


class CarbonClassItem(BaseModel):
    class_id: int
    class_name: str
    area_hectares: float
    density_tonnes_per_hectare: float
    estimated_tonnes: float


class TileUrls(BaseModel):
    spatial_carbon_tile_url: Optional[str] = None
    ndvi_tile_url: Optional[str] = None


class CarbonResult(BaseModel):
    total_tonnes: float
    method: str
    is_certified: bool = False
    by_class: list[CarbonClassItem] = []
    spatial_density_max: Optional[float] = 300.0


class AnalysisResult(BaseModel):
    status: str
    project_id: str
    satellite: str = "Sentinel-2"
    image_count: int
    analysis_period: dict
    indices: Dict[str, IndexStats]
    classification: List[ClassAreaItem]
    carbon: CarbonResult
    tile_urls: Optional[TileUrls] = None

