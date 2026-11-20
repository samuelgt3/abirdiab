from django.core.management.base import BaseCommand

from main.jobs import run_all


class Command(BaseCommand):
    help = "Run the scheduled jobs once (purge unpaid holds, send reminders and gift emails, clean up). Run it every 5 minutes."

    def handle(self, *args, **options):
        self.stdout.write(str(run_all()))
