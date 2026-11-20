"""
Phase 3 named functions: placing orders, guest device keys, booking pages and the member's own lists.
Registered into the same table as main/rpc.py (imported from main/urls.py).
"""
import datetime

from django.db import transaction
from django.utils import timezone

from . import checkout, fulfil
from .checkout import LIVE, SOLD, starts_at_for
from .models import (CourseAccess, Gift, Order, OrderAccessKey, User, Workshop, WorkshopLink)
from .permissions import ApiError
from .rpc import course_files_payload, rpc
from .security import client_ip, rate_limited, sha256_hex
from .serialize import jsonable, row_dict

HOUR = datetime.timedelta(hours=1)
RELEASE_BEFORE = datetime.timedelta(hours=2)
CLOSES_AFTER = datetime.timedelta(hours=6)


def _arg(a):
    """The website sends {p: {...}}; accept a bare object too."""
    p = a.get("p")
    return p if isinstance(p, dict) else a


# ------------------------------------------------------------------ placing orders

@rpc("check_booking")
def check_booking(user, a, request):
    """Checks a booking without saving anything."""
    p = _arg(a)
    from .models import SiteSettings
    s = SiteSettings.get()
    checkout.clean_details(p, s, user)
    cart = checkout.build_cart(p, user, s)
    checkout.clean_delivery(p, cart["kind"], user)
    return {"ok": True}


@rpc("place_order")
def place_order(user, a, request):
    if rate_limited("place_order", client_ip(request), 30, 3600):
        raise ApiError("rate_limited", 429)
    out = checkout.create_order(_arg(a), user)
    fulfil.after_paid([out["ref"]])  # video link + confirmation email; never blocks the booking
    return out


@rpc("order_status")
def order_status(user, a, request):
    """Only status, item and amount: no names, emails or phones."""
    o = Order.objects.filter(ref=str(a.get("p_ref") or "").upper()).first()
    if o is None:
        return None
    return {"ref": o.ref, "status": o.status, "item_title": o.item_title, "kind": o.kind,
            "charge_amount_cents": o.charge_amount_cents, "charge_currency": o.charge_currency or None}


# ------------------------------------------------------------------ guest device keys

def _key_matches(ref, key):
    return bool(key) and OrderAccessKey.objects.filter(ref=ref, key_hash=sha256_hex(key)).exists()


@rpc("register_access")
def register_access(user, a, request):
    """Remember this device's key for orders made in the last few minutes (and never overwrite an existing key)."""
    refs = [str(r).upper() for r in (a.get("p_refs") or []) if r][:10]
    key = str(a.get("p_key") or "")
    if not refs or not (32 <= len(key) <= 128):
        raise ApiError("invalid access key")
    if rate_limited("register_access", client_ip(request), 30, 3600):
        raise ApiError("rate_limited", 429)
    since = timezone.now() - datetime.timedelta(minutes=10)
    done = 0
    for o in Order.objects.filter(ref__in=refs, created_at__gte=since):
        if OrderAccessKey.objects.filter(ref=o.ref).exists():
            continue
        OrderAccessKey.objects.get_or_create(ref=o.ref, key_hash=sha256_hex(key))
        done += 1
    return done


@rpc("email_has_account")
def email_has_account(user, a, request):
    if rate_limited("email_has_account", client_ip(request), 10, 600):
        raise ApiError("rate_limited", 429)
    email = str(a.get("p_email") or "").strip()
    return bool(email) and User.objects.filter(email__iexact=email).exists()


# ------------------------------------------------------------------ booking page

def booking_dict(o, mine=False, key_ok=False, now=None):
    """
    A booking as the website shows it. The joining link rules:
      1:1 session : the link comes with the reference, until 6 h after the start.
      workshop    : only the owner (signed in, or this device's key), from 2 h before to 6 h after the start.
    """
    now = now or timezone.now()
    paid = o.status in SOLD
    start = starts_at_for(o)
    out = {
        "ref": o.ref, "kind": o.kind, "item_id": str(o.item_id) if o.item_id else None, "item_title": o.item_title,
        "status": o.status, "paid": paid, "starts_at": start.isoformat() if start else None,
        "session_timezone": o.session_timezone, "charge_amount_cents": o.charge_amount_cents,
        "charge_currency": o.charge_currency or None, "amount_usd": float(o.amount_usd),
        "mine": bool(mine), "guest": o.user_id is None, "released": False, "release_at": None, "join_url": None,
    }
    if start is None or not paid:
        return out
    ends = start + CLOSES_AFTER
    if o.kind == "session":
        out["release_at"] = o.created_at.isoformat()
        out["released"] = now <= ends
        if out["released"] and o.join_url:
            out["join_url"] = o.join_url
    else:
        release = start - RELEASE_BEFORE
        out["release_at"] = release.isoformat()
        out["released"] = release <= now <= ends
        if out["released"] and (mine or key_ok):
            link = WorkshopLink.objects.filter(workshop_id=o.item_id).first()
            if link and link.join_link:
                out["join_url"] = link.join_link
    return out


