import hashlib
import hmac
import json
import os
import time

import mux_python
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from dotenv import load_dotenv

from .models import Series, VideoCourse

load_dotenv()

# Mux rejects/ignores events older than this; we do the same to stop replayed webhooks.
WEBHOOK_TOLERANCE_SECONDS = 300


def _mux_credentials():
    return os.getenv("MUX_TOKEN_ID"), os.getenv("MUX_TOKEN_SECRET")


def verify_mux_signature(payload: bytes, header: str, secret: str, now=None) -> bool:
    """Checks a `Mux-Signature: t=<unix time>,v1=<hex hmac-sha256>` header over `<t>.<body>`."""
    if not header or not secret:
        return False
    parts = dict(p.split("=", 1) for p in header.split(",") if "=" in p)
    timestamp, signature = parts.get("t"), parts.get("v1")
    if not timestamp or not signature:
        return False
    try:
        age = abs((now if now is not None else time.time()) - int(timestamp))
    except ValueError:
        return False
    if age > WEBHOOK_TOLERANCE_SECONDS:
        return False
    expected = hmac.new(secret.encode(), f"{timestamp}.".encode() + payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


@require_POST
def createUploadUrl(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "authentication required"}, status=401)
    if not request.user.is_staff:
        return JsonResponse({"error": "Forbidden"}, status=403)

    name = request.POST.get("name")
    price_raw = request.POST.get("price")
    downloadable_raw = request.POST.get("downloadable")
    language = request.POST.get("language") or "English"

    if not name or not price_raw:
        return JsonResponse({"error": "Missing required fields"}, status=400)
    if language not in Series.Language.values:
        return JsonResponse({"error": "Invalid language"}, status=400)

    try:
        price = int(float(price_raw))
    except ValueError:
        return JsonResponse({"error": "Invalid price"}, status=400)
    if price < 0:
        return JsonResponse({"error": "Invalid price"}, status=400)

    downloadable = (downloadable_raw or "").lower() in ("true", "1")

    mux_id, mux_secret = _mux_credentials()
    if not mux_id or not mux_secret:
        return JsonResponse({"error": "video hosting is not configured"}, status=503)

    configuration = mux_python.Configuration()
    configuration.username = mux_id
    configuration.password = mux_secret
    uploads_api = mux_python.DirectUploadsApi(mux_python.ApiClient(configuration))

    create_upload_request = mux_python.CreateUploadRequest(
        new_asset_settings=mux_python.CreateAssetRequest(
            playback_policies=[mux_python.PlaybackPolicy.PUBLIC],
            video_quality="basic",
        ),
        cors_origin=os.getenv("FRONTEND_ORIGIN", "*"),
    )

    try:
        upload_data = uploads_api.create_direct_upload(create_upload_request).data
    except mux_python.ApiException:
        return JsonResponse({"error": "Mux upload creation failed"}, status=502)

    with transaction.atomic():
        series = Series.objects.create(name=name, price=price, downloadable=downloadable, language=language)
        course = VideoCourse.objects.create(
            name=name,
            course=series,
            downloadable=downloadable,
            language=language,
            upload_id=upload_data.id,
            status=VideoCourse.Status.PROCESSING,
        )

    return JsonResponse({"upload_url": upload_data.url, "course_id": course.id, "series_id": series.id})


@csrf_exempt  # called by Mux, not a browser; authenticated by the signature check below
@require_POST
def mux_webhook(request):
    secret = os.environ.get("MUX_WEBHOOK_SECRET")
    if not secret:
        return JsonResponse({"error": "webhook is not configured"}, status=503)

    if not verify_mux_signature(request.body, request.headers.get("Mux-Signature", ""), secret):
        return JsonResponse({"error": "Invalid signature"}, status=400)

    try:
        event = json.loads(request.body)
    except ValueError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    event_type = event.get("type")
    data = event.get("data") or {}

    if event_type == "video.asset.ready":
        upload_id = data.get("upload_id")
        playback_ids = data.get("playback_ids") or []
        if not upload_id or not playback_ids:
            return JsonResponse({"error": "Missing upload_id or playback_ids"}, status=400)

        try:
            course = VideoCourse.objects.get(upload_id=upload_id)
        except VideoCourse.DoesNotExist:
            return JsonResponse({"status": "no matching course"}, status=200)

        course.playback_id = playback_ids[0].get("id", "")
        course.manage_id = data.get("id", "")
        course.status = VideoCourse.Status.READY
        course.save()

    elif event_type == "video.asset.errored":
        VideoCourse.objects.filter(upload_id=data.get("upload_id")).update(status=VideoCourse.Status.FAILED)

    return JsonResponse({"status": "ok"}, status=200)
