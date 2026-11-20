"""Scheduled jobs. Run every 5 minutes: `python manage.py run_jobs`, or call POST /api/fn/cron with the CRON_SECRET."""
import datetime
import hmac
import logging
import os

from django.conf import settings
from django.utils import timezone

from . import checkout, emails, mailer
from .checkout import SOLD, starts_at_for
from .functions import fn
from .models import CheckoutAttempt, Gift, Order, RateLimitHit, SiteSettings, Verification, WorkshopLink
from .permissions import ApiError

log = logging.getLogger(__name__)
RELEASE_BEFORE = datetime.timedelta(hours=2)
KEEP_TRYING = datetime.timedelta(hours=6)


def purge_unpaid():
    now = timezone.now()
    holds = checkout.purge_expired_holds()
    stray = Order.objects.filter(status="awaiting_payment", created_at__lte=now - datetime.timedelta(minutes=30)).delete()[0]
    return holds + stray


def _link_for(order):
    if order.kind == "session":
        return order.join_url
    link = WorkshopLink.objects.filter(workshop_id=order.item_id).first()
    return link.join_link if link else ""


def send_reminders(now=None):
    """Email the joining link from 2 hours before the start (keeps trying until 6 hours after)."""
    now = now or timezone.now()
    if not SiteSettings.get().emails_enabled:
        return 0
    sent = 0
    qs = Order.objects.filter(status__in=SOLD, kind__in=("session", "workshop"), join_sent_at__isnull=True,
                              delivery_method="email").exclude(email="")
    for o in qs:
        start = starts_at_for(o)
        link = emails.safe_link(_link_for(o))
        if not start or not link or not (start - RELEASE_BEFORE <= now <= start + KEEP_TRYING):
            continue
        if not Order.objects.filter(pk=o.pk, join_sent_at__isnull=True).update(join_sent_at=now):
            continue
        try:
            m = emails.join_email(o, link, settings.SITE_URL, start)
            mailer.send_email(o.delivery_to or o.email, m["subject"], m["text"], m["html"])
            sent += 1
        except Exception as e:
            log.warning("reminder failed for %s: %s", o.ref, e)
            Order.objects.filter(pk=o.pk).update(join_sent_at=None)
    return sent


def send_gift_emails(now=None):
    """Email "X sent you a gift" for paid gifts bought in 'direct' mode."""
    now = now or timezone.now()
    if not SiteSettings.get().emails_enabled:
        return 0
    sent = 0
    for g in Gift.objects.filter(mode="direct", recipient_sent_at__isnull=True).exclude(recipient_email="").select_related("order", "course"):
        if g.order.status not in SOLD or not Gift.objects.filter(pk=g.pk, recipient_sent_at__isnull=True).update(recipient_sent_at=now):
            continue
        try:
            title = (g.course.title_ar if g.lang == "ar" and g.course.title_ar else g.course.title)
            m = emails.gift_email(g, title, settings.SITE_URL)
            mailer.send_email(g.recipient_email, m["subject"], m["text"], m["html"])
            sent += 1
        except Exception as e:
            log.warning("gift email failed for %s: %s", g.pk, e)
            Gift.objects.filter(pk=g.pk).update(recipient_sent_at=None)
    return sent


def cleanup():
    now = timezone.now()
    day = now - datetime.timedelta(hours=24)
    n = CheckoutAttempt.objects.filter(at__lte=day).delete()[0]
    n += Verification.objects.filter(expires_at__lte=day).delete()[0]
    n += RateLimitHit.objects.filter(at__lte=day).delete()[0]
    return n


def run_all():
    return {"purged": purge_unpaid(), "reminders": send_reminders(), "gifts": send_gift_emails(), "cleaned": cleanup()}


@fn(methods=("POST", "GET"))
def cron(request, user):
    secret = os.environ.get("CRON_SECRET")
    if not secret:
        raise ApiError("not_configured", 503)
    if not hmac.compare_digest(request.headers.get("x-cron-secret", ""), secret):
        raise ApiError("forbidden", 403)
    return run_all()
