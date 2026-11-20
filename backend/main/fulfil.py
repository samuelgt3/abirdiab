"""After an order is paid (or free): make the session's video link and send the confirmation email.
Nothing here may ever stop a booking: failures are recorded on the order and the admin can fix them by hand."""
import logging

from django.conf import settings
from django.utils import timezone

from . import emails, mailer, zoom
from .checkout import SOLD, starts_at_for
from .models import Order, SiteSettings

log = logging.getLogger(__name__)


def make_session_link(order):
    if order.kind != "session" or order.status not in SOLD or not zoom.configured():
        return
    if order.join_url and "zoom.us" in order.join_url:
        return
    try:
        join, start = zoom.create_meeting(order)
        Order.objects.filter(pk=order.pk).update(join_url=join, host_url=start, link_error="", updated_at=timezone.now())
        order.join_url, order.host_url, order.link_error = join, start, ""
    except Exception as e:  # booked anyway; the admin pastes a link by hand
        log.warning("zoom failed for %s: %s", order.ref, e)
        Order.objects.filter(pk=order.pk).update(link_error=f"Zoom: {str(e)[:150]}", updated_at=timezone.now())
        order.link_error = "zoom failed"


def send_confirmation(order) -> str:
    """Email the thank-you once. Returns 'sent' | 'already_sent' | 'emails_off' | 'failed' | 'not_paid'."""
    if order.status not in SOLD:
        return "not_paid"
    if not SiteSettings.get().emails_enabled or not order.email:
        return "emails_off"
    claimed = Order.objects.filter(pk=order.pk, thanks_sent_at__isnull=True).update(thanks_sent_at=timezone.now())
    if not claimed:
        return "already_sent"
    order.refresh_from_db()
    try:
        m = emails.booking_email(order, settings.SITE_URL, starts_at_for(order))
        mailer.send_email(order.email, m["subject"], m["text"], m["html"])
        return "sent"
    except Exception as e:
        log.warning("confirmation email failed for %s: %s", order.ref, e)
        Order.objects.filter(pk=order.pk).update(thanks_sent_at=None)  # allow another try
        return "failed"


def after_paid(refs):
    """Called right after payment is confirmed / a free order is placed."""
    for o in Order.objects.filter(ref__in=refs):
        try:
            make_session_link(o)
            send_confirmation(o)
        except Exception as e:  # never let this break the payment answer
            log.warning("after_paid failed for %s: %s", o.ref, e)
