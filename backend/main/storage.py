"""
File storage, same idea as the old two buckets:
  media       public to read, admin writes  (pictures, audio samples shown on the site)
  paid-files  private; opened only through a short-lived signed link, and only by someone who owns the course

Files live in folders on the server's disk (settings.MEDIA_ROOT / PRIVATE_FILES_ROOT).
IMPORTANT for hosting: that disk must be persistent (a normal server or a mounted volume), not a temporary one.
"""
import mimetypes
import re
import time
from pathlib import Path

import jwt
from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from . import access
from .models import AdminAudit
from .permissions import ApiError, api, is_admin_user, json_body
from .tokens import user_from_request

BUCKETS = {"media": "MEDIA_ROOT", "paid-files": "PRIVATE_FILES_ROOT"}

# SVG and HTML are left out on purpose: they can carry scripts.
ALLOWED = {
    "media": {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp3", ".m4a", ".wav", ".ogg", ".aac"},
    "paid-files": {".pdf", ".zip", ".epub", ".docx", ".mp3", ".m4a", ".wav", ".mp4"},
}
_SEGMENT = re.compile(r"^[\w][\w.\- ]{0,150}$", re.UNICODE)


def _root(bucket) -> Path:
    if bucket not in BUCKETS:
        raise ApiError("unknown bucket", 404)
    root = Path(getattr(settings, BUCKETS[bucket]))
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def _resolve(bucket, path) -> Path:
    """Path inside the bucket folder, never outside it."""
    path = str(path or "")
    parts = path.split("/")
    if not path or len(path) > 300 or not all(_SEGMENT.match(p) and p not in (".", "..") and ".." not in p for p in parts):
        raise ApiError("invalid path")
    root = _root(bucket)
    full = (root / path).resolve()
    if root not in full.parents:
        raise ApiError("invalid path")
    return full


# ------------------------------------------------------------------ admin: upload / remove

@api(admin=True)
def upload(request, bucket):
    f = request.FILES.get("file")
    if f is None:
        raise ApiError("no file")
    full = _resolve(bucket, request.POST.get("path"))
    if full.suffix.lower() not in ALLOWED[bucket]:
        raise ApiError("this file type is not allowed", 415)
    if f.size > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise ApiError(f"file is larger than {settings.MAX_UPLOAD_MB} MB", 413)
    if full.exists() and request.POST.get("upsert") != "true":
        raise ApiError("The resource already exists", 409)
    full.parent.mkdir(parents=True, exist_ok=True)
    with open(full, "wb") as out:
        for chunk in f.chunks():
            out.write(chunk)
    user = request.api_user
    AdminAudit.objects.create(actor=user.id, actor_email=user.email, table_name=f"storage:{bucket}", op="upload",
                              row_id=request.POST.get("path", "")[:100], summary=f"Uploaded {full.name}")
    return {"path": request.POST.get("path")}


@api(admin=True)
def remove(request, bucket):
    paths = json_body(request).get("paths") or []
    if not isinstance(paths, list) or len(paths) > 100:
        raise ApiError("invalid paths")
    removed = 0
    for p in paths:
        full = _resolve(bucket, p)
        if full.is_file():
            full.unlink()
            removed += 1
    return {"removed": removed}


# ------------------------------------------------------------------ public media

def public_media(request, path):
    try:
        full = _resolve("media", path)
    except ApiError:
        raise Http404
    if not full.is_file():
        raise Http404
    resp = FileResponse(open(full, "rb"), content_type=mimetypes.guess_type(full.name)[0] or "application/octet-stream")
    resp["Cache-Control"] = "public, max-age=86400"
    resp["X-Content-Type-Options"] = "nosniff"
    resp["Cross-Origin-Resource-Policy"] = "cross-origin"
    return resp


# ------------------------------------------------------------------ private files

def _sign(path, seconds):
    now = int(time.time())
    return jwt.encode({"typ": "file", "path": path, "iat": now, "exp": now + seconds}, settings.JWT_SECRET, algorithm="HS256")


@api()
def sign(request):
    """A short-lived download link, only for someone allowed to open the file."""
    body = json_body(request)
    path = str(body.get("path") or "")
    _resolve("paid-files", path)  # validates the shape
    user = request.api_user
    if not access.can_read_course_file(user, path):
        raise ApiError("not allowed", 403)
    seconds = max(60, min(int(body.get("expiresIn") or 3600), 3600))
    url = request.build_absolute_uri("/api/storage/v1/object/sign/paid-files/download")
    return {"signedUrl": f"{url}?token={_sign(path, seconds)}"}


@csrf_exempt
def download(request):
    try:
        data = jwt.decode(request.GET.get("token", ""), settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return HttpResponse("This link has expired.", status=403)
    if data.get("typ") != "file":
        return HttpResponse("This link has expired.", status=403)
    try:
        full = _resolve("paid-files", data.get("path"))
    except ApiError:
        raise Http404
    if not full.is_file():
        raise Http404
    resp = FileResponse(open(full, "rb"), content_type=mimetypes.guess_type(full.name)[0] or "application/octet-stream")
    resp["Cache-Control"] = "private, no-store"
    resp["X-Content-Type-Options"] = "nosniff"
    return resp
