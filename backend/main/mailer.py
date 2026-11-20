"""Sending email. With RESEND_API_KEY set, mail goes out through Resend; otherwise Django's mail backend is used
(it prints in the terminal while developing)."""
import os

import requests
from django.conf import settings
from django.core.mail import send_mail


def send_email(to: str, subject: str, text: str, html: str = None) -> None:
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        send_mail(subject, text, settings.DEFAULT_FROM_EMAIL, [to], html_message=html, fail_silently=False)
        return
    body = {"from": settings.DEFAULT_FROM_EMAIL, "to": [to], "subject": subject, "text": text}
    if html:
        body["html"] = html
    r = requests.post("https://api.resend.com/emails", json=body, timeout=15, headers={"Authorization": f"Bearer {key}"})
    if not r.ok:
        raise RuntimeError(f"email provider refused the message ({r.status_code})")
