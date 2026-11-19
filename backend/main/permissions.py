"""Who is allowed to do what."""
import functools
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import AdminEmail
from .tokens import user_from_request


def is_admin_user(user) -> bool:
    """An admin is a signed-in user whose CONFIRMED email is on the allow-list."""
    if user is None or not user.email_confirmed_at:
        return False
    return AdminEmail.objects.filter(email=user.email.strip().lower()).exists()


class ApiError(Exception):
    """Raise anywhere in an API view; the message must be one of the phrases the website understands."""

    def __init__(self, message, status=400, code=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.code = code


def json_body(request) -> dict:
    if not request.body:
        return {}
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        raise ApiError("invalid json")
    if not isinstance(data, dict):
        raise ApiError("invalid json")
    return data


def api(*, auth=False, admin=False, methods=("POST",)):
    """Wrap a view: JSON in/out, friendly errors, optional login / admin check. No cookies => no CSRF."""

    def deco(fn):
        @csrf_exempt
        @functools.wraps(fn)
        def wrapper(request, *args, **kwargs):
            if request.method == "OPTIONS":
                return JsonResponse({})
            if request.method not in methods:
                return JsonResponse({"message": "method not allowed"}, status=405)
            try:
                user = user_from_request(request)
                if (auth or admin) and user is None:
                    raise ApiError("sign in required", 401)
                if admin and not is_admin_user(user):
                    raise ApiError("forbidden", 403)
                request.api_user = user
                result = fn(request, *args, **kwargs)
                if hasattr(result, "status_code"):
                    return result
                return JsonResponse(result, safe=False)
            except ApiError as e:
                body = {"message": e.message}
                if e.code:
                    body["code"] = e.code
                return JsonResponse(body, status=e.status)

        return wrapper

    return deco
