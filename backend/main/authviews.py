"""Sign up, sign in, password reset, email confirmation. Mirrors what the website used to get from Supabase Auth."""
import uuid
from urllib.parse import urlencode, urlparse

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import HttpResponseRedirect
from django.utils import timezone

from .mailer import send_email
from .models import AdminEmail
from .permissions import ApiError, api, json_body
from .security import client_ip, password_problem, rate_limited
from .tokens import decode_token, make_session, make_token, public_user

User = get_user_model()

# The only profile fields a person may store about themselves.
PROFILE_KEYS = {"full_name", "phone", "phone_dial", "country", "marketing_opt_in", "accepted_privacy_at", "lang"}
LINK_SECONDS = 60 * 60 * 24  # confirmation / reset links last 24 hours


def clean_profile(data) -> dict:
    if not isinstance(data, dict):
        return {}
    out = {}
    for k in PROFILE_KEYS:
        if k in data:
            v = data[k]
            out[k] = v if isinstance(v, (bool, int)) else str(v or "")[:200]
    return out


def safe_redirect(url) -> str:
    """Links in emails may only lead back to the real website."""
    default = f"{settings.SITE_URL}/account"
    if not url:
        return default
    p = urlparse(str(url))
    origin = f"{p.scheme}://{p.netloc}"
    return str(url) if origin in settings.SITE_URLS else default


def _email_ok(email: str) -> bool:
    try:
        validate_email(email)
        return len(email) <= 254
    except ValidationError:
        return False


def _link(request, typ: str, user, redirect_to: str) -> str:
    token = make_token(user, typ, LINK_SECONDS)
    base = request.build_absolute_uri("/api/auth/verify")
    return f"{base}?{urlencode({'token': token, 'type': typ, 'redirect_to': redirect_to})}"


_TEXT = {
    "signup": {
        "en": ("Confirm your email", "Welcome to Abir Diab. Please confirm your email address:"),
        "ar": ("أكّد بريدك الإلكتروني", "مرحبًا بك في موقع عبير دياب. يرجى تأكيد بريدك الإلكتروني:"),
    },
    "recovery": {
        "en": ("Reset your password", "Use this link to choose a new password:"),
        "ar": ("إعادة تعيين كلمة المرور", "استخدم هذا الرابط لاختيار كلمة مرور جديدة:"),
    },
}


def _send_link_email(kind: str, user, link: str) -> None:
    lang = "ar" if (user.user_metadata or {}).get("lang") == "ar" else "en"
    subject, intro = _TEXT[kind][lang]
    text = f"{intro}\n\n{link}\n"
    d = ' dir="rtl"' if lang == "ar" else ""
    html = f'<div{d}><p>{intro}</p><p><a href="{link}">{subject}</a></p></div>'
    send_email(user.email, subject, text, html)


@api()
def signup(request):
    body = json_body(request)
    email = str(body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not _email_ok(email):
        raise ApiError("invalid email")
    if rate_limited("signup", client_ip(request), 10, 3600):
        raise ApiError("rate_limited", 429)
    problem = password_problem(password)
    if problem:
        raise ApiError(problem)
    redirect_to = safe_redirect(body.get("redirect_to"))

    existing = User.objects.filter(email__iexact=email).first()
    if existing is not None:
        # Do not reveal that the address has an account: answer like a fresh sign-up with no identities.
        if not existing.email_confirmed_at:
            _send_link_email("signup", existing, _link(request, "signup", existing, redirect_to))
        return {"user": {"id": str(uuid.uuid4()), "email": email, "identities": []}, "session": None}

    user = User.objects.create_user(email, password, user_metadata=clean_profile(body.get("data")))
    if settings.AUTO_CONFIRM_EMAIL and not AdminEmail.objects.filter(email=email).exists():
        # no email link needed: sign them straight in. Admin emails still have to be confirmed, so nobody can take one over.
        user.email_confirmed_at = timezone.now()
        user.save(update_fields=["email_confirmed_at"])
        return {"user": public_user(user), "session": make_session(user)}
    _send_link_email("signup", user, _link(request, "signup", user, redirect_to))
    return {"user": public_user(user), "session": None}  # no session until the email is confirmed


@api()
def token(request):
    body = json_body(request)
    grant = body.get("grant_type") or request.GET.get("grant_type")
    if grant == "refresh_token":
        user = decode_token(str(body.get("refresh_token") or ""), "refresh")
        if user is None:
            raise ApiError("invalid refresh token", 401)
        return make_session(user)
    if grant != "password":
        raise ApiError("unsupported grant type")

    email = str(body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if rate_limited("login_ip", client_ip(request), 40, 900) or rate_limited("login_email", email, 10, 900):
        raise ApiError("rate_limited", 429)
    user = authenticate(request, username=email, password=password)
    if user is None:
        raise ApiError("Invalid login credentials", 400)
    if not user.email_confirmed_at:
        raise ApiError("Email not confirmed", 400)
    return make_session(user)


@api(auth=True)
def logout(request):
    """Sign out everywhere (every earlier login token stops working)."""
    user = request.api_user
    user.token_version += 1
    user.save(update_fields=["token_version"])
    return {}


@api()
def recover(request):
    body = json_body(request)
    email = str(body.get("email") or "").strip().lower()
    if not _email_ok(email):
        raise ApiError("invalid email")
    if rate_limited("recover_ip", client_ip(request), 10, 3600) or rate_limited("recover_email", email, 3, 3600):
        raise ApiError("rate_limited", 429)
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is not None:
        _send_link_email("recovery", user, _link(request, "recovery", user, safe_redirect(body.get("redirect_to"))))
    return {}  # same answer whether or not the address has an account


@api(methods=("GET",))
def verify(request):
    """The link inside confirmation / reset emails. Signs the person in and sends them back to the site."""
    typ = request.GET.get("type")
    redirect_to = safe_redirect(request.GET.get("redirect_to"))
    if typ not in ("signup", "recovery"):
        return HttpResponseRedirect(f"{redirect_to}#error=invalid_link")
    user = decode_token(request.GET.get("token", ""), typ)
    if user is None:
        return HttpResponseRedirect(f"{redirect_to}#error=link_expired")
    if typ == "signup" and not user.email_confirmed_at:
        user.email_confirmed_at = timezone.now()
        user.save(update_fields=["email_confirmed_at"])
    if typ == "recovery" and not user.email_confirmed_at:
        # They proved they own the inbox by opening the reset link.
        user.email_confirmed_at = timezone.now()
        user.save(update_fields=["email_confirmed_at"])
    s = make_session(user)
    frag = urlencode({
        "access_token": s["access_token"], "refresh_token": s["refresh_token"], "expires_in": s["expires_in"],
        "expires_at": s["expires_at"], "token_type": "bearer", "type": typ,
    })
    return HttpResponseRedirect(f"{redirect_to}#{frag}")


@api(auth=True, methods=("GET", "PUT"))
def me(request):
    user = request.api_user
    if request.method == "GET":
        return {"user": public_user(user)}
    body = json_body(request)
    changed_password = False
    if body.get("password") is not None:
        problem = password_problem(body["password"])
        if problem:
            raise ApiError(problem)
        user.set_password(body["password"])
        user.token_version += 1  # every other device is signed out
        changed_password = True
    if "data" in body:
        user.user_metadata = {**(user.user_metadata or {}), **clean_profile(body["data"])}
    user.save()
    out = {"user": public_user(user)}
    if changed_password:
        out["session"] = make_session(user)  # this device keeps working with fresh tokens
    return out
