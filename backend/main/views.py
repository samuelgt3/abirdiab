import base64
import json
import os
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests
from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST
from dotenv import load_dotenv

from .courses import createUploadUrl, mux_webhook  # noqa: F401  (routed from urls.py)
from .models import (
    Appointment,
    AudioCourse,
    BlogPost,
    DocumentCourse,
    GroupBooking,
    GroupSession,
    Series,
    VideoCourse,
)

load_dotenv()

CAIRO = ZoneInfo("Africa/Cairo")

_cached_token = None
_token_expires_at = 0


class ZoomError(Exception):
    """Zoom is misconfigured or unreachable. `status` is the HTTP status to answer with."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def _json_body(request):
    """Parsed JSON object from the request body, or None if it is missing or malformed."""
    try:
        body = json.loads(request.body)
    except (ValueError, TypeError):
        return None
    return body if isinstance(body, dict) else None


def _bad_json():
    return JsonResponse({"error": "invalid JSON body"}, status=400)


def _unauthorized():
    return JsonResponse({"error": "authentication required"}, status=401)


def _forbidden():
    return JsonResponse({"error": "Forbidden"}, status=403)


@require_POST
def login_view(request):
    data = _json_body(request)
    if data is None:
        return _bad_json()

    user = authenticate(request, username=data.get("email"), password=data.get("password"))
    if user is None:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    login(request, user)
    return JsonResponse({"status": "ok"})


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"status": "ok"})


def _parse_and_validate(time_str, duration):
    """Returns (timezone-aware datetime in Cairo time, None) or (None, error response)."""
    try:
        naive = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S")
    except (TypeError, ValueError):
        return None, JsonResponse({"error": "invalid time"}, status=400)

    session_time = timezone.make_aware(naive, CAIRO)

    if session_time < timezone.now():
        return None, JsonResponse({"error": "invalid time"}, status=400)

    if duration <= 0 or duration > 180:
        return None, JsonResponse({"error": "meeting duration out of the 0 - 3 hours range"}, status=400)

    return session_time, None


def get_zoom_access_token():
    global _cached_token, _token_expires_at

    if _cached_token and time.time() < _token_expires_at:
        return _cached_token

    try:
        account_id = os.environ["ZOOM_ACCOUNT_ID"]
        client_id = os.environ["ZOOM_CLIENT_ID"]
        client_secret = os.environ["ZOOM_CLIENT_SECRET"]
    except KeyError as missing:
        raise ZoomError(f"zoom is not configured ({missing.args[0]} is not set)", status=503)

    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    try:
        response = requests.post(
            "https://zoom.us/oauth/token",
            params={"grant_type": "account_credentials", "account_id": account_id},
            headers={"Authorization": f"Basic {credentials}"},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.RequestException, ValueError):
        raise ZoomError("failed to reach zoom, please try again", status=502)

    _cached_token = data["access_token"]
    _token_expires_at = time.time() + data["expires_in"] - 60  # refresh 60s early
    return _cached_token


def _create_zoom_meeting(payload):
    """Creates a Zoom meeting and returns its join URL. Raises ZoomError."""
    token = get_zoom_access_token()
    try:
        zoom = requests.post(
            "https://api.zoom.us/v2/users/me/meetings",
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
            json={**payload, "pre_schedule": True, "timezone": "Africa/Cairo", "type": 2},
            timeout=10,
        )
    except requests.RequestException:
        raise ZoomError("failed to reach zoom, please try again", status=502)

    if zoom.status_code != 201:
        raise ZoomError("failed to retrieve zoom link, please try again", status=400)

    try:
        return zoom.json()["join_url"]
    except (ValueError, KeyError):
        raise ZoomError("zoom returned an unexpected response", status=502)


@require_POST
def createAppointment(request):
    if not request.user.is_authenticated:
        return _unauthorized()

    user = request.user
    body = _json_body(request)
    if body is None:
        return _bad_json()
    time_str = body.get("datetime")

    try:
        duration = int(body.get("duration"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid duration"}, status=400)

    apt_time, err = _parse_and_validate(time_str, duration)
    if err:
        return err

    with transaction.atomic():
        if Appointment.objects.select_for_update().filter(aptTime=apt_time).exclude(
            status=Appointment.Status.CANCELLED
        ).exists():
            return JsonResponse({"error": "appointment already taken"}, status=400)

        try:
            zoom_link = _create_zoom_meeting({
                "agenda": f"{user.first_name}'s Consultation",
                "duration": duration,
                "schedule_for": user.email,
                "start_time": time_str,
            })
        except ZoomError as e:
            return JsonResponse({"error": str(e)}, status=e.status)

        Appointment.objects.create(aptTime=apt_time, user=user, length=duration, zoomLink=zoom_link)

    return JsonResponse({"Zoom Link": zoom_link}, status=201)


@require_POST
def createGroupSession(request):
    if not request.user.is_authenticated:
        return _unauthorized()
    if not request.user.is_staff:
        return _forbidden()

    body = _json_body(request)
    if body is None:
        return _bad_json()

    name = body.get("name")
    description = body.get("description") or ""
    time_str = body.get("datetime")
    if not name:
        return JsonResponse({"error": "name is required"}, status=400)
    try:
        capacity = int(body.get("capacity"))
        duration = int(body.get("duration"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid capacity or duration"}, status=400)

    if capacity <= 0:
        return JsonResponse({"error": "capacity must be positive"}, status=400)

    session_time, err = _parse_and_validate(time_str, duration)
    if err:
        return err

    try:
        zoom_link = _create_zoom_meeting({"agenda": name, "duration": duration, "start_time": time_str})
    except ZoomError as e:
        return JsonResponse({"error": str(e)}, status=e.status)

    GroupSession.objects.create(
        name=name,
        description=description,
        total_capacity=capacity,
        seats_left=capacity,
        time=session_time,
        duration=duration,
        zoom_link=zoom_link,
    )

    return JsonResponse({"zoom link": zoom_link}, status=201)


@require_POST
def joinGroup(request, id):
    user = request.user
    if not user.is_authenticated:
        return _unauthorized()

    with transaction.atomic():
        group = get_object_or_404(GroupSession.objects.select_for_update(), id=id)

        if GroupBooking.objects.filter(user=user, session=group).exists():
            return JsonResponse({"error": "booking already exists"}, status=400)

        if group.seats_left <= 0:
            return JsonResponse({"error": "session full"}, status=400)

        group.seats_left -= 1
        group.save()
        GroupBooking.objects.create(user=user, session=group)

        return JsonResponse({"link": group.zoom_link}, status=200)


@require_POST
def createBlogPost(request):
    user = request.user
    if not user.is_authenticated:
        return _unauthorized()
    if not user.is_superuser:
        return _forbidden()

    body = _json_body(request)
    if body is None:
        return _bad_json()

    title_en, title_ar = body.get("titleEnglish"), body.get("titleArabic")
    content_en, content_ar = body.get("contentEnglish"), body.get("contentArabic")
    if not all([title_en, title_ar, content_en, content_ar]):
        return JsonResponse({"error": "titleEnglish, titleArabic, contentEnglish and contentArabic are required"}, status=400)

    blog = BlogPost.objects.create(
        titleEng=title_en, titleArb=title_ar, contentEng=content_en, contentArb=content_ar
    )
    return JsonResponse({"status": "ok", "id": blog.id}, status=201)


@require_GET
def getBlogPosts(request):
    blogs = list(BlogPost.objects.all().values())
    return JsonResponse(blogs, safe=False)


@require_GET
def getCourses(request):
    """Public catalogue. Never includes playback/management ids or links: those unlock paid content."""
    out = []
    for c in Series.objects.all():
        out.append({
            "id": c.id,
            "title": c.name,
            "language": c.language,
            "price": c.price,
            "downloadable": c.downloadable,
            "videos": list(VideoCourse.objects.filter(course=c).values("id", "name", "language", "status")),
            "audios": list(AudioCourse.objects.filter(course=c).values("id", "name", "language", "status")),
            "documents": list(DocumentCourse.objects.filter(course=c).values("id", "name", "language", "status")),
        })
    return JsonResponse(out, safe=False)
