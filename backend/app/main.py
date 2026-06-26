"""
main.py — FastAPI application factory.

Registers all routers and configures middleware.
No business logic lives here.
"""

import logging
import time
from datetime import datetime

from fastapi import Depends, FastAPI, Request, Response, HTTPException, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.config import settings
from app.logging_config import setup_logging
from app.routers import extraction, pdf

from app.auth.service import verify_admin
from app.auth.jwt import create_access_token
from app.dependencies import get_current_user

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

# JWT system
@app.post("/api/token")
def login(
    request: Request,
    response: Response,
    username: str = Form(...),
    password: str = Form(...)
):
    ip = request.client.host
    try:
        verify_admin(username, password)

    except Exception:
        logger.exception(
            "%s: %s has failed to log in from %s.",
            datetime.now(),
            username,
            ip
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
            user_id= username,
            role = "admin"
        )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,      # True if HTTPS
        samesite="lax",    # use "none" only if cross-site + HTTPS
        max_age=60 * 60 * 8,
        path="/",
    )

    logger.info(
        "Login successful: user=%s ip=%s",
        username,
        ip,
    )

    return {
        "message": "Login successfully"
    }

@app.post("/api/logout")
def logout(
    request: Request,
    response: Response
):

    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=False,
        samesite="lax",
    )

    logger.info(
        "Logout: ip=%s",
        request.client.host,
    )

    return {
        "message": "Logout successfully"
    }


# ---------------------------------------------------------------------------
# Routers (VIEW layer)
# ---------------------------------------------------------------------------
api_dependencies = [Depends(get_current_user)]

app.include_router(pdf.router,        prefix="/api", dependencies=api_dependencies)
app.include_router(extraction.router, prefix="/api", dependencies=api_dependencies)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env == "development",
    )
