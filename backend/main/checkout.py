"""
Checking out: cart rules, 30-minute holds, creating orders, and finishing a paid order.

Rules (from the hand-off): pay first, book after. An order row only exists once it is paid (or free).
Prices are always worked out here, never taken from the website. Holds keep no personal data.
"""
import datetime
import hmac
import json
import re
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import (AvailabilitySlot, CheckoutAttempt, CheckoutHold, Course, CourseAccess, Gift, Order,
                     PaymentEvent, SiteSettings, Verification, Workshop, WorkshopLink)
from .permissions import ApiError
from .security import sha256_hex

SOLD = ("paid", "confirmed", "completed")
LIVE = ("awaiting_payment", "paid", "confirmed", "completed")
HOLD_MINUTES = 30
MAX_SESSIONS = 5
TWO_PLACES = Decimal("0.01")
_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_TIME = re.compile(r"^\d{2}:\d{2}$")


def starts_at_for(order) -> datetime.datetime | None:
    """The moment a booking starts (timezone-aware), or None for courses and gifts."""
    if order.kind == "workshop":
        w = Workshop.objects.filter(pk=order.item_id).first()
        return w.starts_at if w else None
    if order.kind == "session" and order.session_date and order.session_time:
        return slot_start(order.session_date, order.session_time, order.session_timezone or "Asia/Dubai")
    return None


def slot_start(day, hm, tz_name):
    h, m = (int(x) for x in hm.split(":"))
    return datetime.datetime.combine(day, datetime.time(h, m), tzinfo=ZoneInfo(tz_name))


# ------------------------------------------------------------------ cleaning the customer's details

def clean_details(p, s, user):
    """Validate the person's details. Raises ApiError with one of the phrases the website understands."""
    name = str(p.get("customer_name") or "").strip()
    if len(name) < 2 or len(name) > 120:
        raise ApiError("invalid name")
    email = str(p.get("email") or "").strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise ApiError("invalid email")
    digits = re.sub(r"\D", "", str(p.get("phone") or ""))
    if not digits and s.require_phone_verification:
        raise ApiError("phone required")
    if digits and not (7 <= len(digits) <= 12):
        raise ApiError("invalid phone")
    lang = "ar" if p.get("lang") == "ar" else "en"
    country = str(p.get("country") or "").upper()[:2]
    return {
        "customer_name": name, "email": email, "phone": digits,
        "phone_country": str(p.get("phone_country") or "").upper()[:2],
        "phone_dial": re.sub(r"[^\d+]", "", str(p.get("phone_dial") or ""))[:8],
        "country": country if country.isalpha() else "", "lang": lang,
        "notes": str(p.get("notes") or "")[:2000],
        "display_currency": str(p.get("display_currency") or "").upper()[:3],
        "display_amount": _money_or_none(p.get("display_amount")),
    }


def _money_or_none(v):
    try:
        return Decimal(str(v)).quantize(TWO_PLACES) if v not in (None, "") else None
    except Exception:
        return None


def clean_delivery(p, kind, user):
    """How the joining link is delivered (sessions: chosen; workshops: guests get email only)."""
    if kind not in ("session", "workshop"):
        return {"delivery_method": "email", "delivery_to": ""}
    method = str(p.get("delivery_method") or "")
    if kind == "workshop" and user is None:
        method = "email"
    if method not in ("email", "whatsapp"):
        raise ApiError("delivery required")
    to = str(p.get("delivery_to") or "").strip()
    if method == "whatsapp":
        digits = re.sub(r"\D", "", to)
        if not (7 <= len(digits) <= 15):
            raise ApiError("invalid whatsapp")
        return {"delivery_method": "whatsapp", "delivery_to": digits}
    email = to.lower() or str(p.get("email") or "").strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise ApiError("invalid email")
    return {"delivery_method": "email", "delivery_to": email}


# ------------------------------------------------------------------ the cart

def _slot_problem(day_s, time_s, s, now, ignore_ref=None):
    """None when a 1:1 time can be booked, otherwise the phrase for the website."""
    if not (_DATE.match(day_s or "") and _TIME.match(time_s or "")):
        raise ApiError("date and time required")
    try:
        day = datetime.date.fromisoformat(day_s)
        starts = slot_start(day, time_s, s.booking_timezone)
    except ValueError:
        raise ApiError("date and time required")
    tz = ZoneInfo(s.booking_timezone)
    today = now.astimezone(tz).date()
    if day < today or day > today + datetime.timedelta(days=s.booking_days_ahead):
        raise ApiError("date not available")
    if (day.isoweekday() % 7) not in s.booking_weekdays:  # website numbering: Sunday = 0
        raise ApiError("day not available")
    if not AvailabilitySlot.objects.filter(slot_date=day, slot_time=time_s).exists() or starts <= now:
        raise ApiError("time not available")
    if Order.objects.filter(kind="session", session_date=day, session_time=time_s, status__in=LIVE).exists():
        raise ApiError("slot taken")
    held = CheckoutHold.objects.filter(kind="session", slot_date=day, slot_time=time_s, expires_at__gt=now)
    if ignore_ref:
        held = held.exclude(ref__in=ignore_ref)
    if held.exists():
        raise ApiError("slot taken")
    return day


