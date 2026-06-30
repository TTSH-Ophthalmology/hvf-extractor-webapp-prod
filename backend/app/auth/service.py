from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.auth.jwt import verify_token
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, VerifyMismatchError
from app.db.db import store

oauth_scheme = OAuth2PasswordBearer('/api/token')
ph = PasswordHasher()

def get_current_user(token: str = Depends(oauth_scheme)):
    try:
        payload = verify_token(token, "access")
        return {
            "user_id": payload.get("user_id"),
            "role": payload.get("role")
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid access token")


def verify_admin(username: str, password: str) -> bool:
    user = store.get_user(username)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Invalid credentials")

    try:
        ph.verify(user["password_hash"], password)
        return True
    except (VerificationError, VerifyMismatchError):
        raise HTTPException(status_code=401, detail="Invalid credentials")
