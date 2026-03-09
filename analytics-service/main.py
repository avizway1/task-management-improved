import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import analytics

app = FastAPI(
    title="Analytics Service",
    description="Task analytics and reporting microservice — Python/FastAPI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "analytics-service",
        "language": "Python",
        "framework": "FastAPI",
        "version": "1.0.0",
    }
