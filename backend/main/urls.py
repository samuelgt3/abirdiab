from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.login_view),
    path("logout/", views.logout),
    path("appointments/", views.createAppointment),
    path("api/webhooks/mux", views.mux_webhook, name="mux-webhook"),
]