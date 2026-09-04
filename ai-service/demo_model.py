import json
from pprint import pprint
import ee

from gee.auth import initialize_gee
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
from ndvi.classifier import classify_landcover, classification_area_breakdown
from carbon.estimator import (
    estimate_carbon_by_class,
    create_spatial_carbon_image,
    get_spatial_carbon_tile_url,
)
from models.schemas import AnalyzeRequest, PolygonBoundary

print("==================================================", flush=True)
print(" *** CarbonLedger AI Model Pipeline Execution ***", flush=True)
print("==================================================", flush=True)

print("\n[Step 1] Initializing Google Earth Engine connection...", flush=True)
initialize_gee()

print("\n[Step 2] Input GeoJSON Polygon Boundary:", flush=True)
sundarbans_boundary = {
    "type": "Polygon",
    "coordinates": [[
        [88.90, 21.90],
        [88.95, 21.90],
        [88.95, 21.95],
        [88.90, 21.95],
        [88.90, 21.90]
    ]]
}
pprint(sundarbans_boundary)

geometry = ee.Geometry(sundarbans_boundary)

print("\n[Step 3] Querying Sentinel-2 Surface Reflectance (S2_SR_HARMONIZED)...", flush=True)
sentinel_service = SentinelService()
sentinel_result = sentinel_service.get_composite(
    geometry=geometry,
    start_date="2025-01-01",
    end_date="2025-12-31",
    cloud_cover_max=20.0,
)
image = sentinel_result.image
print(f" -> Found {sentinel_result.image_count} cloud-filtered Sentinel-2 scenes.", flush=True)

print("\n[Step 4] Computing Multi-Spectral Index Suite (7 Indices)...", flush=True)
ndvi = calculate_ndvi(image)
ndwi = calculate_ndwi(image)
evi = calculate_evi(image)
nbr = calculate_nbr(image)
ndmi = calculate_ndmi(image)
savi = calculate_savi(image)
mndwi = calculate_mndwi(image)

indices_stats = {
    "NDVI (Vegetation Health)": index_statistics(ndvi, geometry, "NDVI"),
    "NDWI (Water Saturation)": index_statistics(ndwi, geometry, "NDWI"),
    "EVI (Dense Canopy)": index_statistics(evi, geometry, "EVI"),
    "NBR (Burn / Disturbance)": index_statistics(nbr, geometry, "NBR"),
    "NDMI (Moisture Stress)": index_statistics(ndmi, geometry, "NDMI"),
    "SAVI (Soil Adjusted)": index_statistics(savi, geometry, "SAVI"),
    "MNDWI (Modified Water)": index_statistics(mndwi, geometry, "MNDWI"),
}
print("Multi-Spectral Index Statistics:", flush=True)
pprint(indices_stats)

print("\n[Step 5] Running 5-Tier Rule-Based Landcover Classifier...", flush=True)
classified = classify_landcover(ndvi, ndwi)
breakdown = classification_area_breakdown(classified, geometry)

print("Land Cover Area Breakdown:", flush=True)
for item in breakdown:
    print(f" - Class {item.class_id} [{item.class_name:<18}]: {item.area_hectares:>8.2f} ha ({item.percent_of_total:>5.1f}%)", flush=True)

print("\n[Step 6] Estimating Spatial Carbon Potential...", flush=True)
carbon_estimate = estimate_carbon_by_class(breakdown)
spatial_carbon_img = create_spatial_carbon_image(classified)

print(f" -> Total Estimated Carbon Stock: {carbon_estimate.total_tonnes:,.2f} tonnes C", flush=True)
print("Per-Class Carbon Contribution:", flush=True)
for c in carbon_estimate.by_class:
    print(f" - {c['class_name']:<18}: {c['area_hectares']:>8.2f} ha @ {c['density_tonnes_per_hectare']:>3} t/ha = {c['estimated_tonnes']:>10.2f} tonnes C", flush=True)

print("\n[Step 7] Generating Earth Engine Live Map Tile URL...", flush=True)
tile_url = get_spatial_carbon_tile_url(spatial_carbon_img, geometry=geometry)
print(f" -> Spatial Carbon Heatmap Tile URL: {tile_url}", flush=True)

print("\n==================================================", flush=True)
print(" [+] Model Pipeline Executed Successfully!", flush=True)
print("==================================================", flush=True)


