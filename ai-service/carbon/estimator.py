from dataclasses import dataclass
from typing import Optional, Dict
import ee
from ndvi.classifier import ClassBreakdown


CARBON_DENSITY_BY_CLASS = {
    0: 0,
    1: 0,
    2: 50,
    3: 150,
    4: 300,
}

DEFAULT_FLAT_CARBON_DENSITY = 250


@dataclass
class CarbonEstimate:
    total_tonnes: float
    by_class: list[dict]
    method: str
    is_certified: bool = False


def estimate_carbon_v1(vegetation_area_hectares: float) -> CarbonEstimate:
    total = vegetation_area_hectares * DEFAULT_FLAT_CARBON_DENSITY
    return CarbonEstimate(
        total_tonnes=round(total, 2),
        by_class=[],
        method="v1_flat_density",
    )


def estimate_carbon_by_class(
    breakdown: list[ClassBreakdown],
    custom_density: Optional[Dict[int, float]] = None,
) -> CarbonEstimate:
    density_map = custom_density or CARBON_DENSITY_BY_CLASS
    by_class = []
    total = 0.0

    for item in breakdown:
        density = density_map.get(item.class_id, 0)
        class_tonnes = item.area_hectares * density
        total += class_tonnes
        by_class.append(
            {
                "class_id": item.class_id,
                "class_name": item.class_name,
                "area_hectares": item.area_hectares,
                "density_tonnes_per_hectare": density,
                "estimated_tonnes": round(class_tonnes, 2),
            }
        )

    return CarbonEstimate(
        total_tonnes=round(total, 2),
        by_class=by_class,
        method="v2_class_weighted_density",
    )


def create_spatial_carbon_image(
    classified: "ee.Image",
    custom_density: Optional[Dict[int, float]] = None,
) -> "ee.Image":
    density_map = custom_density or CARBON_DENSITY_BY_CLASS
    carbon_img = ee.Image(0)
    
    for class_id, density in density_map.items():
        class_mask = classified.eq(class_id)
        carbon_img = carbon_img.where(class_mask, density)
        
    return carbon_img.rename("carbon_density")


def get_spatial_carbon_tile_url(
    carbon_image: "ee.Image",
    geometry: Optional["ee.Geometry"] = None,
    min_val: float = 0.0,
    max_val: float = 300.0,
) -> Optional[str]:
    try:
        vis_params = {
            "min": min_val,
            "max": max_val,
            "palette": ["00000000", "fef08a", "86efac", "16a34a", "064e3b"],
        }
        
        masked_carbon = carbon_image.updateMask(carbon_image.gt(0))
        if geometry:
            masked_carbon = masked_carbon.clip(geometry)
            
        map_id_dict = masked_carbon.getMapId(vis_params)
        tf = map_id_dict.get("tile_fetcher")
        if hasattr(tf, "url_format"):
            return tf.url_format
        elif isinstance(tf, dict):
            return tf.get("url_format")
        return map_id_dict.get("tile_fetcher", {}).get("url_format")
    except Exception as e:
        print(f"Warning: Could not generate Earth Engine tile URL: {e}")
        return None