@rpc("booking_page")
def booking_page(user, a, request):
    if rate_limited("booking_page", client_ip(request), 120, 600):
        raise ApiError("rate_limited", 429)
    o = Order.objects.filter(ref=str(a.get("p_ref") or "").upper()).first()
    if o is None or o.kind not in ("session", "workshop") or o.status in ("cancelled", "refunded"):
        return None
    mine = bool(user and o.user_id == user.pk)
    return booking_dict(o, mine=mine, key_ok=_key_matches(o.ref, str(a.get("p_key") or "")))


# ------------------------------------------------------------------ the member's own things

@rpc("my_orders", auth=True)
def my_orders(user, a, request):
    return [booking_dict(o, mine=True) | {"created_at": o.created_at.isoformat()}
            for o in Order.objects.filter(user=user).exclude(status__in=["cancelled", "refunded"])]


@rpc("my_library", auth=True)
def my_library(user, a, request):
    out = []
    for acc in CourseAccess.objects.filter(user=user).select_related("course").order_by("-created_at"):
        item = row_dict(acc.course)
        item.update(course_files_payload(user, acc.course_id))
        item["source"] = acc.source
        item["acquired_at"] = acc.created_at.isoformat()
        out.append(item)
    return out


@rpc("my_gifts", auth=True)
def my_gifts(user, a, request):
    return [{"token": g.token, "mode": g.mode, "recipient_name": g.recipient_name,
             "recipient_email": g.recipient_email, "redeemed": g.redeemed_at is not None,
             "title": g.course.title, "title_ar": g.course.title_ar, "created_at": g.created_at.isoformat()}
            for g in Gift.objects.filter(order__user=user).select_related("course")]


@rpc("my_payments", auth=True)
def my_payments(user, a, request):
    return [{"ref": o.ref, "kind": o.kind, "item_title": o.item_title, "status": o.status,
             "amount_usd": float(o.amount_usd), "charge_amount_cents": o.charge_amount_cents,
             "charge_currency": o.charge_currency or None,
             "paid_at": o.paid_at.isoformat() if o.paid_at else None}
            for o in Order.objects.filter(user=user, status__in=list(SOLD) + ["refunded"])]


@rpc("my_display_name", auth=True)
def my_display_name(user, a, request):
    o = Order.objects.filter(user=user).exclude(customer_name="").first()
    return o.customer_name if o else ""


def _attach(o, user):
    o.user = user
    o.save(update_fields=["user", "updated_at"])
    if o.kind == "course" and o.status in SOLD:
        CourseAccess.objects.get_or_create(user=user, course_id=o.item_id, defaults={"source": "order", "order": o})


@rpc("claim_my_orders", auth=True)
def claim_my_orders(user, a, request):
    """Attach earlier guest orders made with this member's CONFIRMED email."""
    if not user.email_confirmed_at:
        return 0
    n = 0
    with transaction.atomic():
        for o in Order.objects.select_for_update().filter(user__isnull=True, email__iexact=user.email):
            _attach(o, user)
            n += 1
    return n


@rpc("claim_with_keys", auth=True)
def claim_with_keys(user, a, request):
    """Attach the bookings paid for on this device (proved by the private key, even if the email differs)."""
    if rate_limited("claim_keys", str(user.pk), 20, 3600):
        raise ApiError("rate_limited", 429)
    n = 0
    pairs = a.get("p_pairs") if isinstance(a.get("p_pairs"), list) else []
    with transaction.atomic():
        for pair in pairs[:20]:
            if not isinstance(pair, dict):
                continue
            ref, key = str(pair.get("ref") or "").upper(), str(pair.get("key") or "")
            o = Order.objects.select_for_update().filter(ref=ref, user__isnull=True).first()
            if o and _key_matches(ref, key):
                _attach(o, user)
                n += 1
    return n


# ------------------------------------------------------------------ gifts

def _gift_status(g):
    if g.redeemed_at is not None:
        return "redeemed"
    return "ready" if g.order.status in SOLD else "unpaid"


@rpc("gift_info")
def gift_info(user, a, request):
    if rate_limited("gift_info", client_ip(request), 60, 600):
        raise ApiError("rate_limited", 429)
    g = Gift.objects.filter(token=str(a.get("p_token") or "")).select_related("course", "order").first()
    if g is None:
        return None
    c = g.course
    return {"status": _gift_status(g), "sender_name": g.sender_name, "message": g.message,
            "course": {"id": str(c.pk), "title": c.title, "title_ar": c.title_ar, "type": c.type,
                       "image_url": c.image_url}}


@rpc("redeem_gift", auth=True)
def redeem_gift(user, a, request):
    if rate_limited("redeem_gift", str(user.pk), 20, 3600):
        raise ApiError("rate_limited", 429)
    with transaction.atomic():
        g = (Gift.objects.select_for_update(of=("self",)).filter(token=str(a.get("p_token") or ""))
             .select_related("course", "order").first())
        if g is None:
            raise ApiError("gift not found", 404)
        if g.order.status not in SOLD:
            raise ApiError("gift not paid")
        if g.redeemed_at is not None:
            raise ApiError("gift already claimed")
        g.redeemed_by, g.redeemed_at = user, timezone.now()
        g.save(update_fields=["redeemed_by", "redeemed_at"])
        CourseAccess.objects.get_or_create(user=user, course=g.course, defaults={"source": "gift"})
    return {"title": g.course.title}
