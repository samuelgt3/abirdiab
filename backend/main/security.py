"""Small security helpers: hashing, rate limiting, password rules."""
import hashlib
import re
from datetime import timedelta

import requests
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone

from .models import RateLimitHit


def sha256_hex(value: str) -> str:
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def client_ip(request) -> str:
    """The visitor's IP. Behind a proxy/CDN the first X-Forwarded-For entry is the visitor."""
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR", "")) or "unknown"


def ip_hash(request) -> str:
    """One-way hash (salted with the server secret) so the real IP is never stored."""
    return sha256_hex(f"{settings.SECRET_KEY}|{client_ip(request)}")


def rate_limited(bucket: str, key: str, limit: int, window_seconds: int) -> bool:
    """Record one hit; return True when this key has gone over `limit` hits within the window."""
    key_hash = sha256_hex(f"{settings.SECRET_KEY}|{key}")
    since = timezone.now() - timedelta(seconds=window_seconds)
    used = RateLimitHit.objects.filter(bucket=bucket, key_hash=key_hash, at__gte=since).count()
    if used >= limit:
        return True
    RateLimitHit.objects.create(bucket=bucket, key_hash=key_hash)
    return False


_LETTER = re.compile(r"[A-Za-z؀-ۿ]")


def strong_enough(pw: str) -> bool:
    """Same rule as the website (src/lib/password.js): 8+ characters, a letter and a number."""
    pw = str(pw or "")
    return len(pw) >= 8 and bool(_LETTER.search(pw)) and any(c.isdigit() for c in pw)


def password_problem(pw: str):
    """Return None when the password is acceptable, otherwise a short reason code."""
    if not strong_enough(pw):
        return "weak password"
    try:
        validate_password(pw)
    except ValidationError:
        return "weak password"
    if getattr(settings, "LEAKED_PASSWORD_CHECK", False) and _is_leaked(pw):
        return "leaked password"
    return None


def _is_leaked(pw: str) -> bool:
    """haveibeenpwned range API: only the first 5 characters of the hash are sent. Fails open."""
    digest = hashlib.sha1(pw.encode("utf-8")).hexdigest().upper()
    try:
        r = requests.get(f"https://api.pwnedpasswords.com/range/{digest[:5]}", timeout=3,
                         headers={"Add-Padding": "true"})
        if r.status_code != 200:
            return False
        for line in r.text.splitlines():
            suffix, _, count = line.partition(":")
            if suffix == digest[5:] and int(count or 0) > 0:
                return True
    except Exception:
        return False
    return False
