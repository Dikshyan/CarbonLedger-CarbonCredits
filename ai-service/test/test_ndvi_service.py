import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ndvi import ndvi_service


class NdviServiceTests(unittest.TestCase):
    def test_calculate_ndvi_uses_sentinel_bands_and_ndvi_name(self):
        image = MagicMock()
        ndvi_image = MagicMock()
        image.normalizedDifference.return_value = ndvi_image

        result = ndvi_service.calculate_ndvi(image)

        image.normalizedDifference.assert_called_once_with(["B8", "B4"])
        ndvi_image.rename.assert_called_once_with("NDVI")
        self.assertIs(result, ndvi_image.rename.return_value)

    def test_calculate_ndvi_statistics_returns_reducer_info(self):
        ndvi = MagicMock()
        geometry = MagicMock()
        stats = MagicMock()
        stats.getInfo.return_value = {
            "NDVI_min": 0.1,
            "NDVI_mean": 0.5,
            "NDVI_max": 0.9,
        }
        ndvi.reduceRegion.return_value = stats

        reducer = MagicMock()
        reducer_min_max = MagicMock()
        mean_reducer = MagicMock()
        with patch.object(
            ndvi_service.ee.Reducer, "minMax", return_value=reducer_min_max
        ), patch.object(
            ndvi_service.ee.Reducer, "mean", return_value=mean_reducer
        ):
            reducer_min_max.combine.return_value = reducer
            result = ndvi_service.calculate_ndvi_statistics(ndvi, geometry)

        reducer_min_max.combine.assert_called_once_with(
            reducer2=mean_reducer,
            sharedInputs=True,
        )
        ndvi.reduceRegion.assert_called_once_with(
            reducer=reducer,
            geometry=geometry,
            scale=10,
            maxPixels=1e9,
        )
        self.assertEqual(result, stats.getInfo.return_value)

    def test_calculate_vegetation_area_applies_threshold_and_converts_to_hectares(self):
        ndvi = MagicMock()
        geometry = MagicMock()
        vegetation = MagicMock()
        pixel_area = MagicMock()
        masked_area = MagicMock()
        area = MagicMock()
        area.getInfo.return_value = {"area": 25_000}
        ndvi.gt.return_value = vegetation
        pixel_area.updateMask.return_value = masked_area
        masked_area.reduceRegion.return_value = area
        sum_reducer = MagicMock()

        with patch.object(
            ndvi_service.ee.Image, "pixelArea", return_value=pixel_area
        ), patch.object(
            ndvi_service.ee.Reducer, "sum", return_value=sum_reducer
        ):
            result = ndvi_service.calculate_vegetation_area(
                ndvi, geometry, threshold=0.6
            )

        ndvi.gt.assert_called_once_with(0.6)
        pixel_area.updateMask.assert_called_once_with(vegetation)
        masked_area.reduceRegion.assert_called_once_with(
            reducer=sum_reducer,
            geometry=geometry,
            scale=10,
            maxPixels=1e9,
        )
        self.assertEqual(result, 2.5)


if __name__ == "__main__":
    unittest.main()
