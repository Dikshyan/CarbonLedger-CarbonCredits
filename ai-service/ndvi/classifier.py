from dataclasses import dataclass
import ee


CLASS_NAMES = {
    0: "Water",
    1: "Bare Land",
    2: "Low Vegetation",
    3: "Medium Vegetation",
    4: "Dense Vegetation",
}

NDWI_WATER_THRESHOLD = 0.2
NDVI_BARE_MAX = 0.2
NDVI_LOW_MAX = 0.4
NDVI_MEDIUM_MAX = 0.6


@dataclass
class ClassBreakdown:
    class_id: int
    class_name: str
    area_hectares: float
    percent_of_total: float


def classify_landcover(ndvi: "ee.Image", ndwi: "ee.Image") -> "ee.Image":
    water = ndwi.gt(NDWI_WATER_THRESHOLD)
    bare = ndvi.lt(NDVI_BARE_MAX).And(water.Not())
    low_veg = (
        ndvi.gte(NDVI_BARE_MAX).And(ndvi.lt(NDVI_LOW_MAX)).And(water.Not())
    )
    medium_veg = (
        ndvi.gte(NDVI_LOW_MAX).And(ndvi.lt(NDVI_MEDIUM_MAX)).And(water.Not())
    )
    dense_veg = ndvi.gte(NDVI_MEDIUM_MAX).And(water.Not())

    classified = (
        ee.Image(0)
        .where(water, 0)
        .where(bare, 1)
        .where(low_veg, 2)
        .where(medium_veg, 3)
        .where(dense_veg, 4)
        .rename("class")
    )
    return classified


def classification_area_breakdown(
    classified: "ee.Image",
    geometry: "ee.Geometry",
    scale: int = 10,
) -> list[ClassBreakdown]:
    pixel_area = ee.Image.pixelArea()
    grouped = pixel_area.addBands(classified).reduceRegion(
        reducer=ee.Reducer.sum().group(groupField=1, groupName="class"),
        geometry=geometry,
        scale=scale,
        maxPixels=1e9,
    )

    groups = grouped.get("groups").getInfo() or []
    total_m2 = sum(g["sum"] for g in groups) or 1

    breakdown = []
    for g in groups:
        class_id = int(g["class"])
        area_hectares = g["sum"] / 10000
        percent = (g["sum"] / total_m2) * 100
        breakdown.append(
            ClassBreakdown(
                class_id=class_id,
                class_name=CLASS_NAMES.get(class_id, "Unknown"),
                area_hectares=round(area_hectares, 2),
                percent_of_total=round(percent, 2),
            )
        )

    breakdown.sort(key=lambda b: b.class_id)
    return breakdown

