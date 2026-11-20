"""Google sign-in (browser redirect flow). The website sends the visitor to /api/auth/google/start; Google sends them back
to /api/auth/google/callback; we sign them in and return them to the site with a session in the URL (like email links)."""
import os
import time
from urllib.parse import urlencode

import jwt
import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpResponseRedirect
from django.utils import timezone

from .authviews import safe_redirect
from .models import SiteSettings
from .permissions import api
from .tokens import make_session

User = get_user_model()


def configured() -> bool:
    return bool(os.environ.get("GOOGLE_CLIENT_ID") and os.environ.get("GOOGLE_CLIENT_SECRET"))


def _callback_url() -> str:
    return f'{os.environ.get("API_URL", "http://localhost:8000").rstrip("/")}/api/auth/google/callback'


def _back(redirect_to, error):
    return HttpResponseRedirect(f"{redirect_to}#error={error}")


@api(methods=("GET",))
def start(request):
    redirect_to = safe_redirect(request.GET.get("redirect_to"))
    if not (SiteSettings.get().google_signin_enabled and configured()):
        return _back(redirect_to, "google_not_connected")
    state = jwt.encode({"typ": "gstate", "redirect": redirect_to, "exp": int(time.time()) + 600},
                       settings.JWT_SECRET, algorithm="HS256")
    q = urlencode({"client_id": os.environ["GOOGLE_CLIENT_ID"], "redirect_uri": _callback_url(), "response_type": "code",
                   "scope": "openid email profile", "state": state, "prompt": "select_account"})
    return HttpResponseRedirect(f"https://accounts.google.com/o/oauth2/v2/auth?{q}")


@api(methods=("GET",))
def callback(request):
    try:
        st = jwt.decode(request.GET.get("state", ""), settings.JWT_SECRET, algorithms=["HS256"])
        if st.get("typ") != "gstate":
            raise jwt.PyJWTError
    except jwt.PyJWTError:
        return _back(safe_redirect(None), "invalid_state")
    redirect_to = safe_redirect(st.get("redirect"))
    if request.GET.get("error") or not request.GET.get("code") or not configured():
        return _back(redirect_to, "google_cancelled")
    try:
        t = requests.post("https://oauth2.googleapis.com/token", timeout=10, data={
            "code": request.GET["code"], "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"], "redirect_uri": _callback_url(), "grant_type": "authorization_code"})
        info = requests.get("https://openidconnect.googleapis.com/v1/userinfo", timeout=10,
                            headers={"Authorization": f'Bearer {t.json()["access_token"]}'}).json() if t.ok else {}
    except Exception:
        return _back(redirect_to, "google_failed")
    email = str(info.get("email") or "").strip().lower()
    if not email or info.get("email_verified") is not True:
        return _back(redirect_to, "google_unverified")  # only addresses Google has verified may sign in
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.create_user(email, None, user_metadata={"full_name": str(info.get("name") or "")[:200]})
    if not user.is_active:
        return _back(redirect_to, "google_failed")
    if not user.email_confirmed_at:
        user.email_confirmed_at = timezone.now()
        user.save(update_fields=["email_confirmed_at"])
    s = make_session(user)
    frag = urlencode({"access_token": s["access_token"], "refresh_token": s["refresh_token"], "expires_in": s["expires_in"],
                      "expires_at": s["expires_at"], "token_type": "bearer", "type": "oauth"})
    return HttpResponseRedirect(f"{redirect_to}#{frag}")
