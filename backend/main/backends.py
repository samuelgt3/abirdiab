from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class EmailBackend(ModelBackend):
    """Log in with email (any capitalisation) + password."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        email = (username or kwargs.get("email") or "").strip()
        if not email or password is None:
            return None
        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            User().set_password(password)  # same timing whether or not the email exists
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
