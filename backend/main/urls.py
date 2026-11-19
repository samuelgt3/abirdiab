from django.urls import path
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from . import views

@ensure_csrf_cookie
def csrf_view(request):
    return JsonResponse({"detail": "CSRF cookie set"})

urlpatterns = [
    path("csrf/", csrf_view),
    path("login/", views.login_view),
    path("logout/", views.logout),
    path("appointments/", views.createAppointment),
    path("webhooks/mux", views.mux_webhook, name="mux-webhook"),
    path("newgroupsession/", views.createGroupSession),
    path("joingroup/<id>/", views.joinGroup),
    path("blogposts/", views.getBlogPosts),
    path("uploadvideo/", views.createUploadUrl)
]
 