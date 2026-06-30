"""
main.py — FastAPI application factory.

Registers all routers and configures middleware.
No business logic lives here.
"""

import logging
import time
from datetime import datetime
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request, Response, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.logging_config import setup_logging
from app.routers import extraction, pdf

from app.auth.csrf import (
    create_csrf_token,
    delete_csrf_cookie,
    set_csrf_cookie,
    validate_csrf,
    cookie_secure,
)
from app.auth.service import verify_admin
from app.auth.jwt import create_access_token, create_refresh_token, verify_token
from app.db.db import store
from app.dependencies import get_current_user

BASE_DIR = Path(__file__).resolve().parent
FOLDER_PATH = BASE_DIR .parent/ "data/uploads"

# Initialise logging before anything else creates a logger.
setup_logging(settings.log_level, settings.log_dir)

logger = logging.getLogger(__name__)

REFRESH_COOKIE_PATH = "/api/refresh"

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # clean up uploads folder before shutdown
    for file in Path(FOLDER_PATH).iterdir():
        if file.is_file():
            file.unlink()

app = FastAPI(
    title="NHGEI HVF Extractor API",
    description="Backend API for NHGEI HVF Extractor — extracts structured data from HVF/VRVF PDF reports.",
    version="1.0.0",
    lifespan=lifespan
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
async def csrf_protect(request: Request, call_next) -> Response:
    if (
        request.url.path.startswith("/api/")
        and request.method in {"POST", "PUT", "PATCH", "DELETE"}
        and request.url.path != "/api/token"
    ):
        try:
            validate_csrf(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )

    return await call_next(request)


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
        user_id=username,
        role="admin"
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=cookie_secure(),
        samesite="lax",
        max_age=60 * 15,
        path="/",
    )

    refresh_token = create_refresh_token(
        user_id=username
    )
    refresh_payload = verify_token(refresh_token, expect="refresh")
    store.save_refresh_token(
        token_id=refresh_payload["jti"],
        username=username,
        expires_at=refresh_payload["exp"],
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=cookie_secure(),
        samesite="Strict",
        max_age=60 * 60 * 10,
        path=REFRESH_COOKIE_PATH,
    )
    set_csrf_cookie(response, create_csrf_token())

    logger.info(
        "Login successful: user=%s ip=%s",
        username,
        ip,
    )

    return {
        "message": "Login successfully"
    }


@app.post("/api/refresh")
def refresh(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh-token")
    
    try:
        payload = verify_token(refresh_token, expect="refresh")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh-token")
    
    username = payload.get("sub")
    token_id = payload.get("jti")

    if not username or not token_id:
        raise HTTPException(status_code=401, detail="Invalid refresh-token")

    if not store.is_refresh_token_active(token_id, username):
        raise HTTPException(status_code=401, detail="Revoked refresh-token")

    store.revoke_refresh_token(token_id)

    new_access_token = create_access_token(
        user_id=username,
        role="admin"
    )
    new_refresh_token = create_refresh_token(
        user_id=username
    )
    new_refresh_payload = verify_token(new_refresh_token, expect="refresh")
    store.save_refresh_token(
        token_id=new_refresh_payload["jti"],
        username=username,
        expires_at=new_refresh_payload["exp"],
    )

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=cookie_secure(),
        samesite="lax",
        max_age=60 * 15,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=cookie_secure(),
        samesite="Strict",
        max_age=60 * 60 * 10,
        path=REFRESH_COOKIE_PATH,
    )
    set_csrf_cookie(response, create_csrf_token())

    return {"message": "Access token refreshed"}


@app.get("/api/me")
def me(user=Depends(get_current_user)):
    return {
        "username": user["sub"],
        "role": user["role"],
    }


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=cookie_secure(),
        samesite="lax",
    )

    response.delete_cookie(
        key="refresh_token",
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=cookie_secure(),
        samesite="Strict",
    )
    delete_csrf_cookie(response)


@app.post("/api/refresh/revoke")
def revoke_refresh_token(
    request: Request,
    response: Response
):
    refresh_token = request.cookies.get("refresh_token")

    if refresh_token:
        try:
            payload = verify_token(refresh_token, expect="refresh")
            token_id = payload.get("jti")
            if token_id:
                store.revoke_refresh_token(token_id)
        except ValueError:
            logger.info(
                "Refresh revoke requested with invalid token: ip=%s",
                request.client.host,
            )

    clear_auth_cookies(response)

    logger.info(
        "Refresh token revoked: ip=%s",
        request.client.host,
    )

    return {
        "message": "Logout successfully"
    }


@app.post("/api/logout")
def logout(
    request: Request,
    response: Response
):
    clear_auth_cookies(response)

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

app.include_router(pdf.router,        prefix="/api",
                   dependencies=api_dependencies)
app.include_router(extraction.router, prefix="/api",
                   dependencies=api_dependencies)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env == "development",
    )
