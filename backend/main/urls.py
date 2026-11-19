from django.urls import path

from . import authviews

urlpatterns = [
    path("auth/signup", authviews.signup),
    path("auth/token", authviews.token),
    path("auth/logout", authviews.logout),
    path("auth/recover", authviews.recover),
    path("auth/verify", authviews.verify),
    path("auth/user", authviews.me),
]
