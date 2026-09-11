from .models import VideoCourse
from django.http import JsonResponse
import mux_python
import os
from dotenv import load_dotenv
import json
from django.views.decorators.csrf import csrf_exempt

load_dotenv()
mux_user=os.getenv('MUX_TOKEN_ID')
mux_pass=os.getenv('MUX_TOKEN_SECRET')


def createUploadUrl(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "Forbidden"}, status=403)

    name = request.POST.get("name")
    description = request.POST.get("description")
    price_raw = request.POST.get("price")
    downloadable_raw = request.POST.get("downloadable")
    language = request.POST.get("language")

    if not name or not price_raw:
        return JsonResponse({"error": "Missing required fields"}, status=400)

    try:
        price = float(price_raw)
    except ValueError:
        return JsonResponse({"error": "Invalid price"}, status=400)

    downloadable = downloadable_raw in ("true", "1", "True")

    configuration = mux_python.Configuration()
    configuration.username = mux_user
    configuration.password = mux_pass
    uploads_api = mux_python.DirectUploadsApi(mux_python.ApiClient(configuration))

    create_asset_settings = mux_python.CreateAssetRequest(
        playback_policies=[mux_python.PlaybackPolicy.PUBLIC],
        video_quality="basic",
    )
    create_upload_request = mux_python.CreateUploadRequest(
        new_asset_settings=create_asset_settings,
        cors_origin="*",  # tighten to actual frontend origin in production
    )

    try:
        upload_response = uploads_api.create_direct_upload(create_upload_request)
    except mux_python.ApiException as e:
        return JsonResponse({"error": "Mux upload creation failed"}, status=502)

    upload_data = upload_response.data
    upload_id = upload_data.id
    upload_url = upload_data.url

    course = VideoCourse.objects.create(
        name=name,
        description=description,
        price=price,
        downloadable=downloadable,
        language=language,
        upload_id=upload_id,  
        status=VideoCourse.Status.PROCESSING,
    )

    return JsonResponse({"upload_url": upload_url, "course_id": course.id})


@csrf_exempt  
def mux_webhook(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    payload = request.body
    signature_header = request.headers.get("Mux-Signature")
    webhook_secret = os.environ["MUX_WEBHOOK_SECRET"]

    try:
        event = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid signature"}, status=400)  # reject, don't process

    event_type = event.get("type")
    data = event.get("data", {})

    if event_type == "video.asset.ready":
        upload_id = data.get("upload_id")
        asset_id = data.get("id")
        playback_ids = data.get("playback_ids", [])

        if not upload_id or not playback_ids:
            return JsonResponse({"error": "Missing upload_id or playback_ids"}, status=400)

        playback_id = playback_ids[0].get("id")

        try:
            course = VideoCourse.objects.get(upload_id=upload_id)
        except VideoCourse.DoesNotExist:
            return JsonResponse({"status": "no matching course"}, status=200)

        course.playback_id = playback_id
        course.manage_id = asset_id
        course.status = VideoCourse.Status.READY
        course.save()

    elif event_type == "video.asset.errored":
        upload_id = data.get("upload_id")
        try:
            course = VideoCourse.objects.get(upload_id=upload_id)
            course.status = VideoCourse.Status.FAILED
            course.save()
        except VideoCourse.DoesNotExist:
            pass

    return JsonResponse({"status": "ok"}, status=200)