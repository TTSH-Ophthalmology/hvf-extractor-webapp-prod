"""
main.py — FastAPI application factory.

Registers all routers and configures middleware.
No business logic lives here.
"""

import logging
import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.logging_config import setup_logging
from app.routers import extraction, pdf

# Initialise logging before anything else creates a logger.
setup_logging(settings.log_level, settings.log_dir)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="NHGEI HVF Extractor API",
    description="Backend API for NHGEI HVF Extractor — extracts structured data from HVF/VRVF PDF reports.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Middleware (applied in reverse order — last added = outermost)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:
    """Log every request with method, path, status code, and duration."""
    start = time.perf_counter()
    response: Response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %d  (%.1f ms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


# ---------------------------------------------------------------------------
# Routers (VIEW layer)
# ---------------------------------------------------------------------------
app.include_router(pdf.router,        prefix="/api")
app.include_router(extraction.router, prefix="/api")


@app.get("/api/health", tags=["Health"])
async def health_check() -> dict:
    """Liveness probe — confirms the API is running."""
    return {"status": "healthy", "version": "1.0.0"}


@app.get("/", tags=["Root"])
async def root() -> dict:
    return {"message": "NHGEI HVF Extractor API", "docs_url": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env == "development",
    )
