from django.urls import path

from . import authviews, functions, rpc, payviews, rpc_orders, storage, tableapi  # noqa: F401 (rpc_orders registers its functions)

urlpatterns = [
    # accounts
    path("auth/signup", authviews.signup),
    path("auth/token", authviews.token),
    path("auth/logout", authviews.logout),
    path("auth/recover", authviews.recover),
    path("auth/verify", authviews.verify),
    path("auth/user", authviews.me),
    # tables, named functions, "functions"
    path("db/<str:table>", tableapi.db),
    path("rpc/<str:name>", rpc.call),
    path("fn/geo", functions.geo),
    path("fn/setup-status", functions.setup_status),
    path("fn/paymob-checkout", payviews.paymob_checkout),
    path("fn/paymob-webhook", payviews.paymob_webhook),
    path("fn/test-payment", payviews.test_payment),
    path("fn/booking-email", payviews.booking_email_view),
    # files (public path keeps the same shape the admin screen already recognises)
    path("storage/<str:bucket>/upload", storage.upload),
    path("storage/<str:bucket>/remove", storage.remove),
    path("storage/v1/object/public/media/<path:path>", storage.public_media),
    path("storage/paid-files/sign", storage.sign),
    path("storage/v1/object/sign/paid-files/download", storage.download),
]
