from fastapi import FastAPI
from app.api.v1.router import api_router


def create_app() -> FastAPI:
    application = FastAPI(
        title="JanSetu AI Intelligence Service",
        version="1.0.0",
        description="Advisory civic complaint classification, PII scrubbing, and clustering pipeline.",
    )
    application.include_router(api_router, prefix="/api/v1")
    return application


app = create_app()
