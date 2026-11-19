"""Bunny Stream: signed, expiring embed links so a shared video link stops working."""
import hashlib
import time

from django.conf import settings


def signed_embed(video_id: str, seconds: int = 4 * 3600):
    """Returns (token, expires) or (None, None) when Bunny token authentication is not set up.

    Bunny's rule: token = SHA256_HEX(security_key + video_id + expires)  (library > Security > Token Authentication)
    """
    key = getattr(settings, "BUNNY_TOKEN_KEY", "")
    if not key or not video_id:
        return None, None
    expires = int(time.time()) + seconds
    token = hashlib.sha256(f"{key}{video_id}{expires}".encode()).hexdigest()
    return token, expires
