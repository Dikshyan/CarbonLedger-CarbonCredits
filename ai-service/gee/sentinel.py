"""
Sentinel-2 Data Service & IBM-NASA Prithvi Integration Pipeline

This module exposes Sentinel-2 image retrieval, quality masking, multi-temporal
compositing, and IBM-NASA Prithvi foundation model tensor generation.
"""

from dataclasses import dataclass
from typing import List, Tuple, Union, Optional
import ee
import torch

from gee.prithvi_pipeline import (
    PrithviDataPipeline,
    mask_clouds_s2_qa60,
    mask_clouds_s2_scl,
    mask_clouds_hls,
    extract_prithvi_bands,
    compute_3_temporal_windows,
    slice_spatial_patches,
    format_prithvi_tensor,
    PRITHVI_BAND_NAMES,
    S2_PRITHVI_BANDS,
    HLS_PRITHVI_BANDS,
)

DEFAULT_CLOUD_COVER_MAX = 20.0
DEFAULT_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"


@dataclass
class SentinelResult:
    """Dataclass holding Sentinel-2 composite results and query metadata."""
    image: ee.Image
    image_count: int
    collection: str
    start_date: str
    end_date: str
    cloud_cover_max: float


class SentinelService:
    """Service providing Sentinel-2 composite creation and Prithvi tensor generation."""

    def __init__(self, collection: str = DEFAULT_COLLECTION):
        """Initializes SentinelService with target image collection.

        Args:
            collection (str): Earth Engine collection path. Defaults to COPERNICUS/S2_SR_HARMONIZED.
        """
        self.collection = collection
        self.prithvi_pipeline = PrithviDataPipeline(
            collection_name=self.collection, cloud_cover_max=DEFAULT_CLOUD_COVER_MAX
        )

    def get_composite(
        self,
        geometry: ee.Geometry,
        start_date: str,
        end_date: str,
        cloud_cover_max: float = DEFAULT_CLOUD_COVER_MAX,
    ) -> SentinelResult:
        """Queries Sentinel-2 collection, applies filters, and returns a median composite.

        Args:
            geometry (ee.Geometry): Target bounding polygon geometry.
            start_date (str): Query start date string 'YYYY-MM-DD'.
            end_date (str): Query end date string 'YYYY-MM-DD'.
            cloud_cover_max (float): Maximum cloudy pixel percentage.

        Returns:
            SentinelResult: Object containing composite image, count, and metadata.
        """
        collection = (
            ee.ImageCollection(self.collection)
            .filterBounds(geometry)
            .filterDate(start_date, end_date)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_cover_max))
        )

        image_count = collection.size().getInfo()
        composite = collection.sort("system:time_start", False).median()

        return SentinelResult(
            image=composite,
            image_count=image_count,
            collection=self.collection,
            start_date=start_date,
            end_date=end_date,
            cloud_cover_max=cloud_cover_max,
        )

    def get_prithvi_tensor(
        self,
        geometry: ee.Geometry,
        temporal_windows: Union[Tuple[str, str], List[Tuple[str, str]]],
        cloud_cover_max: float = DEFAULT_CLOUD_COVER_MAX,
        scale_meters: int = 10,
        normalize: bool = False,
    ) -> torch.Tensor:
        """Fetches 6-band satellite data across 3 temporal steps and formats a PyTorch tensor.

        Target Output Shape Structure:
        [Batch_Size, 6_Bands, 3_Time_Steps, 224_Height, 224_Width]

        Args:
            geometry (ee.Geometry): Region boundary geometry.
            temporal_windows (Union[Tuple[str, str], List[Tuple[str, str]]]): 3 temporal date ranges
                or a single (start_date, end_date) tuple to be split into 3 equal steps.
            cloud_cover_max (float): Maximum cloudy pixel threshold.
            scale_meters (int): Nominal pixel scale in meters (10m).
            normalize (bool): Whether to apply IBM-NASA Prithvi Z-score channel normalization.

        Returns:
            torch.Tensor: PyTorch FloatTensor of shape [Batch_Size, 6, 3, 224, 224].
        """
        pipeline = PrithviDataPipeline(
            collection_name=self.collection, cloud_cover_max=cloud_cover_max
        )
        return pipeline.get_prithvi_tensor(
            geometry=geometry,
            temporal_windows=temporal_windows,
            scale_meters=scale_meters,
            normalize=normalize,
        )