def build_cart(p, user, s=None, now=None, ignore_ref=None):
    """
    Check what is being bought and work out the price. Nothing is saved.
    Returns {kind, items: [{day, time, ...}], unit_usd, total_usd, item: Course|Workshop|None}.
    """
    s = s or SiteSettings.get()
    now = now or timezone.now()
    kind = str(p.get("kind") or "")
    if kind not in ("session", "workshop", "course", "gift"):
        raise ApiError("item not available")
    gift_mode = None
    if kind == "gift":
        gift_mode = str(p.get("gift_mode") or "")
        if gift_mode not in ("card", "direct"):
            raise ApiError("invalid gift mode")
    if kind in ("course", "gift") and user is None:
        raise ApiError("sign in required")

    cart = {"kind": kind, "gift_mode": gift_mode, "items": [], "item": None}
    if kind == "session":
        if s.session_price_usd is None:
            raise ApiError("session price not set")
        picks = p.get("sessions")
        if not isinstance(picks, list) and p.get("session_date"):
            picks = [{"date": p.get("session_date"), "time": p.get("session_time")}]
        if not isinstance(picks, list) or not picks:
            raise ApiError("date and time required")
        if len(picks) > MAX_SESSIONS:
            raise ApiError("too many sessions")
        seen = set()
        for pick in picks:
            pick = pick if isinstance(pick, dict) else {}
            key = (str(pick.get("date") or ""), str(pick.get("time") or ""))
            if key in seen:
                raise ApiError("slot taken")
            seen.add(key)
            day = _slot_problem(key[0], key[1], s, now, ignore_ref)
            cart["items"].append({"day": day, "time": key[1]})
        cart["unit_usd"] = Decimal(s.session_price_usd).quantize(TWO_PLACES)
        cart["title"] = "1:1 session"
    elif kind == "workshop":
        w = Workshop.objects.filter(pk=_uuid_or_none(p.get("item_id")), published=True).first()
        if w is None or w.starts_at <= now:
            raise ApiError("workshop not available")
        sold = Order.objects.filter(kind="workshop", item_id=w.pk, status__in=SOLD).count()
        held = CheckoutHold.objects.filter(workshop=w, expires_at__gt=now)
        if ignore_ref:
            held = held.exclude(ref__in=ignore_ref)
        if w.spots - sold - held.count() <= 0:
            raise ApiError("sold out")
        cart["items"].append({})
        cart["item"] = w
        cart["unit_usd"] = Decimal(w.price_usd).quantize(TWO_PLACES)
        cart["title"] = w.title
    else:
        c = Course.objects.filter(pk=_uuid_or_none(p.get("item_id")), published=True).first()
        if c is None:
            raise ApiError("item not available")
        cart["items"].append({})
        cart["item"] = c
        cart["unit_usd"] = Decimal(0) if (c.is_free and kind == "course") else Decimal(c.price_usd).quantize(TWO_PLACES)
        cart["title"] = c.title
        if kind == "gift":
            if cart["unit_usd"] <= 0:
                raise ApiError("item not available")  # a free material is simply claimed, not gifted
            if gift_mode == "direct":
                try:
                    validate_email(str(p.get("gift_to_email") or "").strip())
                except ValidationError:
                    raise ApiError("invalid gift email")
                if len(str(p.get("gift_to_name") or "").strip()) < 2:
                    raise ApiError("invalid name")
    cart["total_usd"] = (cart["unit_usd"] * len(cart["items"])).quantize(TWO_PLACES)
    return cart


def _uuid_or_none(v):
    import uuid
    try:
        return uuid.UUID(str(v))
    except (ValueError, TypeError, AttributeError):
        return None


# ------------------------------------------------------------------ one-time codes (email / phone)

def consume_verification(kind, vid, target):
    """Use up a checked code for this email / phone. Raises 'verification required' if it is not valid."""
    v = Verification.objects.select_for_update().filter(pk=_uuid_or_none(vid), kind=kind).first()
    ok = (v is not None and v.verified_at is not None and v.used_at is None
          and v.created_at > timezone.now() - datetime.timedelta(hours=1))
    if ok:
        a, b = (v.target, target)
        if kind == "email":
            a, b = a.strip().lower(), b.strip().lower()
        else:
            a, b = re.sub(r"\D", "", a), re.sub(r"\D", "", b)
        ok = a == b
    if not ok:
        raise ApiError("verification required")
    v.used_at = timezone.now()
    v.save(update_fields=["used_at"])


