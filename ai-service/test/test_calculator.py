import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ndvi import calculator


class MultiIndexCalculatorTests(unittest.TestCase):
    def test_calculate_nbr(self):
        image = MagicMock()
        nbr_image = MagicMock()
        image.normalizedDifference.return_value = nbr_image

        result = calculator.calculate_nbr(image)

        image.normalizedDifference.assert_called_once_with(["B8", "B12"])
        nbr_image.rename.assert_called_once_with("NBR")
        self.assertIs(result, nbr_image.rename.return_value)

    def test_calculate_ndmi(self):
        image = MagicMock()
        ndmi_image = MagicMock()
        image.normalizedDifference.return_value = ndmi_image

        result = calculator.calculate_ndmi(image)

        image.normalizedDifference.assert_called_once_with(["B8", "B11"])
        ndmi_image.rename.assert_called_once_with("NDMI")
        self.assertIs(result, ndmi_image.rename.return_value)

    def test_calculate_mndwi(self):
        image = MagicMock()
        mndwi_image = MagicMock()
        image.normalizedDifference.return_value = mndwi_image

        result = calculator.calculate_mndwi(image)

        image.normalizedDifference.assert_called_once_with(["B3", "B11"])
        mndwi_image.rename.assert_called_once_with("MNDWI")
        self.assertIs(result, mndwi_image.rename.return_value)

    def test_index_statistics_returns_stddev(self):
        index_img = MagicMock()
        geometry = MagicMock()
        stats = MagicMock()
        stats.getInfo.return_value = {
            "NDVI_min": 0.12,
            "NDVI_mean": 0.54,
            "NDVI_max": 0.88,
            "NDVI_stdDev": 0.16,
        }
        index_img.select.return_value.reduceRegion.return_value = stats

        with patch.object(calculator.ee, "Reducer") as mock_reducer:
            mock_combine = MagicMock()
            mock_reducer.minMax.return_value.combine.return_value = mock_combine
            mock_combine.combine.return_value = MagicMock()

            res = calculator.index_statistics(index_img, geometry, "NDVI")

            self.assertEqual(res["min"], 0.12)
            self.assertEqual(res["mean"], 0.54)
            self.assertEqual(res["max"], 0.88)
            self.assertEqual(res["stdDev"], 0.16)


if __name__ == "__main__":
    unittest.main()
