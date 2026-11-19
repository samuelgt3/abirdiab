"""
The "named functions" the website calls (the old `rpc(...)` calls).  POST /api/rpc/<name>   body = arguments.
The answer is {"data": ...}; failures are {"message": "<one of the phrases the website understands>"}.
"""
import datetime
import math
from dataclasses import dataclass
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db.models import Q
from django.utils import timezone

from . import access, bunny
from .models import (AvailabilitySlot, CheckoutHold, Course, CourseActivity, CourseFile, LessonProgress,
                     NewsletterSubscriber, Order, SiteSettings, TestimonialSubmission, Workshop)
from .permissions import ApiError, api, is_admin_user, json_body
from .security import client_ip, rate_limited


@dataclass
class Rpc:
    fn: callable
    auth: bool = False


RPCS = {}


def rpc(name, auth=False):
    def deco(fn):
        RPCS[name] = Rpc(fn, auth)
        return fn
    return deco


@api()
def call(request, name):
    spec = RPCS.get(name)
    if spec is None:
        raise ApiError("not implemented", 501)
    user = request.api_user
    if spec.auth and user is None:
        raise ApiError("sign in required", 401)
    return {"data": spec.fn(user, json_body(request), request)}


SOLD = ("paid", "confirmed", "completed")
LIVE_ORDER = ~Q(status__in=["cancelled", "refunded"])


# ------------------------------------------------------------------ settings, admin

@rpc("public_settings")
def public_settings(user, a, request):
    s = SiteSettings.get()
    return {
        "payments_enabled": s.payments_enabled, "payment_test_mode": s.payment_test_mode,
        "emails_enabled": s.emails_enabled, "google_signin_enabled": s.google_signin_enabled,
        "require_email_verification": s.require_email_verification,
        "require_phone_verification": s.require_phone_verification,
        "payment_currency": s.payment_currency,
        "session_price_usd": float(s.session_price_usd) if s.session_price_usd is not None else None,
        "session_length": s.session_length, "session_length_ar": s.session_length_ar,
        "booking_times": s.booking_times, "booking_timezone": s.booking_timezone,
        "booking_days_ahead": s.booking_days_ahead, "booking_weekdays": s.booking_weekdays,
    }  # never includes session_link_base or anything secret


@rpc("is_admin")
def is_admin(user, a, request):
    return is_admin_user(user)


# ------------------------------------------------------------------ booking availability

@rpc("available_slots")
def available_slots(user, a, request):
    s = SiteSettings.get()
    tz = ZoneInfo(s.booking_timezone)
    now = timezone.now()
    today = now.astimezone(tz).date()
    last = today + datetime.timedelta(days=s.booking_days_ahead)
    taken = {(o.session_date, o.session_time) for o in Order.objects.filter(
        LIVE_ORDER, kind="session", session_date__gte=today)}
    taken |= {(h.slot_date, h.slot_time) for h in CheckoutHold.objects.filter(
        kind="session", expires_at__gt=now, slot_date__gte=today)}
    out = []
    for sl in AvailabilitySlot.objects.filter(slot_date__gte=today, slot_date__lte=last):
        if (sl.slot_date.isoweekday() % 7) not in s.booking_weekdays:  # website numbering: Sunday = 0
            continue
        if (sl.slot_date, sl.slot_time) in taken:
            continue
        try:
            h, mi = (int(x) for x in sl.slot_time.split(":"))
            starts = datetime.datetime.combine(sl.slot_date, datetime.time(h, mi), tzinfo=tz)
        except ValueError:
            continue
        if starts <= now:
            continue
        out.append({"date": sl.slot_date.isoformat(), "time": sl.slot_time})
    return out


@rpc("workshop_seats")
def workshop_seats(user, a, request):
    """Seats shown to visitors: 1 per 5 real seats left (rounded up), never the exact count."""
    now = timezone.now()
    out = {}
    for w in Workshop.objects.filter(published=True):
        sold = Order.objects.filter(kind="workshop", item_id=w.id, status__in=SOLD).count()
        held = CheckoutHold.objects.filter(workshop=w, expires_at__gt=now).count()
        left = max(0, w.spots - sold - held)
        out[str(w.id)] = {"shown": math.ceil(left / 5), "sold_out": left <= 0}
    return out


