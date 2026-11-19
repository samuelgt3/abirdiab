from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from main.models import AdminEmail


class Command(BaseCommand):
    help = "Add an email to the admin allow-list (and create the account if it does not exist yet)."

    def add_arguments(self, parser):
        parser.add_argument("email")
        parser.add_argument("--password", help="Only needed when the account does not exist yet.")

    def handle(self, *args, **opts):
        email = opts["email"].strip().lower()
        AdminEmail.objects.get_or_create(email=email)
        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            if not opts["password"]:
                self.stdout.write(f"{email} is on the admin list. They can now sign up on the website and confirm their email.")
                return
            user = User.objects.create_user(email, opts["password"])
        if not user.email_confirmed_at:
            user.email_confirmed_at = timezone.now()
            user.save(update_fields=["email_confirmed_at"])
        self.stdout.write(self.style.SUCCESS(f"{email} is an admin."))
