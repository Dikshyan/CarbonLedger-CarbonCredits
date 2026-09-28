import ee


def calculate_ndvi(image):
    return image.normalizedDifference(
        ["B8", "B4"]
    ).rename("NDVI")


def calculate_ndvi_statistics(ndvi, geometry):

    stats = ndvi.reduceRegion(
        reducer=ee.Reducer.minMax().combine(
            reducer2=ee.Reducer.mean(),
            sharedInputs=True
        ),
        geometry=geometry,
        scale=10,
        maxPixels=1e9
    )

    return stats.getInfo()


def calculate_vegetation_area(
    ndvi,
    geometry,
    threshold=0.4
):

    vegetation = ndvi.gt(threshold)

    area = (
        ee.Image.pixelArea()
        .updateMask(vegetation)
        .reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=geometry,
            scale=10,
            maxPixels=1e9
        )
    )

    return area.getInfo()["area"] / 10000