# ------------------------------------------------------------------ visitors

@rpc("submit_story")
def submit_story(user, a, request):
    p = a.get("p") if isinstance(a.get("p"), dict) else a
    if p.get("consent") is not True:
        return False
    story = str(p.get("story") or "").strip()
    if len(story) < 5 or len(story) > 4000:
        return False
    email = str(p.get("email") or "").strip().lower()
    if email:
        try:
            validate_email(email)
        except ValidationError:
            return False
    if rate_limited("story", client_ip(request), 5, 3600):
        raise ApiError("rate_limited", 429)
    TestimonialSubmission.objects.create(
        name=str(p.get("name") or "")[:120], email=email, service=str(p.get("service") or "")[:200],
        story=story, lang="ar" if p.get("lang") == "ar" else "en", consent=True)
    return True


# ------------------------------------------------------------------ members

@rpc("newsletter_subscribed", auth=True)
def newsletter_subscribed(user, a, request):
    return NewsletterSubscriber.objects.filter(email__iexact=user.email).exists()


@rpc("set_newsletter", auth=True)
def set_newsletter(user, a, request):
    email = user.email.strip().lower()
    if a.get("subscribe"):
        NewsletterSubscriber.objects.get_or_create(
            email=email, defaults={"lang": "ar" if a.get("lang") == "ar" else "en"})
        return True
    NewsletterSubscriber.objects.filter(email__iexact=email).delete()
    return False


@rpc("my_progress", auth=True)
def my_progress(user, a, request):
    return {
        "done": [{"course_id": str(r.course_id), "key": r.lesson_key, "at": r.completed_at.isoformat()}
                 for r in LessonProgress.objects.filter(user=user)],
        "opened": [{"course_id": str(r.course_id), "at": r.last_opened_at.isoformat()}
                   for r in CourseActivity.objects.filter(user=user)],
    }


def _owned_course_or_error(user, course_id):
    if not access.course_unlocked(user, course_id):  # also false for an unknown or malformed id
        raise ApiError("item not available")


@rpc("touch_course", auth=True)
def touch_course(user, a, request):
    _owned_course_or_error(user, a.get("p_course"))
    obj, created = CourseActivity.objects.get_or_create(user=user, course_id=a["p_course"])
    if not created:
        obj.save()  # moves "last opened" to now
    return None


@rpc("set_lesson_done", auth=True)
def set_lesson_done(user, a, request):
    _owned_course_or_error(user, a.get("p_course"))
    key = str(a.get("p_key") or "")[:100]
    if not key:
        raise ApiError("item not available")
    if a.get("p_done"):
        LessonProgress.objects.get_or_create(user=user, course_id=a["p_course"], lesson_key=key)
    else:
        LessonProgress.objects.filter(user=user, course_id=a["p_course"], lesson_key=key).delete()
    return None


# ------------------------------------------------------------------ materials

@rpc("course_unlocked")
def course_unlocked(user, a, request):
    return access.course_unlocked(user, a.get("p_course"))


@rpc("can_read_course_file")
def can_read_course_file(user, a, request):
    return access.can_read_course_file(user, str(a.get("p_name") or ""))


def course_files_payload(user, course_id):
    """What an authorised person may open: the private file path and a signed video link."""
    cf = CourseFile.objects.filter(course_id=course_id).first()
    if cf is None:
        return {"file_path": None, "video_id": None}
    out = {"file_path": cf.file_path or None, "video_id": cf.video_id or None}
    token, expires = bunny.signed_embed(cf.video_id)
    if token:
        out.update({"video_token": token, "video_expires": expires})
    return out


@rpc("course_access")
def course_access(user, a, request):
    cid = a.get("p_id")
    try:
        if not access.course_unlocked(user, cid):
            return None
    except (ValidationError, ValueError):
        return None
    return course_files_payload(user, cid)
