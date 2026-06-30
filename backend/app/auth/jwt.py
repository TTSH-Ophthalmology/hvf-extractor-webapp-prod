from datetime import timedelta, datetime, timezone
from uuid import uuid4

from jose import jwt, JWTError

from app.db.db import store

ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_HOURS = 10


def create_token(data: dict, expire_delta: timedelta, token_type: str):
    payload = data.copy()
    now = datetime.now(timezone.utc)

    payload.update({
        "iat": now,
        "exp": now + expire_delta,
        "type": token_type
    })

    if token_type == "refresh":
        payload["jti"] = str(uuid4())

    return jwt.encode(payload, store.get_jwt_secret(), algorithm=ALGORITHM)


def create_access_token(user_id: str, role: str):
    return create_token(
        {"sub": user_id, "role": role},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "access"
    )

def create_refresh_token(user_id: str):
    return create_token(
        {"sub": user_id},
        timedelta(hours=REFRESH_TOKEN_EXPIRE_HOURS),
        "refresh"
    )


def verify_token(token: str, expect: str):
    try:

        payload = jwt.decode(token, store.get_jwt_secret(), algorithms=[ALGORITHM])

        if payload.get('type') != expect:
            raise ValueError("Invalid token type")

        return payload

    except JWTError:
        raise ValueError("Invalid token")
