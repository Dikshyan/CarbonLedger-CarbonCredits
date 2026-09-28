import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import ee
from dotenv import load_dotenv

from api.routes import router

load_dotenv()

PROJECT_ID = os.getenv("GEE_PROJECT_ID", "carbonledger-503508")

app = FastAPI(title="CarbonLedger AI Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def init_earth_engine():
    try:
        ee.Initialize(project=PROJECT_ID)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(
            "Google Earth Engine initialization failed — running in fallback mode. "
            "Run `earthengine authenticate` to enable live GEE analysis. Error: %s", exc
        )


app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}


