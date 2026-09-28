import os
import ee
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GEE_PROJECT_ID")


def initialize_gee():
    ee.Initialize(project=PROJECT_ID)
    print("[+] Google Earth Engine initialized")
