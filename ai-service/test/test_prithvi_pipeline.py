"""
Unit tests for IBM-NASA Prithvi foundation model data retrieval & preprocessing pipeline.
"""

import os
import sys
import numpy as np
import pytest
import torch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from gee.prithvi_pipeline import (
    PRITHVI_BAND_NAMES,
    S2_PRITHVI_BANDS,
    HLS_PRITHVI_BANDS,
    compute_3_temporal_windows,
    slice_spatial_patches,
    format_prithvi_tensor,
    mask_clouds_s2_qa60,
    mask_clouds_s2_scl,
    mask_clouds_hls,
    extract_prithvi_bands,
    PrithviDataPipeline,
)
from gee.sentinel import SentinelService


def test_prithvi_band_names_order():
    """Verify that the 6 spectral bands match IBM-NASA Prithvi exact specification."""
    expected_order = ["Blue", "Green", "Red", "Narrow_NIR", "SWIR1", "SWIR2"]
    assert PRITHVI_BAND_NAMES == expected_order
    assert len(PRITHVI_BAND_NAMES) == 6
    assert S2_PRITHVI_BANDS == ["B2", "B3", "B4", "B8A", "B11", "B12"]
    assert HLS_PRITHVI_BANDS == ["B02", "B03", "B04", "B05", "B06", "B07"]


def test_compute_3_temporal_windows():
    """Verify that a date range is partitioned into 3 equal temporal windows."""
    start_date = "2024-01-01"
    end_date = "2024-10-01"
    windows = compute_3_temporal_windows(start_date, end_date)

    assert len(windows) == 3
    for w in windows:
        assert isinstance(w, tuple)
        assert len(w) == 2
        assert w[0] < w[1]

    assert windows[0][0] == "2024-01-01"
    assert windows[2][1] == "2024-10-01"


def test_slice_spatial_patches_exact():
    """Test patch slicing with exact 224x224 input spatial grid."""
    # Dummy array shape: (6 bands, 3 time steps, 224 height, 224 width)
    arr = np.random.randint(0, 5000, size=(6, 3, 224, 224), dtype=np.uint16)
    patches = slice_spatial_patches(arr, patch_size=224, stride=224)

    # Shape should be (1, 6, 3, 224, 224) -> Batch_Size = 1
    assert patches.shape == (1, 6, 3, 224, 224)


def test_slice_spatial_patches_larger_grid():
    """Test patch slicing with a 500x500 grid requiring multiple 224x224 windows and padding."""
    # Grid of 500x500 will pad to 672x672 (3x3 grid of 224 patches = 9 patches)
    arr = np.random.randint(0, 5000, size=(6, 3, 500, 500), dtype=np.uint16)
    patches = slice_spatial_patches(arr, patch_size=224, stride=224)

    # 3x3 patches = 9 batch items
    assert patches.shape == (9, 6, 3, 224, 224)


def test_format_prithvi_tensor_shape_and_type():
    """Verify PyTorch tensor output structure: [Batch_Size, 6, 3, 224, 224]."""
    raw_patches = np.random.randint(0, 10000, size=(4, 6, 3, 224, 224), dtype=np.uint16)
    tensor = format_prithvi_tensor(raw_patches, scale_factor=10000.0, normalize=False)

    assert isinstance(tensor, torch.Tensor)
    assert tensor.dtype == torch.float32
    assert tensor.shape == (4, 6, 3, 224, 224)

    # Values scaled by 10000.0 should be within [0.0, 1.0]
    assert tensor.min() >= 0.0
    assert tensor.max() <= 1.0


def test_format_prithvi_tensor_normalized():
    """Verify Z-score normalized PyTorch tensor shape and value transformation."""
    raw_patches = np.random.randint(1000, 3000, size=(2, 6, 3, 224, 224), dtype=np.uint16)
    tensor = format_prithvi_tensor(raw_patches, scale_factor=10000.0, normalize=True)

    assert isinstance(tensor, torch.Tensor)
    assert tensor.shape == (2, 6, 3, 224, 224)
    # Normalized values will be float around 0.0 with positive/negative z-scores
    assert not torch.all(tensor >= 0.0)


def test_sentinel_service_prithvi_integration():
    """Verify SentinelService exposes get_prithvi_tensor method."""
    service = SentinelService()
    assert hasattr(service, "get_prithvi_tensor")
    assert hasattr(service, "prithvi_pipeline")
