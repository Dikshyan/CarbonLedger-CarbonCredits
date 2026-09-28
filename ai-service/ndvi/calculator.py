import ee


def calculate_ndvi(image: "ee.Image") -> "ee.Image":
    return image.normalizedDifference(["B8", "B4"]).rename("NDVI")


def calculate_ndwi(image: "ee.Image") -> "ee.Image":
    return image.normalizedDifference(["B3", "B8"]).rename("NDWI")


def calculate_evi(image: "ee.Image") -> "ee.Image":
    evi = image.expression(
        "2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))",
        {
            "NIR": image.select("B8").divide(10000),
            "RED": image.select("B4").divide(10000),
            "BLUE": image.select("B2").divide(10000),
        },
    ).rename("EVI")
    return evi


def calculate_nbr(image: "ee.Image") -> "ee.Image":
    return image.normalizedDifference(["B8", "B12"]).rename("NBR")


def calculate_ndmi(image: "ee.Image") -> "ee.Image":
    return image.normalizedDifference(["B8", "B11"]).rename("NDMI")


def calculate_savi(image: "ee.Image", L: float = 0.5) -> "ee.Image":
    savi = image.expression(
        "((NIR - RED) / (NIR + RED + L)) * (1 + L)",
        {
            "NIR": image.select("B8").divide(10000),
            "RED": image.select("B4").divide(10000),
            "L": L,
        },
    ).rename("SAVI")
    return savi


def calculate_mndwi(image: "ee.Image") -> "ee.Image":
    return image.normalizedDifference(["B3", "B11"]).rename("MNDWI")


def calculate_all_indices(image: "ee.Image") -> "ee.Image":
    ndvi = calculate_ndvi(image)
    ndwi = calculate_ndwi(image)
    evi = calculate_evi(image)
    nbr = calculate_nbr(image)
    ndmi = calculate_ndmi(image)
    savi = calculate_savi(image)
    mndwi = calculate_mndwi(image)
    return (
        ndvi.addBands(ndwi)
        .addBands(evi)
        .addBands(nbr)
        .addBands(ndmi)
        .addBands(savi)
        .addBands(mndwi)
    )


def index_statistics(
    index_image: "ee.Image",
    geometry: "ee.Geometry",
    band_name: str,
    scale: int = 10,
) -> dict:
    reducer = (
        ee.Reducer.minMax()
        .combine(reducer2=ee.Reducer.mean(), sharedInputs=True)
        .combine(reducer2=ee.Reducer.stdDev(), sharedInputs=True)
    )
    stats = index_image.select(band_name).reduceRegion(
        reducer=reducer,
        geometry=geometry,
        scale=scale,
        maxPixels=1e9,
    )
    result = stats.getInfo() or {}
    return {
        "min": round(result.get(f"{band_name}_min", 0.0) or 0.0, 4),
        "mean": round(result.get(f"{band_name}_mean", 0.0) or 0.0, 4),
        "max": round(result.get(f"{band_name}_max", 0.0) or 0.0, 4),
        "stdDev": round(result.get(f"{band_name}_stdDev", 0.0) or 0.0, 4),
    }


def vegetation_area(
    ndvi: "ee.Image",
    geometry: "ee.Geometry",
    threshold: float = 0.4,
    scale: int = 10,
) -> float:
    vegetation = ndvi.gt(threshold)
    area = ee.Image.pixelArea().updateMask(vegetation).reduceRegion(
        reducer=ee.Reducer.sum(),
        geometry=geometry,
        scale=scale,
        maxPixels=1e9,
    )
    area_m2 = (area.getInfo() or {}).get("area", 0)
    return area_m2 / 10000


