from dataclasses import dataclass
import ee


DEFAULT_CLOUD_COVER_MAX = 20
DEFAULT_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"


@dataclass
class SentinelResult:
    image: "ee.Image"
    image_count: int
    collection: str
    start_date: str
    end_date: str
    cloud_cover_max: float


class SentinelService:
    def __init__(self, collection: str = DEFAULT_COLLECTION):
        self.collection = collection

    def get_composite(
        self,
        geometry: "ee.Geometry",
        start_date: str,
        end_date: str,
        cloud_cover_max: float = DEFAULT_CLOUD_COVER_MAX,
    ) -> SentinelResult:
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

