from django.contrib import admin

from . import models

for m in (models.User, models.SiteSettings, models.AdminEmail, models.AvailabilitySlot, models.Order,
          models.Course, models.Workshop, models.JournalPost, models.Testimonial, models.NewsletterSubscriber):
    admin.site.register(m)
