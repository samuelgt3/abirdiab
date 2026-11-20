"""The customer emails (English or Arabic, matching the language the customer used). Everything typed by a customer is escaped."""
import html as _html
import urllib.parse
from zoneinfo import ZoneInfo

GREEN, CREAM = "#123f35", "#faf6ee"


def esc(v) -> str:
    return _html.escape(str(v if v is not None else ""), quote=True)


def safe_link(url):
    u = str(url or "").strip()
    return u if u.startswith("https://") else None


COPY = {
    "en": {
        "hi": "Hi {name},", "thanks": "Thank you for your booking.", "thanks_order": "Thank you for your order.",
        "when": "When", "ref": "Reference", "page": "Your booking page", "cal": "Add to Google Calendar",
        "session_link": "Your joining link", "session_wait": "Your session is confirmed as soon as your payment is received.",
        "workshop": "Your joining link arrives 2 hours before the workshop starts. You will also find it in My workshops: {url}",
        "course": "Your course is unlocked. Open it in My learning: {url}",
        "login": "To open it, sign in or create your password using {email}.",
        "gift_card": "Thank you for your gift. The link to share is in My gifts: {url}",
        "gift_direct": "We are emailing {to} their gift.", "whatsapp": "Your link will also be sent to your WhatsApp.",
        "bye": "With warmth,<br>Abir Diab", "sub_booking": "Your booking: {t} ({r})", "sub_order": "Your order: {t} ({r})",
        "join_sub": "Your joining link: {t}", "join_lead": "Your session starts soon. Use this link to join:", "join": "Join",
        "gift_sub": "{n} sent you a gift", "gift_hi": "{n} has sent you a gift: {t}.", "gift_claim": "Claim your gift",
        "sess_note": "Your 1:1 session link is in your booking page: {url}",
    },
    "ar": {
        "hi": "مرحبًا {name}،", "thanks": "شكرًا لحجزك.", "thanks_order": "شكرًا لطلبك.",
        "when": "الموعد", "ref": "رقم الحجز", "page": "صفحة حجزك", "cal": "أضف إلى تقويم جوجل",
        "session_link": "رابط الانضمام", "session_wait": "يتأكد حجز جلستك فور وصول الدفعة.",
        "workshop": "يصلك رابط الانضمام قبل بدء الورشة بساعتين. تجده أيضًا في ورشاتي: {url}",
        "course": "تم فتح دورتك. افتحها من رحلة التعلم: {url}",
        "login": "لفتحها، سجّل الدخول أو أنشئ كلمة مرورك باستخدام {email}.",
        "gift_card": "شكرًا على هديتك. رابط المشاركة موجود في الهدايا: {url}",
        "gift_direct": "سنرسل الهدية إلى {to} عبر البريد الإلكتروني.", "whatsapp": "سيصلك الرابط أيضًا على واتساب.",
        "bye": "مع خالص المحبة،<br>عبير دياب", "sub_booking": "حجزك: {t} ({r})", "sub_order": "طلبك: {t} ({r})",
        "join_sub": "رابط الانضمام: {t}", "join_lead": "تبدأ جلستك قريبًا. استخدم هذا الرابط للانضمام:", "join": "انضم",
        "gift_sub": "{n} أرسل/ت لك هدية", "gift_hi": "أرسل/ت لك {n} هدية: {t}.", "gift_claim": "استلم هديتك",
        "sess_note": "رابط جلستك موجود في صفحة حجزك: {url}",
    },
}


def _first(name):
    return (str(name or "").split() or [""])[0]


def when_text(order, starts_at, lang):
    """'Friday 20 November 2026, 10:00 (Asia/Dubai)'. Sessions use the booked wall-clock time; workshops the zone of the time."""
    if order.kind == "session" and order.session_date and order.session_time:
        return f"{order.session_date.isoformat()} {order.session_time} ({order.session_timezone or ''})".replace(" ()", "")
    if starts_at:
        tz = ZoneInfo("Asia/Dubai")
        return f"{starts_at.astimezone(tz).strftime('%Y-%m-%d %H:%M')} (Asia/Dubai)"
    return ""


def _wrap(lang, inner_html):
    d = "rtl" if lang == "ar" else "ltr"
    return (f'<div dir="{d}" style="font-family:Arial,sans-serif;background:{CREAM};color:#222;padding:24px;line-height:1.6">'
            f'<div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:24px">{inner_html}</div></div>')


def _button(url, label):
    return (f'<p><a href="{esc(url)}" style="display:inline-block;background:{GREEN};color:#fff;padding:12px 22px;'
            f'border-radius:8px;text-decoration:none">{esc(label)}</a></p>')


