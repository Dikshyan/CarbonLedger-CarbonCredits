import ee

PROJECT_ID = "carbonledger-503508"

ee.Initialize(project=PROJECT_ID)

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

image = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(geometry)
    .filterDate("2025-01-01", "2025-12-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
    .sort("system:time_start", False)
    .median()
)

ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")

stats = ndvi.reduceRegion(
    reducer=ee.Reducer.minMax().combine(
        reducer2=ee.Reducer.mean(),
        sharedInputs=True
    ),
    geometry=geometry,
    scale=10,
    maxPixels=1e9
)

stats = stats.getInfo()

VEGETATION_THRESHOLD = 0.4

vegetation = ndvi.gt(VEGETATION_THRESHOLD)
#vegetation mask

vegetation_area = (
    ee.Image.pixelArea().updateMask(vegetation)
)

area = vegetation_area.reduceRegion(
    reducer=ee.Reducer.sum(),
    geometry=geometry,
    scale=10,
    maxPixels=1e9
)


area_m2 = area.getInfo()["area"]

area_hectares = area_m2 / 10000

print(f"Vegetation Area : {area_hectares:.2f} hectares")

CARBON_DENSITY = 250
carbon = area_hectares * CARBON_DENSITY

print(f"Estimated Carbon : {carbon:.2f} tonnes")

result = {
    "status": "success",
    "satellite": "Sentinel-2",
    "ndvi": {
        "min": round(stats["NDVI_min"], 4),
        "mean": round(stats["NDVI_mean"], 4),
        "max": round(stats["NDVI_max"], 4)
    },
    "vegetation": {
        "threshold": VEGETATION_THRESHOLD,
        "area_hectares": round(area_hectares, 2)
    },
    "carbon": {
        "estimated_tonnes": round(carbon, 2)
    }
}

from pprint import pprint
pprint(result)



