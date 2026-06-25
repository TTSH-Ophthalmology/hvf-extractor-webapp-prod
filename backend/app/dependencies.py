"""
dependencies.py — Shared FastAPI dependency injection helpers.

Add reusable Depends() functions here as the project grows
(e.g. authenticated user, database session, rate limiter).
"""

# TODO: add shared dependencies as needed
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, status, HTTPException

from app.auth.jwt import verify_token

bearer = HTTPBearer(auto_error=True)

def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(bearer),
):
    try:
        return verify_token(credentials.credentials, expect="access")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )