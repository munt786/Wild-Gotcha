import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import db_manager
from app.api.v1.endpoints import router as api_v1_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to initialize and teardown database connections."""
    logger.info("Starting up WildGotcha backend engine...")
    await db_manager.connect_to_database()
    yield
    logger.info("Shutting down WildGotcha backend engine...")
    await db_manager.close_database_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production AI species identification API for Mammalia, Insecta, Reptilia, and Arachnida. "
        "Powered by FastAPI, OpenCV preprocessing, TensorFlow MobileNetV2, and MongoDB."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware (Crucial for mobile apps and Expo development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API router
app.include_router(api_v1_router, prefix=settings.API_V1_STR, tags=["Species Identification"])


@app.get("/", tags=["Root"])
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "identify": f"{settings.API_V1_STR}/identify",
            "scans": f"{settings.API_V1_STR}/scans",
            "stats": f"{settings.API_V1_STR}/stats",
        },
    }


@app.get("/health", tags=["Monitoring"])
async def health_check():
    return {
        "status": "healthy",
        "database_connected": db_manager.is_connected,
        "environment": settings.ENVIRONMENT,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception at %s: %s", request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "detail": str(exc)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
