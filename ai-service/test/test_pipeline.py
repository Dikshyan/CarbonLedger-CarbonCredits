import ee

from gee.auth import initialize_gee
from gee.sentinel import get_sentinel_image
from ndvi.ndvi_service import (
    calculate_ndvi,
    ndvi_statistics,
    vegetation_area,
)
from carbon.carbon_service import estimate_carbon

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

image = get_sentinel_image(geometry)

ndvi = calculate_ndvi(image)

stats = ndvi_statistics(ndvi, geometry)

area = vegetation_area(ndvi, geometry)

carbon = estimate_carbon(area)

print(stats)
print(area)
print(carbon)