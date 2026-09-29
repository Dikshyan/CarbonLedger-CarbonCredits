"""
Unit tests for PrithviInferenceEngine PyTorch remote sensing pipeline.
"""

import os
import sys
import unittest
import numpy as np
import torch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from inference.prithvi_engine import PrithviInferenceEngine, DEFAULT_CLASS_MAPPING


class TestPrithviInferenceEngine(unittest.TestCase):

    def setUp(self):
        self.engine = PrithviInferenceEngine(
            model_name="ibm-nasa-geospatial/Prithvi-100m-multi-temporal-crop-classification",
            device="cpu",
        )

    def test_predict_patch_valid_shape(self):
        """Verify 5D input tensor [B=1, C=6, T=3, H=224, W=224] returns expected mask shape [1, 224, 224]."""
        tensor = torch.rand((1, 6, 3, 224, 224), dtype=torch.float32)
        res = self.engine.predict_patch(tensor)

        self.assertEqual(res["status"], "success")
        self.assertIn("predicted_masks", res)
        self.assertEqual(res["predicted_masks"].shape, (1, 224, 224))
        self.assertIsInstance(res["class_distribution"], dict)

    def test_predict_patch_numpy_input(self):
        """Verify numpy array input is automatically converted to PyTorch tensor."""
        arr = np.random.uniform(0.1, 0.9, size=(2, 6, 3, 224, 224)).astype(np.float32)
        res = self.engine.predict_patch(arr)

        self.assertEqual(res["status"], "success")
        self.assertEqual(res["predicted_masks"].shape, (2, 224, 224))

    def test_predict_patch_shape_mismatch_anomaly_log(self):
        """Verify input with invalid shape triggers automated AI anomaly JSON log."""
        bad_tensor = torch.rand((1, 6, 224, 224))  # 4D instead of 5D
        res = self.engine.predict_patch(bad_tensor)

        self.assertEqual(res["status"], "error")
        self.assertIn("anomaly_logs", res)
        self.assertGreater(len(res["anomaly_logs"]), 0)
        self.assertIn("SHAPE_MISMATCH", res["anomaly_logs"][0])

    def test_predict_patch_nan_values_anomaly_log(self):
        """Verify NaN numerical values trigger automated AI anomaly log."""
        nan_tensor = torch.rand((1, 6, 3, 224, 224))
        nan_tensor[0, 0, 0, 10, 10] = float("nan")
        res = self.engine.predict_patch(nan_tensor)

        self.assertEqual(res["status"], "error")
        self.assertIn("INVALID_NUMERICAL_VALUES", res["anomaly_logs"][0])

    def test_class_label_mapping(self):
        """Verify output contains human-readable string labels mapped from class indices."""
        tensor = torch.rand((1, 6, 3, 224, 224))
        res = self.engine.predict_patch(tensor)

        for cls_idx, meta in res["class_distribution"].items():
            self.assertIn("label", meta)
            self.assertIn("coverage_percent", meta)
            self.assertEqual(meta["label"], DEFAULT_CLASS_MAPPING.get(cls_idx, f"Class_{cls_idx}"))


if __name__ == "__main__":
    unittest.main()
