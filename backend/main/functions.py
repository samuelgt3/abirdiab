"""The website's "functions": geo, setup-status ... (POST /api/fn/<name>). Errors look like {"error": "<code>"}."""
import functools
import ipaddress
import os

import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .permissions import ApiError, is_admin_user, json_body
from .tokens import user_from_request


def fn(*, auth=False, admin=False, methods=("POST", "GET")):
    def deco(f):
        @csrf_exempt
        @functools.wraps(f)
        def wrapper(request, *args, **kwargs):
            if request.method == "OPTIONS":
                return JsonResponse({})
            if request.method not in methods:
                return JsonResponse({"error": "method not allowed"}, status=405)
            try:
                user = user_from_request(request)
                if (auth or admin) and user is None:
                    raise ApiError("sign in required", 401)
                if admin and not is_admin_user(user):
                    raise ApiError("forbidden", 403)
                request.api_user = user
                return JsonResponse(f(request, user), safe=False)
            except ApiError as e:
                return JsonResponse({"error": e.message}, status=e.status)
        return wrapper
    return deco


def _visitor_ip(request):
    fwd = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR", "")) or ""


@fn()
def geo(request, user):
    """Visitor's country from their IP, used to show prices in their currency."""
    cc = (request.META.get("HTTP_CF_IPCOUNTRY") or "").upper()  # Cloudflare sends this for free
    if len(cc) == 2 and cc.isalpha() and cc not in ("XX", "T1"):
        return {"country": cc}
    ip = _visitor_ip(request)
    try:
        if ip and ipaddress.ip_address(ip).is_global:
            r = requests.get(f"https://api.country.is/{ip}", timeout=2)
            if r.ok:
                cc = str(r.json().get("country") or "").upper()
                if len(cc) == 2 and cc.isalpha():
                    return {"country": cc}
    except Exception:
        pass
    return {"country": None}


def _set(*names):
    return all(bool(os.environ.get(n)) for n in names)


@fn(admin=True)
def setup_status(request, user):
    """Yes/no for what is connected. Never the values themselves."""
    return {
        "email": _set("RESEND_API_KEY"),
        "email_from": _set("MAIL_FROM"),
        "reminders": _set("CRON_SECRET"),
        "sms": _set("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SID"),
        "paymob": _set("PAYMOB_SECRET_KEY", "PAYMOB_PUBLIC_KEY", "PAYMOB_HMAC_SECRET", "PAYMOB_INTEGRATION_IDS"),
        "site_url": _set("SITE_URL"),
        "zoom": _set("ZOOM_ACCOUNT_ID", "ZOOM_CLIENT_ID", "ZOOM_CLIENT_SECRET"),
    }