def require_verifications(p, details, user, s):
    """When the owner switched verification on, guests (and members with another email) must have checked codes."""
    member_ok = bool(user and user.email_confirmed_at and user.email.lower() == details["email"])
    if s.require_email_verification and not member_ok:
        consume_verification("email", p.get("email_verification"), details["email"])
    if s.require_phone_verification and details["phone"] and not member_ok:
        consume_verification("phone", p.get("phone_verification"), details["phone"])


# ------------------------------------------------------------------ writing orders

def _make_order(cart, item, details, delivery, user, status, ref=None, extra=None):
    s = SiteSettings.get()
    fields = dict(details)
    fields.update(delivery)
    o = Order(kind=cart["kind"], amount_usd=cart["unit_usd"], status=status, user=user, **fields)
    if ref:
        o.ref = ref
    if cart["kind"] == "session":
        o.session_date, o.session_time, o.session_timezone = item["day"], item["time"], s.booking_timezone
        o.item_title = cart["title"]
        o.join_url = s.session_link_base or ""
    else:
        o.item_id = cart["item"].pk
        o.item_title = cart["title"]
    if cart["kind"] == "gift":
        o.gift_to_name = str(extra.get("gift_to_name") or "")[:200] if cart["gift_mode"] == "direct" else ""
        o.gift_to_email = str(extra.get("gift_to_email") or "").strip().lower() if cart["gift_mode"] == "direct" else ""
        o.gift_message = str(extra.get("gift_message") or "")[:1000] if cart["gift_mode"] == "direct" else ""
    if status in SOLD:
        o.paid_at = timezone.now()
    for k, v in (extra or {}).items():
        if k in ("charge_currency", "charge_amount_cents", "fx_rate", "paymob_intention_id", "paymob_order_id",
                 "paymob_transaction_id"):
            setattr(o, k, v)
    o.save()
    if cart["kind"] == "gift":
        Gift.objects.create(order=o, course=cart["item"], mode=cart["gift_mode"], sender_name=o.customer_name,
                            recipient_name=o.gift_to_name, recipient_email=o.gift_to_email, message=o.gift_message,
                            lang=o.lang)
    if cart["kind"] == "course" and user is not None:
        CourseAccess.objects.get_or_create(user=user, course=cart["item"], defaults={"source": "order", "order": o})
    return o


def create_order(p, user):
    """
    place_order: create an order that needs no card payment. Only free items; anything with a price
    must go through payment first ('payment required' / 'payments not open').
    """
    s = SiteSettings.get()
    details = clean_details(p, s, user)
    cart = build_cart(p, user, s)
    delivery = clean_delivery(p, cart["kind"], user)
    if cart["total_usd"] > 0:
        raise ApiError("payment required" if s.payments_enabled else "payments not open")
    try:
        with transaction.atomic():
            require_verifications(p, details, user, s)
            o = _make_order(cart, cart["items"][0], details, delivery, user, "confirmed",
                            extra={k: p.get(k) for k in ("gift_to_name", "gift_to_email", "gift_message")})
    except IntegrityError:
        raise ApiError("slot taken")
    out = {"ref": o.ref, "amount_usd": float(o.amount_usd), "status": o.status}
    if cart["kind"] == "gift":
        out["gift_token"] = o.gifts.first().token
    return out


# ------------------------------------------------------------------ paying: holds, then finish

def sign_payload(payload: dict) -> dict:
    body = {k: v for k, v in payload.items() if k != "sig"}
    msg = json.dumps(body, sort_keys=True, default=str)
    body["sig"] = hmac.new(settings.SECRET_KEY.encode(), msg.encode(), "sha256").hexdigest()
    return body


def payload_is_genuine(payload: dict) -> bool:
    if not isinstance(payload, dict) or "sig" not in payload:
        return False
    return hmac.compare_digest(sign_payload(payload)["sig"], str(payload["sig"]))


def purge_expired_holds():
    return CheckoutHold.objects.filter(expires_at__lte=timezone.now()).delete()[0]


