from django.urls import path

from . import views

urlpatterns = [
    path("/login/", views.login_view),
    path("/logout/", views.logout),
    path("/appointments/", views.createAppointment)
]