"""Sending email. For now this uses Django's mail backend (prints in the terminal while developing).
The real provider (Resend) and the branded templates are added with the email phase."""
from django.conf import settings
from django.core.mail import send_mail


def send_email(to: str, subject: str, text: str, html: str = None) -> None:
    send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [to], html_message=html, fail_silently=False)
