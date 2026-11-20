"""Paymob: signature checks, currency conversion, and creating a payment ("intention")."""
import hashlib
import hmac
import math
import os
import re
import secrets
from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal

import requests
from django.core.cache import cache

from .permissions import ApiError

# The fields Paymob signs in a "transaction processed" callback, in its documented order.
HMAC_FIELDS = [
    "amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id",
    "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order.id",
    "owner", "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success",
]
_REF = re.compile(r"AD-[0-9A-Za-z]{6,12}", re.I)


def configured() -> bool:
    return all(os.environ.get(n) for n in ("PAYMOB_SECRET_KEY", "PAYMOB_PUBLIC_KEY", "PAYMOB_HMAC_SECRET", "PAYMOB_INTEGRATION_IDS"))


def base_url() -> str:
    return (os.environ.get("PAYMOB_BASE_URL") or "https://accept.paymob.com").rstrip("/")


def _dig(obj, path):
    for part in path.split("."):
        obj = obj.get(part) if isinstance(obj, dict) else None
    return obj


def hmac_string(obj: dict, null_as: str = "") -> str:
    out = []
    for f in HMAC_FIELDS:
        v = _dig(obj, f)
        out.append(null_as if v is None else ("true" if v is True else "false" if v is False else str(v)))
    return "".join(out)


def hmac_sha512_hex(secret: str, message: str) -> str:
    return hmac.new(secret.encode(), message.encode(), hashlib.sha512).hexdigest()


def verify_hmac(obj: dict, received, secret: str) -> bool:
    """True when `received` is Paymob's signature for this callback. Fails closed."""
    if not received or not secret or not isinstance(obj, dict):
        return False
    received = str(received).lower()
    return any(hmac.compare_digest(hmac_sha512_hex(secret, hmac_string(obj, nul)), received) for nul in ("", "null"))


def ref_from(merchant_order_id):
    m = _REF.search(str(merchant_order_id or ""))
    return m.group(0).upper() if m else None


def split_name(name: str):
    parts = str(name or "").split()
    if not parts:
        return {"first": "Customer", "last": "Customer"}
    return {"first": parts[0], "last": " ".join(parts[1:]) or parts[0]}


def charge_cents(usd, currency: str, rate) -> int:
    """USD is charged exactly; any other currency is rounded UP to a whole unit (then converted to cents)."""
    usd, rate = Decimal(str(usd)), Decimal(str(rate))
    if currency.upper() == "USD":
        return int((usd * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if rate <= 0:
        raise ValueError("bad rate")
    return int((usd * rate).quantize(Decimal("1"), rounding=ROUND_CEILING)) * 100


def fx_rate(currency: str) -> Decimal:
    """Today's USD -> currency rate (cached for 6 hours)."""
    currency = currency.upper()
    if currency == "USD":
        return Decimal(1)
    key = f"fx:{currency}"
    cached = cache.get(key)
    if cached:
        return Decimal(cached)
    try:
        r = requests.get("https://open.er-api.com/v6/latest/USD", timeout=6)
        rate = Decimal(str(r.json()["rates"][currency]))
        if rate <= 0:
            raise ValueError
    except Exception:
        raise ApiError("fx_unavailable", 503)
    cache.set(key, str(rate), 6 * 3600)
    return rate


def create_intention(*, cents, currency, title, payer, ref, refs, redirect_url, notify_url, extras):
    """Ask Paymob for a payment of `cents` and return {clientSecret, publicKey, id, url}."""
    ids = [int(x) for x in os.environ["PAYMOB_INTEGRATION_IDS"].split(",") if x.strip().isdigit()]
    name = split_name(payer["customer_name"])
    phone = f'{payer.get("phone_dial") or ""}{payer["phone"]}'
    body = {
        "amount": cents, "currency": currency.upper(), "payment_methods": ids,
        "items": [{"name": title[:50] or "Order", "amount": cents, "description": title[:200] or "Order", "quantity": 1}],
        "billing_data": {
            "first_name": name["first"], "last_name": name["last"], "email": payer["email"], "phone_number": phone,
            "country": payer.get("country") or "NA", "apartment": "NA", "street": "NA", "building": "NA",
            "floor": "NA", "city": "NA", "state": "NA",
        },
        "customer": {"first_name": name["first"], "last_name": name["last"], "email": payer["email"]},
        "special_reference": f"{ref}-{secrets.token_hex(3)}",
        "notification_url": notify_url, "redirection_url": redirect_url, "extras": extras,
    }
    try:
        r = requests.post(f"{base_url()}/v1/intention/", json=body, timeout=15,
                          headers={"Authorization": f'Token {os.environ["PAYMOB_SECRET_KEY"]}'})
        data = r.json()
    except Exception:
        raise ApiError("payment_unavailable", 502)
    secret = data.get("client_secret") if isinstance(data, dict) else None
    if not r.ok or not secret:
        raise ApiError("payment_unavailable", 502)
    pk = os.environ["PAYMOB_PUBLIC_KEY"]
    return {"clientSecret": secret, "publicKey": pk, "id": str(data.get("id") or ""),
            "url": f"{base_url()}/unifiedcheckout/?publicKey={pk}&clientSecret={secret}"}