def _plain(parts):
    import re
    return "\n\n".join(re.sub(r"<[^>]+>", "", p).replace("&amp;", "&") for p in parts if p)


def booking_email(order, site_url, starts_at=None):
    """The thank-you after a purchase. Returns {subject, html, text}."""
    lang = "ar" if order.lang == "ar" else "en"
    c, site = COPY[lang], site_url.rstrip("/")
    paid = order.status in ("paid", "confirmed", "completed")
    is_order = order.kind in ("course", "gift")
    subject = (c["sub_order"] if is_order else c["sub_booking"]).format(t=order.item_title, r=order.ref)
    parts = [esc(c["hi"].format(name=_first(order.customer_name))), esc(c["thanks_order"] if is_order else c["thanks"])]
    html_extra = ""
    when = when_text(order, starts_at, lang)
    if order.kind in ("session", "workshop") and when:
        parts.append(f"<strong>{esc(c['when'])}:</strong> {esc(when)}")
    link = safe_link(order.join_url)
    if order.kind == "session":
        if paid and link:
            parts.append(f"<strong>{esc(c['session_link'])}:</strong> <a href=\"{esc(link)}\">{esc(link)}</a>")
        elif not paid:
            parts.append(esc(c["session_wait"]))
        parts.append(esc(c["sess_note"].format(url=f"{site}/account?tab=sessions")))
    elif order.kind == "workshop":
        parts.append(esc(c["workshop"].format(url=f"{site}/account?tab=workshops")))
    elif order.kind == "course":
        parts.append(esc(c["course"].format(url=f"{site}/account?tab=learning")))
        parts.append(esc(c["login"].format(email=order.email)))
    elif order.kind == "gift":
        if order.gift_to_email:
            parts.append(esc(c["gift_direct"].format(to=order.gift_to_name or order.gift_to_email)))
        else:
            parts.append(esc(c["gift_card"].format(url=f"{site}/account?tab=gifts")))
    if order.delivery_method == "whatsapp" and order.kind in ("session", "workshop"):
        parts.append(esc(c["whatsapp"]))
    parts.append(f"{esc(c['ref'])}: <span dir=\"ltr\">{esc(order.ref)}</span>")
    if order.kind in ("session", "workshop") and starts_at is not None:
        import datetime
        s = starts_at.astimezone(datetime.timezone.utc)
        end = s + datetime.timedelta(minutes=60 if order.kind == "session" else 120)
        q = urllib.parse.urlencode({"action": "TEMPLATE", "text": f"{order.item_title} - Abir Diab",
                                    "dates": f"{s:%Y%m%dT%H%M%SZ}/{end:%Y%m%dT%H%M%SZ}", "details": order.ref})
        html_extra += _button("https://calendar.google.com/calendar/render?" + q, c["cal"])
    if order.kind in ("session", "workshop"):
        html_extra += _button(f"{site}/booking/{order.ref}", c["page"])
    body = "".join(f"<p>{p}</p>" for p in parts) + html_extra + f"<p>{c['bye']}</p>"
    return {"subject": subject, "html": _wrap(lang, body), "text": _plain(parts + [f"{site}/booking/{order.ref}"])}


def join_email(order, link, site_url, starts_at=None):
    lang = "ar" if order.lang == "ar" else "en"
    c = COPY[lang]
    link = safe_link(link) or ""
    when = when_text(order, starts_at, lang)
    body = (f"<p>{esc(c['hi'].format(name=_first(order.customer_name)))}</p><p>{esc(c['join_lead'])}</p>"
            + (f"<p><strong>{esc(c['when'])}:</strong> {esc(when)}</p>" if when else "")
            + (_button(link, c["join"]) + f'<p dir="ltr">{esc(link)}</p>' if link else "") + f"<p>{c['bye']}</p>")
    return {"subject": c["join_sub"].format(t=order.item_title), "html": _wrap(lang, body),
            "text": _plain([c["join_lead"], when, link])}


def gift_email(gift, title, site_url):
    lang = "ar" if gift.lang == "ar" else "en"
    c = COPY[lang]
    url = f"{site_url.rstrip('/')}/gift/{gift.token}"
    msg = f'<blockquote dir="auto">{esc(gift.message)}</blockquote>' if gift.message else ""
    body = (f"<p>{esc(c['hi'].format(name=_first(gift.recipient_name)))}</p>"
            f"<p>{esc(c['gift_hi'].format(n=gift.sender_name, t=title))}</p>{msg}{_button(url, c['gift_claim'])}<p>{c['bye']}</p>")
    return {"subject": c["gift_sub"].format(n=gift.sender_name), "html": _wrap(lang, body),
            "text": _plain([c["gift_hi"].format(n=gift.sender_name, t=title), gift.message, url])}