def begin_checkout(p, user, ip_hash_value):
    """
    Check the cart, work out the price, and hold the times / seat for 30 minutes.
    Returns a signed payload (kept by the payment provider) that finalize_paid_order() trusts later.
    """
    s = SiteSettings.get()
    now = timezone.now()
    since = now - datetime.timedelta(minutes=10)
    if CheckoutAttempt.objects.filter(ip_hash=ip_hash_value, at__gte=since).count() >= 10:
        raise ApiError("rate_limited", 429)
    CheckoutAttempt.objects.create(ip_hash=ip_hash_value)

    details = clean_details(p, s, user)
    with transaction.atomic():
        purge_expired_holds()
        cart = build_cart(p, user, s, now)
        delivery = clean_delivery(p, cart["kind"], user)
        if cart["total_usd"] <= 0 or not s.payments_enabled:
            raise ApiError("payments not open")
        require_verifications(p, details, user, s)
        refs, expires = [], now + datetime.timedelta(minutes=HOLD_MINUTES)
        try:
            if cart["kind"] == "workshop":
                Workshop.objects.select_for_update().get(pk=cart["item"].pk)
            for item in cart["items"]:
                ref = Order._meta.get_field("ref").default()
                refs.append(ref)
                if cart["kind"] == "session":
                    CheckoutHold.objects.create(ref=ref, kind="session", slot_date=item["day"],
                                                slot_time=item["time"], expires_at=expires, user=user)
                elif cart["kind"] == "workshop":
                    CheckoutHold.objects.create(ref=ref, kind="workshop", workshop=cart["item"],
                                                expires_at=expires, user=user)
        except IntegrityError:
            raise ApiError("slot taken")
    payload = {
        "kind": cart["kind"], "gift_mode": cart["gift_mode"], "refs": refs, "user_id": str(user.pk) if user else None,
        "item_id": str(cart["item"].pk) if cart["item"] else None,
        "slots": [{"date": i["day"].isoformat(), "time": i["time"]} for i in cart["items"]] if cart["kind"] == "session" else [],
        "unit_usd": str(cart["unit_usd"]), "amount_usd": str(cart["total_usd"]),
        "details": details, "delivery": delivery,
        "gift": {k: str(p.get(k) or "") for k in ("gift_to_name", "gift_to_email", "gift_message")},
    }
    return sign_payload(payload), cart


def finalize_paid_order(payload, txn, success, pending, amount_cents, currency, provider_order_id="", raw=None):
    """
    The payment provider confirmed (or refused) a payment. All-or-nothing and safe to repeat.
    Returns {"outcome": paid | duplicate | ignored | needs_refund | unknown_order, "refs": [...]}.
    """
    from .models import User
    raw = raw or {}
    with transaction.atomic():
        if PaymentEvent.objects.select_for_update().filter(pk=txn).exists():
            return {"outcome": "duplicate", "refs": []}
        genuine = payload_is_genuine(payload)
        refs = list(payload.get("refs") or []) if genuine else []

        def record(outcome, note=""):
            PaymentEvent.objects.create(transaction_id=txn, ref=",".join(refs)[:20], success=bool(success),
                                        pending=bool(pending), amount_cents=amount_cents, currency=currency or "",
                                        outcome=outcome, raw=raw if isinstance(raw, dict) else {}, note=note)
            return {"outcome": outcome, "refs": refs if outcome == "paid" else []}

        if not genuine:
            return record("unknown_order", "payload not recognised")
        if not success or pending:
            if not success and not pending:
                CheckoutHold.objects.filter(ref__in=refs).delete()
            return record("ignored")
        if Order.objects.filter(ref__in=refs).exists():
            return record("duplicate")

        user = User.objects.filter(pk=payload.get("user_id")).first() if payload.get("user_id") else None
        kind = payload["kind"]
        s = SiteSettings.get()
        extra_base = {"charge_currency": currency or "", "charge_amount_cents": amount_cents,
                      "paymob_order_id": str(provider_order_id or ""), "paymob_transaction_id": txn}
        try:
            with transaction.atomic():  # a failure inside rolls back every order of this payment
                CheckoutHold.objects.filter(ref__in=refs).delete()
                if kind == "session":
                    for ref, slot in zip(refs, payload["slots"]):
                        day = datetime.date.fromisoformat(slot["date"])
                        cart = {"kind": "session", "unit_usd": Decimal(payload["unit_usd"]), "title": "1:1 session",
                                "gift_mode": None, "item": None}
                        _make_order(cart, {"day": day, "time": slot["time"]}, payload["details"],
                                    payload["delivery"], user, "paid", ref=ref, extra=extra_base)
                else:
                    item = (Workshop if kind == "workshop" else Course).objects.get(pk=payload["item_id"])
                    if kind == "workshop":
                        sold = Order.objects.filter(kind="workshop", item_id=item.pk, status__in=SOLD).count()
                        if sold >= item.spots:
                            raise IntegrityError("workshop full")
                    cart = {"kind": kind, "unit_usd": Decimal(payload["unit_usd"]), "title": item.title,
                            "gift_mode": payload.get("gift_mode"), "item": item}
                    extra = dict(extra_base, **payload.get("gift", {}))
                    _make_order(cart, None, payload["details"], payload["delivery"], user, "paid",
                                ref=refs[0], extra=extra)
        except (IntegrityError, Workshop.DoesNotExist, Course.DoesNotExist):
            return record("needs_refund", "paid, but the item is no longer available")
        return record("paid")
