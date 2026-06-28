from datetime import timedelta, datetime, timezone
from jose import jwt, JWTError
from app.config import settings

JWT_SECRET = settings.jwt_secret_key
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_token(data: dict, expire_delta: timedelta, token_type: str):
    payload = data.copy()
    now = datetime.now(timezone.utc)

    payload.update({
        "iat": now,
        "exp": now + expire_delta,
        "type": token_type
    })

    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def create_access_token(user_id: str, role: str):
    return create_token(
        {"sub": user_id, "role": role},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "access"
    )

# Not using.
def create_refresh_token(user_id: str):
    return create_token(
        {"sub": user_id},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh"
    )


def verify_token(token: str, expect: str):
    try:

        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])

        if payload.get('type') != expect:
            raise ValueError("Invalid token type")

        return payload

    except JWTError:
        raise ValueError("Invalid token")
