"""
dependencies.py — Shared FastAPI dependency injection helpers.

Add reusable Depends() functions here as the project grows
(e.g. authenticated user, database session, rate limiter).
"""

# TODO: add shared dependencies as needed
from fastapi import status, HTTPException, Request

from app.auth.jwt import verify_token


def get_current_user(
        request: Request
):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        return verify_token(token, expect="access")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )