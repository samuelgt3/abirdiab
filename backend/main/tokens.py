"""Login tokens (JWT). The browser sends the access token in the Authorization header."""
import time

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model

ALG = "HS256"


def _encode(payload: dict) -> str:
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALG)


def make_token(user, typ: str, seconds: int) -> str:
    now = int(time.time())
    return _encode({"sub": str(user.id), "typ": typ, "ver": user.token_version, "iat": now, "exp": now + seconds})


def decode_token(token: str, typ: str):
    """Return the user for a valid token of this type, otherwise None."""
    try:
        data = jwt.decode(token, settings.JWT_SECRET, algorithms=[ALG])
    except jwt.PyJWTError:
        return None
    if data.get("typ") != typ:
        return None
    user = get_user_model().objects.filter(pk=data.get("sub"), is_active=True).first()
    if user is None or user.token_version != data.get("ver"):
        return None
    return user


def user_from_request(request):
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if not header.lower().startswith("bearer "):
        return None
    return decode_token(header[7:].strip(), "access")


def public_user(user) -> dict:
    """The user object the website expects (same shape Supabase gave it)."""
    return {
        "id": str(user.id),
        "email": user.email,
        "email_confirmed_at": user.email_confirmed_at.isoformat() if user.email_confirmed_at else None,
        "user_metadata": user.user_metadata or {},
        "identities": [{"provider": "email"}],
    }


def make_session(user) -> dict:
    now = int(time.time())
    return {
        "access_token": make_token(user, "access", settings.ACCESS_TOKEN_SECONDS),
        "refresh_token": make_token(user, "refresh", settings.REFRESH_TOKEN_SECONDS),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_SECONDS,
        "expires_at": now + settings.ACCESS_TOKEN_SECONDS,
        "user": public_user(user),
    }
