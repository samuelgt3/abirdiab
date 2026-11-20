"""One-time codes by email or phone, and creating an account once they were confirmed.
Email codes are made and checked here (only a hash is stored). Phone codes go through Twilio Verify."""
import datetime
import hmac
import os
import re
import secrets

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.utils import timezone

from .authviews import clean_profile
from .functions import fn
from .mailer import send_email
from .models import Verification
from .permissions import ApiError, json_body
from .security import client_ip, ip_hash, password_problem, rate_limited, sha256_hex

User = get_user_model()
CODE_MINUTES = 10
MAX_ATTEMPTS = 5

_TEXT = {
    "en": ("Your verification code", "Your Abir Diab verification code is {code}. It works for 10 minutes. If you did not ask for it, ignore this email."),
    "ar": ("رمز التحقق", "رمز التحقق الخاص بك في موقع عبير دياب هو {code}. صالح لمدة 10 دقائق. إذا لم تطلبه فتجاهل هذه الرسالة."),
}


def twilio_configured() -> bool:
    return all(os.environ.get(n) for n in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SID"))


def _twilio(path, data):
    sid = os.environ["TWILIO_VERIFY_SID"]
    return requests.post(f"https://verify.twilio.com/v2/Services/{sid}/{path}", data=data, timeout=12,
                         auth=(os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"]))


def _clean_target(kind, target):
    target = str(target or "").strip()
    if kind == "email":
        target = target.lower()
        try:
            validate_email(target)
        except ValidationError:
            raise ApiError("send_failed")
        return target
    digits = re.sub(r"\D", "", target)
    if not (7 <= len(digits) <= 15):
        raise ApiError("send_failed")
    return digits


def _hash(kind, target, code):
    return sha256_hex(f"{settings.SECRET_KEY}|{kind}|{target}|{code}")


@fn(methods=("POST",))
def send_code(request, user):
    b = json_body(request)
    kind = b.get("kind")
    if kind not in ("email", "phone"):
        raise ApiError("send_failed")
    target = _clean_target(kind, b.get("target"))
    if rate_limited("otp_ip", client_ip(request), 20, 3600) or rate_limited("otp_target", f"{kind}:{target}", 5, 3600):
        raise ApiError("rate_limited", 429)
    expires = timezone.now() + datetime.timedelta(minutes=CODE_MINUTES)
    if kind == "email":
        code = f"{secrets.randbelow(1_000_000):06d}"
        Verification.objects.create(kind="email", target=target, code_hash=_hash(kind, target, code), expires_at=expires,
                                    ip_hash=ip_hash(request))
        lang = "ar" if b.get("lang") == "ar" else "en"
        subject, body = _TEXT[lang]
        try:
            send_email(target, subject, body.format(code=code), f'<p dir="{"rtl" if lang == "ar" else "ltr"}">{body.format(code=code)}</p>')
        except Exception:
            raise ApiError("send_failed")
        return {"sent": True}
    if not twilio_configured():
        raise ApiError("not_configured", 503)
    channel = "whatsapp" if b.get("channel") == "whatsapp" else "sms"
    try:
        r = _twilio("Verifications", {"To": f"+{target}", "Channel": channel})
    except Exception:
        raise ApiError("send_failed")
    if not r.ok:
        raise ApiError("send_failed")
    Verification.objects.create(kind="phone", target=target, code_hash="", expires_at=expires, ip_hash=ip_hash(request))
    return {"sent": True}


@fn(methods=("POST",))
def check_code(request, user):
    b = json_body(request)
    kind = b.get("kind")
    if kind not in ("email", "phone"):
        raise ApiError("wrong_code")
    try:
        target = _clean_target(kind, b.get("target"))
    except ApiError:
        raise ApiError("wrong_code")
    code = re.sub(r"\D", "", str(b.get("code") or ""))
    if rate_limited("otp_check_ip", client_ip(request), 60, 3600):
        raise ApiError("rate_limited", 429)
    v = Verification.objects.filter(kind=kind, target=target, verified_at__isnull=True, used_at__isnull=True).order_by("-created_at").first()
    if v is None or len(code) != 6:
        raise ApiError("wrong_code")  # same answer whether or not a code was ever sent
    if v.expires_at <= timezone.now():
        raise ApiError("expired")
    if v.attempts >= MAX_ATTEMPTS:
        raise ApiError("too_many")
    v.attempts += 1
    v.save(update_fields=["attempts"])
    if kind == "email":
        ok = hmac.compare_digest(v.code_hash, _hash(kind, target, code))
    else:
        try:
            r = _twilio("VerificationCheck", {"To": f"+{target}", "Code": code})
            ok = r.ok and r.json().get("status") == "approved"
        except Exception:
            ok = False
    if not ok:
        raise ApiError("wrong_code")
    v.verified_at = timezone.now()
    v.save(update_fields=["verified_at"])
    return {"verified": True, "id": str(v.id)}


@fn(methods=("POST",))
def signup_verified(request, user):
    """Create a confirmed account in the middle of checkout, after the email code was checked."""
    b = json_body(request)
    email = str(b.get("email") or "").strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise ApiError("invalid email")
    if rate_limited("signup_verified", client_ip(request), 10, 3600):
        raise ApiError("rate_limited", 429)
    problem = password_problem(b.get("password"))
    if problem:
        raise ApiError(problem)
    vid = b.get("email_verification")
    v = Verification.objects.filter(pk=_uuid(vid), kind="email").first()
    if (v is None or v.verified_at is None or v.target != email
            or v.created_at < timezone.now() - datetime.timedelta(hours=1)):
        raise ApiError("verification required")  # the same code can still go into the order, so it is not used up here
    if User.objects.filter(email__iexact=email).exists():
        raise ApiError("exists")
    data = clean_profile(dict(b.get("data") or {}, **({"full_name": b["name"]} if b.get("name") else {})))
    u = User.objects.create_user(email, b.get("password"), user_metadata=data)
    u.email_confirmed_at = timezone.now()  # they proved the inbox with the code
    u.save(update_fields=["email_confirmed_at"])
    return {"created": True}


def _uuid(v):
    import uuid
    try:
        return uuid.UUID(str(v))
    except (ValueError, TypeError):
        return None
