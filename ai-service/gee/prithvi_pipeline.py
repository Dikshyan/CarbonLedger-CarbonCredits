r"""
AI-CONTEXT-README
=================

# IBM-NASA Prithvi Geospatial Foundation Model Data Pipeline

## Overview
This module provides a specialized Earth Engine & PyTorch satellite data pipeline 
tailored specifically for the **IBM-NASA Prithvi** foundation model architecture 
(e.g., Prithvi-100M, Prithvi-EO-1.0, Prithvi-EO-2.0). 

It queries Harmonized Sentinel-2 / HLS satellite collections, applies bitwise cloud/shadow 
quality masking, retrieves imagery across 3 temporal acquisition steps, extracts 6 core 
spectral bands in exact Prithvi ordering, slices spatial regions into 224x224 pixel patches, 
and returns a clean, model-ready PyTorch tensor.

---

## 1. Tensor Layout & Axis Meanings

The final compiled output tensor adheres to the exact 5D PyTorch tensor structure:

$$\\text{Tensor Shape} = [B, C, T, H, W] = [\\text{Batch\\_Size}, 6, 3, 224, 224]$$

### Axis Breakdown:
- **Axis 0 (`Batch_Size` / $B$)**: Spatial Patch Batch Dimension. The total number of 
  $224 \\times 224$ spatial patches extracted across the input geographic region.
- **Axis 1 (`6_Bands` / $C=6$)**: Spectral Channels in exact Prithvi order:
  1. **Blue**: Sentinel-2 `B2` / HLS `B02` ($\lambda \\approx 490\\text{ nm}$)
  2. **Green**: Sentinel-2 `B3` / HLS `B03` ($\lambda \\approx 560\\text{ nm}$)
  3. **Red**: Sentinel-2 `B4` / HLS `B04` ($\lambda \\approx 665\\text{ nm}$)
  4. **Narrow NIR**: Sentinel-2 `B8A` / HLS `B05` ($\lambda \\approx 865\\text{ nm}$)
  5. **SWIR 1**: Sentinel-2 `B11` / HLS `B06` ($\lambda \\approx 1610\\text{ nm}$)
  6. **SWIR 2**: Sentinel-2 `B12` / HLS `B07` ($\lambda \\approx 2190\\text{ nm}$)
- **Axis 2 (`3_Time_Steps` / $T=3$)**: Temporal Acquisition Sequence ($T_0, T_1, T_2$). 
  Represents 3 distinct time steps (e.g. 3 seasons, 3 consecutive months, or 3 observation intervals).
- **Axis 3 (`224_Height` / $H=224$)**: Spatial Height of each patch in pixels ($224\\text{ px}$).
- **Axis 4 (`224_Width` / $W=224$)**: Spatial Width of each patch in pixels ($224\\text{ px}$).

---

## 2. Data Scaling & Normalization Rules

- **Raw Surface Reflectance**: Earth Engine `COPERNICUS/S2_SR_HARMONIZED` or `NASA/HLS/HLSS30/v002` 
  stores surface reflectance scaled by $10{,}000$ ($DN \\in [0, 10000]$).
- **Default Scaling**: Values are scaled to physical reflectance range $[0.0, 1.0]$:
  $$R_{\\text{float}} = \\frac{\\text{DN}}{10000.0}$$
- **Prithvi Z-Score Normalization**: When `normalize=True`, channel-wise Z-score normalization 
  is applied using IBM-NASA Prithvi dataset mean ($\\mu_c$) and standard deviation ($\\sigma_c$):
  $$x_{\\text{norm}} = \\frac{x_{\\text{float}} - \\mu_c}{\\sigma_c}$$
  Where Prithvi pre-training statistics for the 6 bands are:
  - $\\boldsymbol{\\mu} = [0.0989, 0.1226, 0.1287, 0.2642, 0.2079, 0.1481]$
  - $\\boldsymbol{\\sigma} = [0.0474, 0.0537, 0.0691, 0.0886, 0.0763, 0.0635]$

---

## 3. Coordinate Reference System (CRS) & Patching Logic

- **Spatial Reprojection**: Satellite rasters are reprojected into a unified CRS 
  (default `EPSG:3857` Web Mercator or target UTM projection) at $10\\text{ m}$ spatial resolution.
- **Patch Extraction**: Large bounding boxes are tiled into $224 \\times 224$ pixel windows using 
  a sliding window grid. Smaller regions or boundary edges are zero-padded to maintain 
  the strict $(224, 224)$ dimension requirement.

---

## 4. Bitwise Cloud Masking Mathematical Logic

### QA60 Bitmask Extraction Math (Sentinel-2 L1C/L2A)
For a 16-bit QA integer $x \\in \\mathbb{Z}_{\\ge 0}$, bit position $b$ is extracted via:
$$\\text{Bit}_b(x) = (x \\gg b) \\bitwiseand 1 = \\left\\lfloor \\frac{x \\pmod{2^{b+1}}}{2^b} \\right\\rfloor$$

- Bit 10 ($2^{10} = 1024_{10} = 0b0000010000000000$): Opaque Clouds
- Bit 11 ($2^{11} = 2048_{10} = 0b0000100000000000$): Cirrus Clouds

Clear-Sky Condition:
$$\\text{ClearSky}(x) = \\bigl( (x \\bitwiseand 1024) = 0 \\bigr) \\land \\bigl( (x \\bitwiseand 2048) = 0 \\bigr)$$

### Scene Classification Layer (SCL) Filtering (Sentinel-2 L2A)
Scene classification values $SCL \\in \\{0, 1, \\dots, 11\\}$. Invalid/cloudy classes masked out:
- $3$: Cloud Shadows
- $8$: Medium Probability Clouds
- $9$: High Probability Clouds
- $10$: Thin Cirrus
- $11$: Snow / Ice

Clear-Sky Condition:
$$\\text{ClearSky}_{\\text{SCL}}(SCL) = SCL \\notin \\{3, 8, 9, 10, 11\\}$$
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import torch
import ee


# IBM-NASA Prithvi Band Definitions in Exact Required Order
PRITHVI_BAND_NAMES: List[str] = [
    "Blue",
    "Green",
    "Red",
    "Narrow_NIR",
    "SWIR1",
    "SWIR2",
]

# Sentinel-2 Band Mapping: [B2, B3, B4, B8A, B11, B12]
S2_PRITHVI_BANDS: List[str] = ["B2", "B3", "B4", "B8A", "B11", "B12"]

# HLS (HLSS30 / HLSL30) Band Mapping: [B02, B03, B04, B05/B8A, B06/B11, B07/B12]
HLS_PRITHVI_BANDS: List[str] = ["B02", "B03", "B04", "B05", "B06", "B07"]

# IBM-NASA Prithvi Pre-training Mean & Std for 6 Bands
PRITHVI_BAND_MEANS: Tuple[float, ...] = (0.0989, 0.1226, 0.1287, 0.2642, 0.2079, 0.1481)
PRITHVI_BAND_STDS: Tuple[float, ...] = (0.0474, 0.0537, 0.0691, 0.0886, 0.0763, 0.0635)


def mask_clouds_s2_qa60(image: ee.Image) -> ee.Image:
    """Masks clouds and cirrus in Sentinel-2 images using QA60 bitmask logic.

    Args:
        image (ee.Image): Raw Sentinel-2 Earth Engine image containing 'QA60' band.

    Returns:
        ee.Image: Cloud-masked Sentinel-2 image with invalid pixels masked out.

    Raises:
        ValueError: If 'QA60' band is missing from input image.

    Bitwise Masking Math:
        1. Cloud Bit 10: 1 << 10 = 1024_10 = 0b0000010000000000
           cloud_mask = (QA60 & 1024) == 0
        2. Cirrus Bit 11: 1 << 11 = 2048_10 = 0b0000100000000000
           cirrus_mask = (QA60 & 2048) == 0
        3. Combined Clear Sky Mask:
           clear_sky = cloud_mask AND cirrus_mask
           Mathematical formulation:
           M(x) = [1 - (x >> 10) & 1] * [1 - (x >> 11) & 1]
    """
    qa = image.select("QA60")

    # Bit 10: Opaque clouds (1 << 10 = 1024)
    # Bitwise AND extracts bit 10; equality to 0 confirms clear sky
    cloud_bit_mask = 1 << 10
    cloud_clear = qa.bitwiseAnd(cloud_bit_mask).eq(0)

    # Bit 11: Thin cirrus clouds (1 << 11 = 2048)
    # Bitwise AND extracts bit 11; equality to 0 confirms clear sky
    cirrus_bit_mask = 1 << 11
    cirrus_clear = qa.bitwiseAnd(cirrus_bit_mask).eq(0)

    # Combine bitwise masks: Clear sky requires both bit 10 == 0 AND bit 11 == 0
    clear_sky_mask = cloud_clear.And(cirrus_clear)

    return image.updateMask(clear_sky_mask)


def mask_clouds_s2_scl(image: ee.Image) -> ee.Image:
    r"""Masks clouds, shadows, and snow using Scene Classification Layer (SCL).

    Args:
        image (ee.Image): Sentinel-2 Surface Reflectance image containing 'SCL' band.

    Returns:
        ee.Image: Masked Sentinel-2 image retaining clear land and vegetation pixels.

    Raises:
        ValueError: If 'SCL' band is missing from input image.

    SCL Classification Math:
        SCL Pixel Values:
        - 3: Cloud Shadow
        - 8: Cloud Medium Probability
        - 9: Cloud High Probability
        - 10: Thin Cirrus
        - 11: Snow / Ice
        Valid Mask Condition: SCL not in {3, 8, 9, 10, 11}
        Mathematical formulation:
        M_SCL(p) = \prod_{k \in \{3, 8, 9, 10, 11\}} \mathbb{I}(p \neq k)
    """
    scl = image.select("SCL")

    # Mask out cloud shadows (3), medium cloud (8), high cloud (9), thin cirrus (10), snow (11)
    clear_mask = (
        scl.neq(3)
        .And(scl.neq(8))
        .And(scl.neq(9))
        .And(scl.neq(10))
        .And(scl.neq(11))
    )

    return image.updateMask(clear_mask)


def mask_clouds_hls(image: ee.Image) -> ee.Image:
    """Masks clouds and shadows for Harmonized Landsat Sentinel (HLS) Fmask band.

    Args:
        image (ee.Image): HLS Earth Engine image containing 'Fmask' or 'QA' band.

    Returns:
        ee.Image: Cloud-masked HLS image.

    Bitwise Masking Math:
        HLS Fmask Bit Definitions:
        - Bit 1 (2_10): Cloud
        - Bit 2 (4_10): Cloud Shadow
        - Bit 3 (8_10): Adjacent to Cloud/Shadow
        - Bit 4 (16_10): Snow/Ice
        Combined mask bits: 0b00011110 = 30_10
        Clear condition: (Fmask & 30) == 0
    """
    qa_band = "Fmask" if "Fmask" in image.bandNames().getInfo() else "QA"
    qa = image.select(qa_band)

    # Combined cloud/shadow/snow bitmask = bits 1, 2, 3, 4 (2 + 4 + 8 + 16 = 30)
    invalid_bitmask = (1 << 1) | (1 << 2) | (1 << 3) | (1 << 4)
    clear_mask = qa.bitwiseAnd(invalid_bitmask).eq(0)

    return image.updateMask(clear_mask)


def extract_prithvi_bands(image: ee.Image, collection_type: str = "S2") -> ee.Image:
    """Extracts exactly the 6 Prithvi spectral bands in precise required order.

    Order: [Blue, Green, Red, Narrow NIR, SWIR 1, SWIR 2]

    Args:
        image (ee.Image): Source Earth Engine satellite image.
        collection_type (str): Collection type identifier ('S2' or 'HLS'). Defaults to 'S2'.

    Returns:
        ee.Image: Image with exactly 6 bands renamed to standard Prithvi band names.

    Raises:
        ValueError: If unsupported collection_type is provided.
    """
    if collection_type.upper() == "HLS":
        source_bands = HLS_PRITHVI_BANDS
    else:
        source_bands = S2_PRITHVI_BANDS

    return image.select(source_bands, PRITHVI_BAND_NAMES)


def compute_3_temporal_windows(
    start_date: str, end_date: str
) -> List[Tuple[str, str]]:
    """Calculates 3 equal-duration temporal windows from a total date range.

    Args:
        start_date (str): Start date string in 'YYYY-MM-DD' format.
        end_date (str): End date string in 'YYYY-MM-DD' format.

    Returns:
        List[Tuple[str, str]]: List of 3 (start_date, end_date) tuples for T0, T1, T2.

    Raises:
        ValueError: If start_date is after end_date or format is invalid.
    """
    d_start = datetime.strptime(start_date, "%Y-%m-%d")
    d_end = datetime.strptime(end_date, "%Y-%m-%d")

    total_days = (d_end - d_start).days
    if total_days < 3:
        # Minimum fallback window if range is extremely narrow
        return [
            (start_date, end_date),
            (start_date, end_date),
            (start_date, end_date),
        ]

    step_days = total_days // 3

    t0_start = d_start
    t0_end = t0_start + timedelta(days=step_days)

    t1_start = t0_end
    t1_end = t1_start + timedelta(days=step_days)

    t2_start = t1_end
    t2_end = d_end

    return [
        (t0_start.strftime("%Y-%m-%d"), t0_end.strftime("%Y-%m-%d")),
        (t1_start.strftime("%Y-%m-%d"), t1_end.strftime("%Y-%m-%d")),
        (t2_start.strftime("%Y-%m-%d"), t2_end.strftime("%Y-%m-%d")),
    ]


def slice_spatial_patches(
    array: np.ndarray, patch_size: int = 224, stride: int = 224
) -> np.ndarray:
    """Slices multi-spectral temporal spatial matrix into 224x224 pixel patches.

    Args:
        array (np.ndarray): Input numpy array of shape (Bands, Time_Steps, Height, Width)
            or (Time_Steps, Bands, Height, Width).
            Shape expected: (6, 3, H, W) or (3, 6, H, W).
        patch_size (int): Target spatial window dimension (224). Defaults to 224.
        stride (int): Spatial sliding window step size. Defaults to 224 (non-overlapping).

    Returns:
        np.ndarray: Array of sliced patches with shape (Batch_Size, 6, 3, 224, 224).

    Raises:
        ValueError: If array dimensions are smaller than 4D or invalid.
    """
    if array.ndim != 4:
        raise ValueError(f"Expected 4D array (C, T, H, W), got shape {array.shape}")

    # Ensure shape is (6, 3, H, W)
    if array.shape[0] == 3 and array.shape[1] == 6:
        # Transpose from (3, 6, H, W) to (6, 3, H, W)
        array = np.transpose(array, (1, 0, 2, 3))

    C, T, H, W = array.shape

    # Pad array if height or width is smaller than patch_size or not multiple of stride
    pad_h = (patch_size - (H % patch_size)) % patch_size if H >= patch_size else (patch_size - H)
    pad_w = (patch_size - (W % patch_size)) % patch_size if W >= patch_size else (patch_size - W)

    if pad_h > 0 or pad_w > 0:
        array = np.pad(
            array,
            ((0, 0), (0, 0), (0, pad_h), (0, pad_w)),
            mode="constant",
            constant_values=0,
        )
        _, _, H, W = array.shape

    patches = []
    for y in range(0, H - patch_size + 1, stride):
        for x in range(0, W - patch_size + 1, stride):
            patch = array[:, :, y : y + patch_size, x : x + patch_size]
            if patch.shape[2] == patch_size and patch.shape[3] == patch_size:
                patches.append(patch)

    if not patches:
        # Fallback safeguard: resize or pad to 224x224
        padded = np.zeros((C, T, patch_size, patch_size), dtype=array.dtype)
        h_copy = min(H, patch_size)
        w_copy = min(W, patch_size)
        padded[:, :, :h_copy, :w_copy] = array[:, :, :h_copy, :w_copy]
        patches.append(padded)

    stacked_patches = np.stack(patches, axis=0)  # Shape: (Batch_Size, 6, 3, 224, 224)
    return stacked_patches


def format_prithvi_tensor(
    spatial_data: np.ndarray,
    scale_factor: float = 10000.0,
    normalize: bool = False,
) -> torch.Tensor:
    """Converts spatial patch array into scaled, formatted PyTorch tensor.

    Target Tensor Shape Structure:
    [Batch_Size, 6_Bands, 3_Time_Steps, 224_Height, 224_Width]

    Args:
        spatial_data (np.ndarray): Sliced spatial patch array of shape (B, 6, 3, 224, 224).
        scale_factor (float): Reflectance scaling divisor (10000.0 for Sentinel-2/HLS).
        normalize (bool): If True, applies Prithvi Z-score normalization per channel.

    Returns:
        torch.Tensor: PyTorch FloatTensor of shape [Batch_Size, 6, 3, 224, 224].

    Raises:
        ValueError: If spatial_data does not have 5 dimensions or 6 bands.
    """
    if spatial_data.ndim != 5:
        raise ValueError(
            f"Expected 5D spatial patch data (B, 6, 3, 224, 224), got shape {spatial_data.shape}"
        )

    B, C, T, H, W = spatial_data.shape
    if C != 6 or H != 224 or W != 224:
        raise ValueError(
            f"Prithvi tensor requires C=6 bands, H=224, W=224. Got shape {spatial_data.shape}"
        )

    # Convert to float32 physical reflectance range [0.0, 1.0]
    scaled_data = spatial_data.astype(np.float32) / scale_factor

    if normalize:
        # Apply Prithvi Channel Z-Score Normalization
        # x_norm = (x - mean) / std
        means = np.array(PRITHVI_BAND_MEANS, dtype=np.float32).reshape(1, 6, 1, 1, 1)
        stds = np.array(PRITHVI_BAND_STDS, dtype=np.float32).reshape(1, 6, 1, 1, 1)
        scaled_data = (scaled_data - means) / stds

    tensor = torch.from_numpy(scaled_data).float()
    return tensor


class PrithviDataPipeline:
    """Service for fetching, masking, compositing, and formatting satellite data for IBM-NASA Prithvi."""

    def __init__(
        self,
        collection_name: str = "COPERNICUS/S2_SR_HARMONIZED",
        cloud_cover_max: float = 20.0,
    ):
        """Initializes PrithviDataPipeline with target satellite collection settings.

        Args:
            collection_name (str): Earth Engine collection string.
            cloud_cover_max (float): Maximum allowed scene cloudy pixel percentage.
        """
        self.collection_name = collection_name
        self.cloud_cover_max = cloud_cover_max

    def fetch_temporal_composites(
        self,
        geometry: ee.Geometry,
        temporal_windows: Union[Tuple[str, str], List[Tuple[str, str]]],
    ) -> List[ee.Image]:
        """Fetches cloud-masked median composites across 3 temporal steps.

        Args:
            geometry (ee.Geometry): Target region of interest geometry.
            temporal_windows (Union[Tuple[str, str], List[Tuple[str, str]]]): Either
                a list of 3 explicit (start_date, end_date) tuples, or a single
                (start_date, end_date) tuple that will be auto-split into 3 equal steps.

        Returns:
            List[ee.Image]: List of exactly 3 cloud-masked, 6-band ee.Image composites [T0, T1, T2].

        Raises:
            ValueError: If fewer than 3 temporal windows are produced.
        """
        if isinstance(temporal_windows, tuple) and len(temporal_windows) == 2:
            windows = compute_3_temporal_windows(temporal_windows[0], temporal_windows[1])
        elif isinstance(temporal_windows, list) and len(temporal_windows) == 3:
            windows = temporal_windows
        else:
            raise ValueError(
                "temporal_windows must be a list of 3 (start, end) tuples or a single (start, end) tuple."
            )

        collection_type = "HLS" if "HLS" in self.collection_name.upper() else "S2"
        composites: List[ee.Image] = []

        for start_d, end_d in windows:
            col = (
                ee.ImageCollection(self.collection_name)
                .filterBounds(geometry)
                .filterDate(start_d, end_d)
            )

            if collection_type == "S2":
                col = col.filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", self.cloud_cover_max))
                # Apply QA cloud masking
                if "S2_SR" in self.collection_name:
                    masked_col = col.map(mask_clouds_s2_scl)
                else:
                    masked_col = col.map(mask_clouds_s2_qa60)
            else:
                masked_col = col.map(mask_clouds_hls)

            # Spatial median composite across clear-sky scenes in time step
            comp = masked_col.median()

            # Select and rename 6 Prithvi bands in exact order
            prithvi_6band = extract_prithvi_bands(comp, collection_type=collection_type)
            composites.append(prithvi_6band.clip(geometry))

        return composites

    def get_prithvi_tensor(
        self,
        geometry: ee.Geometry,
        temporal_windows: Union[Tuple[str, str], List[Tuple[str, str]]],
        scale_meters: int = 10,
        normalize: bool = False,
    ) -> torch.Tensor:
        """Executes full retrieval pipeline and returns IBM-NASA Prithvi PyTorch tensor.

        Target Output Tensor Shape:
        [Batch_Size, 6_Bands, 3_Time_Steps, 224_Height, 224_Width]

        Args:
            geometry (ee.Geometry): Target bounding geometry.
            temporal_windows (Union[Tuple[str, str], List[Tuple[str, str]]]): 3 temporal windows.
            scale_meters (int): Pixel resolution in meters (default 10m).
            normalize (bool): Whether to apply Z-score normalization using Prithvi channel stats.

        Returns:
            torch.Tensor: PyTorch tensor with shape [Batch_Size, 6, 3, 224, 224].

        Raises:
            RuntimeError: If GEE pixel extraction fails or array extraction is invalid.
        """
        composites = self.fetch_temporal_composites(geometry, temporal_windows)

        # Extract multi-spectral spatial arrays for each time step
        temporal_arrays = []
        for img in composites:
            # Sample rectangle pixel grid from Earth Engine
            rect = img.sampleRectangle(geometry=geometry, defaultValue=0)
            band_data = []
            for b_name in PRITHVI_BAND_NAMES:
                arr = np.array(rect.get(b_name).getInfo(), dtype=np.float32)
                band_data.append(arr)
            # Stack 6 bands for current time step -> Shape: (6, H, W)
            step_array = np.stack(band_data, axis=0)
            temporal_arrays.append(step_array)

        # Stack across 3 temporal steps -> Shape: (3, 6, H, W)
        multi_temp_array = np.stack(temporal_arrays, axis=0)

        # Transpose to (6, 3, H, W)
        multi_temp_array = np.transpose(multi_temp_array, (1, 0, 2, 3))

        # Slice spatial matrix into 224x224 windows -> Shape: (Batch_Size, 6, 3, 224, 224)
        patches_array = slice_spatial_patches(multi_temp_array, patch_size=224, stride=224)

        # Format into PyTorch Tensor [Batch_Size, 6, 3, 224, 224]
        prithvi_tensor = format_prithvi_tensor(
            patches_array, scale_factor=10000.0, normalize=normalize
        )

        return prithvi_tensor
