"""Zoom: one real, unique meeting per paid 1:1 session (Server-to-Server OAuth app)."""
import os
import re

import requests
from django.core.cache import cache

from .models import SiteSettings


def configured() -> bool:
    return all(os.environ.get(n) for n in ("ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"))


def _token() -> str:
    tok = cache.get("zoom:token")
    if tok:
        return tok
    r = requests.post("https://zoom.us/oauth/token", timeout=10,
                      params={"grant_type": "account_credentials", "account_id": os.environ["ZOOM_ACCOUNT_ID"]},
                      auth=(os.environ["ZOOM_CLIENT_ID"], os.environ["ZOOM_CLIENT_SECRET"]))
    r.raise_for_status()
    data = r.json()
    cache.set("zoom:token", data["access_token"], max(60, int(data.get("expires_in", 3600)) - 300))
    return data["access_token"]


def minutes_from(length_text: str) -> int:
    m = re.search(r"\d+", length_text or "")
    return min(max(int(m.group(0)), 15), 480) if m else 60


def create_meeting(order):
    """Returns (join_url, start_url). Raises on any failure (the caller keeps the booking and flags the order)."""
    s = SiteSettings.get()
    body = {
        "topic": f"{order.item_title or '1:1 session'} - Abir Diab ({order.ref})", "type": 2,
        "start_time": f"{order.session_date.isoformat()}T{order.session_time}:00",
        "timezone": order.session_timezone or s.booking_timezone, "duration": minutes_from(s.session_length),
        "settings": {"waiting_room": True, "join_before_host": False, "approval_type": 2, "participant_video": True},
    }
    r = requests.post("https://api.zoom.us/v2/users/me/meetings", json=body, timeout=15,
                      headers={"Authorization": f"Bearer {_token()}"})
    r.raise_for_status()
    data = r.json()
    return data["join_url"], data.get("start_url", "")
