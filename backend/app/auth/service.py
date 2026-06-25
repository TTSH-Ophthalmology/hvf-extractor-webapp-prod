from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from app.auth.jwt import verify_token
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.config import settings

oauth_scheme = OAuth2PasswordBearer('/token')
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
    if username != settings.admin_username:
        HTTPException(status_code=401, detail="Invalid credentials")
    try:
        ph.verify(settings.admin_password_hash, password)
        return True
    except VerifyMismatchError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
