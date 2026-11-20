"""Card payments and the email trigger: paymob-checkout, paymob-webhook, test-payment, booking-email."""
import hashlib
import json
import os
import re
from decimal import Decimal

from django.conf import settings

from . import checkout, fulfil, paymob
from .functions import fn
from .models import CheckoutHold, Order, PendingCheckout, SiteSettings
from .permissions import ApiError, json_body
from .security import client_ip, ip_hash, rate_limited


def _test_mode(s) -> bool:
    """Pretend payments exist only while no real Paymob secret key is installed (so they can never run live)."""
    return bool(s.payment_test_mode) and not os.environ.get("PAYMOB_SECRET_KEY")


@fn(methods=("POST",))
def paymob_checkout(request, user):
    p = json_body(request)
    s = SiteSettings.get()
    if not s.payments_enabled:
        raise ApiError("payments not open")
    test = _test_mode(s)
    if not test and not paymob.configured():
        raise ApiError("not_configured", 503)
    if not re.sub(r"\D", "", str(p.get("phone") or "")):
        raise ApiError("phone required")  # Paymob needs a phone number for every card payment
    payload, cart = checkout.begin_checkout(p, user, ip_hash(request))
    refs = payload["refs"]
    try:
        currency = (s.payment_currency or "EGP").upper()
        try:
            rate = paymob.fx_rate(currency)
        except ApiError:
            if not test:
                raise
            rate = Decimal(1)  # demo mode works offline
        cents = paymob.charge_cents(payload["amount_usd"], currency, rate)
        payload = checkout.sign_payload(dict(payload, charge_cents=cents, charge_currency=currency, fx_rate=str(rate)))
        PendingCheckout.objects.update_or_create(ref=refs[0], defaults={"payload": payload})
        out = {"ref": refs[0], "refs": refs, "count": len(refs), "amount_usd": float(payload["amount_usd"]),
               "amount_cents": cents, "currency": currency}
        if test:
            body = {k: v for k, v in payload.items() if k != "sig"}
            out.update({"testMode": True, "clientSecret": "test", "publicKey": "test",
                        "p": json.dumps(body, sort_keys=True, default=str), "sig": payload["sig"]})
            return out
        site = settings.SITE_URL
        intent = paymob.create_intention(
            cents=cents, currency=currency, title=cart["title"], payer=payload["details"], ref=refs[0], refs=refs,
            redirect_url=f"{site}/payment/return?ref={refs[0]}",
            notify_url=f'{os.environ.get("API_URL", "http://localhost:8000").rstrip("/")}/api/fn/paymob-webhook',
            extras={"ref": refs[0]})
        out.update({"url": intent["url"], "publicKey": intent["publicKey"], "clientSecret": intent["clientSecret"]})
        return out
    except Exception:
        CheckoutHold.objects.filter(ref__in=refs).delete()  # nothing was charged: free the times again
        PendingCheckout.objects.filter(ref=refs[0]).delete()
        raise


@fn(methods=("POST",))
def paymob_webhook(request, user):
    """Paymob tells us a payment finished. Its signature is the only login: wrong signature = 401 (Paymob retries)."""
    secret = os.environ.get("PAYMOB_HMAC_SECRET")
    if not secret:
        raise ApiError("not_configured", 503)
    try:
        body = json.loads(request.body or b"{}")
    except ValueError:
        raise ApiError("invalid json")
    obj = body.get("obj") if isinstance(body, dict) else None
    if not paymob.verify_hmac(obj, request.GET.get("hmac"), secret):
        raise ApiError("invalid signature", 401)
    if body.get("type") not in (None, "TRANSACTION"):
        return {"received": True}
    try:
        txn = int(obj["id"])
    except (KeyError, TypeError, ValueError):
        raise ApiError("invalid json")
    ref = paymob.ref_from(((obj.get("order") or {}).get("merchant_order_id"))) \
        or paymob.ref_from(((obj.get("payment_key_claims") or {}).get("extra") or {}).get("ref"))
    pend = PendingCheckout.objects.filter(pk=ref).first() if ref else None
    refunded = obj.get("is_refunded") is True or obj.get("is_voided") is True
    result = checkout.finalize_paid_order(
        pend.payload if pend else {}, txn, obj.get("success") is True and not refunded, obj.get("pending") is True,
        obj.get("amount_cents"), obj.get("currency"), (obj.get("order") or {}).get("id") or "", raw=body)
    if result["outcome"] == "paid":
        fulfil.after_paid(result["refs"])
    return {"received": True, "outcome": result["outcome"]}


@fn(methods=("POST",))
def test_payment(request, user):
    """TEST MODE only: finish a pretend payment (books for real, no money). Impossible once a real Paymob key exists."""
    s = SiteSettings.get()
    if not _test_mode(s):
        raise ApiError("test mode off", 403)
    b = json_body(request)
    try:
        payload = dict(json.loads(str(b.get("p") or "")), sig=str(b.get("sig") or ""))
    except ValueError:
        raise ApiError("invalid payment")
    if not checkout.payload_is_genuine(payload):
        raise ApiError("invalid payment")
    txn = -int(hashlib.sha256(payload["sig"].encode()).hexdigest()[:12], 16)  # the same pretend payment counts once
    result = checkout.finalize_paid_order(payload, txn, True, False, payload.get("charge_cents"),
                                          payload.get("charge_currency"), "test", raw={"test": True})
    if result["outcome"] == "paid":
        fulfil.after_paid(result["refs"])
    return {"outcome": result["outcome"]}


@fn(methods=("POST",))
def booking_email_view(request, user):
    """The website asks for the thank-you email (sent once; a failure never blocks anything)."""
    if rate_limited("booking_email", client_ip(request), 60, 3600):
        raise ApiError("rate_limited", 429)
    o = Order.objects.filter(ref=str(json_body(request).get("ref") or "").upper()).first()
    if o is None:
        return {"sent": False, "reason": "not_found"}
    res = fulfil.send_confirmation(o)
    return {"sent": True} if res == "sent" else {"sent": False, "reason": res}
