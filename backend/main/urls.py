from django.urls import path

from . import (accountviews, authviews, functions, google, jobs, otp, payviews, rpc, rpc_orders, storage,  # noqa: F401
               tableapi)  # (rpc_orders registers its functions)

urlpatterns = [
    # accounts
    path("auth/signup", authviews.signup),
    path("auth/token", authviews.token),
    path("auth/logout", authviews.logout),
    path("auth/recover", authviews.recover),
    path("auth/verify", authviews.verify),
    path("auth/user", authviews.me),
    path("auth/google/start", google.start),
    path("auth/google/callback", google.callback),
    # tables, named functions, "functions"
    path("db/<str:table>", tableapi.db),
    path("rpc/<str:name>", rpc.call),
    path("fn/geo", functions.geo),
    path("fn/setup-status", functions.setup_status),
    path("fn/paymob-checkout", payviews.paymob_checkout),
    path("fn/paymob-webhook", payviews.paymob_webhook),
    path("fn/test-payment", payviews.test_payment),
    path("fn/booking-email", payviews.booking_email_view),
    path("fn/send-code", otp.send_code),
    path("fn/check-code", otp.check_code),
    path("fn/signup-verified", otp.signup_verified),
    path("fn/delete-account", accountviews.delete_account),
    path("fn/cron", jobs.cron),
    # files (public path keeps the same shape the admin screen already recognises)
    path("storage/<str:bucket>/upload", storage.upload),
    path("storage/<str:bucket>/remove", storage.remove),
    path("storage/v1/object/public/media/<path:path>", storage.public_media),
    path("storage/paid-files/sign", storage.sign),
    path("storage/v1/object/sign/paid-files/download", storage.download),
]
