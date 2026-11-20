"""Deleting an account."""
from django.db import transaction

from .functions import fn
from .models import Gift, NewsletterSubscriber, Order, Verification
from .permissions import ApiError, is_admin_user, json_body


def scrub_orders_for_user(user):
    """Keep the orders for the owner's accounting, but remove everything that identifies the person."""
    ids = list(Order.objects.filter(user=user).values_list("pk", flat=True))
    Order.objects.filter(pk__in=ids).update(
        customer_name="Deleted customer", email="", phone="", phone_dial="", phone_country="", country="", notes="",
        delivery_to="", gift_to_name="", gift_to_email="", gift_message="", user=None)
    Gift.objects.filter(order_id__in=ids).update(sender_name="", recipient_name="", recipient_email="", message="")
    return len(ids)


@fn(auth=True, methods=("POST",))
def delete_account(request, user):
    if json_body(request).get("confirm") != "DELETE":
        raise ApiError("confirmation required")
    if is_admin_user(user):
        raise ApiError("admins cannot delete their account here", 403)
    email = user.email
    with transaction.atomic():
        scrub_orders_for_user(user)
        NewsletterSubscriber.objects.filter(email__iexact=email).delete()
        Verification.objects.filter(kind="email", target=email.lower()).delete()
        user.delete()  # login, progress, activity and what they owned go with it
    return {"deleted": True}
