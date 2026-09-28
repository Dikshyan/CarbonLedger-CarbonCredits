import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import ee
from gee.auth import initialize_gee
from gee.sentinel import SentinelService
from ndvi.calculator import (
    calculate_ndvi,
    calculate_ndwi,
    calculate_all_indices,
    index_statistics,
    vegetation_area,
)
from ndvi.classifier import classify_landcover, classification_area_breakdown
from carbon.estimator import estimate_carbon_by_class, create_spatial_carbon_image

initialize_gee()

boundary = {
    "type": "Polygon",
    "coordinates": [[
        [91.70, 26.10],
        [91.75, 26.10],
        [91.75, 26.15],
        [91.70, 26.15],
        [91.70, 26.10]
    ]]
}

geometry = ee.Geometry(boundary)

sentinel_service = SentinelService()
sentinel_res = sentinel_service.get_composite(
    geometry=geometry,
    start_date="2025-01-01",
    end_date="2025-12-31",
    cloud_cover_max=20.0,
)
image = sentinel_res.image

ndvi = calculate_ndvi(image)
stats = index_statistics(ndvi, geometry, "NDVI")
area = vegetation_area(ndvi, geometry)

classified = classify_landcover(ndvi, calculate_ndwi(image))
breakdown = classification_area_breakdown(classified, geometry)
carbon = estimate_carbon_by_class(breakdown)

print("NDVI Stats:", stats)
print("Vegetation Area (ha):", area)
print("Carbon Estimate (t):", carbon.total_tonnes)
