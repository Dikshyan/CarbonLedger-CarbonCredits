from fastapi import FastAPI

from gee.auth import initialize_gee

app = FastAPI()


@app.on_event("startup")
def startup():

    initialize_gee()


@app.get("/")
def root():
    return {"message": "CarbonLedger AI Service"}