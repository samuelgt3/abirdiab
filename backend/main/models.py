"""
Database tables. Names and columns follow section 3.1 of BACKEND_HANDOFF.md so the website
(including the admin screen, which reads tables directly) finds what it expects.
"""
import secrets
import string
import uuid

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.db.models.functions import Lower

_REF_CHARS = string.ascii_uppercase + string.digits


def new_ref():
    """Hard-to-guess booking reference like AD-7K2QX9M4B."""
    return "AD-" + "".join(secrets.choice(_REF_CHARS) for _ in range(9))


def new_gift_token():
    return secrets.token_urlsafe(32)


# --------------------------------------------------------------------------- users

class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError("invalid email")
        email = self.normalize_email(email).strip().lower()
        if self.model.objects.filter(email__iexact=email).exists():
            raise ValueError("exists")
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra)


class User(AbstractUser):
    """Customer / admin account. Log in with email + password."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField("email address", unique=True)
    # Set when the person proves they own the address (link in the email, or Google sign-in).
    # Only a confirmed email may claim earlier guest orders or be an admin.
    email_confirmed_at = models.DateTimeField(null=True, blank=True)
    # full_name, phone, phone_dial, country, marketing_opt_in, accepted_privacy_at, lang ...
    user_metadata = models.JSONField(default=dict, blank=True)
    # Raising this number logs the person out everywhere (password change, sign out).
    token_version = models.PositiveIntegerField(default=0)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    class Meta:
        constraints = [models.UniqueConstraint(Lower("email"), name="user_email_ci_unique")]

    def __str__(self):
        return self.email


# --------------------------------------------------------------------------- settings

def default_booking_times():
    return ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"]


def all_weekdays():
    return [0, 1, 2, 3, 4, 5, 6]  # website numbering: Sunday = 0


class SiteSettings(models.Model):
    """One row only (id = 1). Never exposed whole to the public: see public_settings()."""
    id = models.PositiveSmallIntegerField(primary_key=True, default=1)
    session_price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    session_length = models.TextField(blank=True, default="60 min")
    session_length_ar = models.TextField(blank=True, default="60 دقيقة")
    booking_times = ArrayField(models.CharField(max_length=5), default=default_booking_times, blank=True)
    booking_timezone = models.CharField(max_length=64, default="Asia/Dubai")
    booking_days_ahead = models.PositiveIntegerField(default=60)
    booking_weekdays = ArrayField(models.PositiveSmallIntegerField(), default=all_weekdays, blank=True)
    payments_enabled = models.BooleanField(default=False)
    payment_currency = models.CharField(max_length=3, default="EGP")
    payment_test_mode = models.BooleanField(default=False)
    google_signin_enabled = models.BooleanField(default=False)
    require_email_verification = models.BooleanField(default=False)
    require_phone_verification = models.BooleanField(default=False)
    session_link_base = models.TextField(blank=True, default="")
    emails_enabled = models.BooleanField(default=False)  # the owner switches this on once email sending is connected
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "site_settings"
        constraints = [models.CheckConstraint(condition=Q(id=1), name="site_settings_single_row")]

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj


class AdminEmail(models.Model):
    """The allow-list: only these (confirmed) emails are admins."""
    email = models.CharField(max_length=254, primary_key=True)

    class Meta:
        db_table = "admins"

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email


# --------------------------------------------------------------------------- bookings & orders

class AvailabilitySlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slot_date = models.DateField()
    slot_time = models.CharField(max_length=5)  # "HH:MM" in site_settings.booking_timezone
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "availability_slots"
        constraints = [models.UniqueConstraint(fields=["slot_date", "slot_time"], name="slot_unique")]
        ordering = ["slot_date", "slot_time"]


class Order(models.Model):
    """A PAID purchase. Rows are only created after the payment provider confirms payment."""

    class Kind(models.TextChoices):
        SESSION = "session"
        WORKSHOP = "workshop"
        COURSE = "course"
        GIFT = "gift"

    class Status(models.TextChoices):
        AWAITING_PAYMENT = "awaiting_payment"
        PAID = "paid"
        CONFIRMED = "confirmed"
        COMPLETED = "completed"
        CANCELLED = "cancelled"
        REFUNDED = "refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ref = models.CharField(max_length=20, unique=True, default=new_ref)
    kind = models.CharField(max_length=12, choices=Kind.choices)
    item_id = models.UUIDField(null=True, blank=True)
    item_title = models.TextField(blank=True, default="")
    session_date = models.DateField(null=True, blank=True)
    session_time = models.CharField(max_length=5, null=True, blank=True)
    session_timezone = models.CharField(max_length=64, null=True, blank=True)
    amount_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    display_currency = models.CharField(max_length=3, blank=True, default="")
    display_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    customer_name = models.TextField(blank=True, default="")
    email = models.EmailField(blank=True, default="")
    phone_country = models.CharField(max_length=2, blank=True, default="")
    phone_dial = models.CharField(max_length=8, blank=True, default="")
    phone = models.CharField(max_length=32, blank=True, default="")
    country = models.CharField(max_length=2, blank=True, default="")
    lang = models.CharField(max_length=2, default="en")
    notes = models.TextField(blank=True, default="")
    delivery_method = models.CharField(max_length=10, blank=True, default="email")  # email | whatsapp
    delivery_to = models.TextField(blank=True, default="")
    gift_to_name = models.TextField(blank=True, default="")
    gift_to_email = models.EmailField(blank=True, default="")
    gift_message = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AWAITING_PAYMENT)
    charge_currency = models.CharField(max_length=3, blank=True, default="")
    charge_amount_cents = models.BigIntegerField(null=True, blank=True)
    fx_rate = models.DecimalField(max_digits=18, decimal_places=6, null=True, blank=True)
    paymob_intention_id = models.TextField(blank=True, default="")
    paymob_order_id = models.TextField(blank=True, default="")
    paymob_transaction_id = models.BigIntegerField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    join_url = models.TextField(blank=True, default="")  # per-booking video link (1:1 sessions)
    thanks_sent_at = models.DateTimeField(null=True, blank=True)
    join_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["email"]), models.Index(fields=["user"]), models.Index(fields=["status"])]
        constraints = [
            # A 1:1 time can be sold once, no matter what (guards against two payments racing for the same slot).
            models.UniqueConstraint(
                fields=["session_date", "session_time"],
                condition=Q(kind="session") & ~Q(status__in=["cancelled", "refunded"]),
                name="order_session_slot_unique",
            ),
            # One order per payment transaction + item, so a repeated webhook can never double-book.
            models.UniqueConstraint(
                fields=["paymob_transaction_id", "ref"],
                condition=Q(paymob_transaction_id__isnull=False),
                name="order_txn_ref_unique",
            ),
        ]

    def __str__(self):
        return self.ref


class OrderAdminNote(models.Model):
    """Owner's private notes. Customers must never be able to read this."""
    order = models.OneToOneField(Order, primary_key=True, on_delete=models.CASCADE, related_name="admin_note")
    notes = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "order_admin_notes"


class OrderAccessKey(models.Model):
    """Guest device keys. Only the SHA-256 hash is stored, never the key."""
    id = models.BigAutoField(primary_key=True)
    ref = models.CharField(max_length=20, db_index=True)
    key_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_access_keys"
        constraints = [models.UniqueConstraint(fields=["ref", "key_hash"], name="access_key_unique")]


class CheckoutHold(models.Model):
    """30-minute hold on a slot / workshop seat. Holds no name, email or phone."""
    id = models.BigAutoField(primary_key=True)
    ref = models.CharField(max_length=20, db_index=True)
    kind = models.CharField(max_length=12)
    slot_date = models.DateField(null=True, blank=True)
    slot_time = models.CharField(max_length=5, null=True, blank=True)
    workshop = models.ForeignKey("Workshop", null=True, blank=True, on_delete=models.CASCADE)
    expires_at = models.DateTimeField(db_index=True)
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE)

    class Meta:
        db_table = "checkout_holds"
        constraints = [
            models.UniqueConstraint(
                fields=["slot_date", "slot_time"], condition=Q(kind="session"), name="hold_session_slot_unique"
            )
        ]


class CheckoutAttempt(models.Model):
    """Rate limit for starting a payment. ip_hash is one-way: the IP itself is never stored."""
    id = models.BigAutoField(primary_key=True)
    ip_hash = models.CharField(max_length=64, db_index=True)
    at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "checkout_attempts"


class RateLimitHit(models.Model):
    """General rate limiter (login, OTP, newsletter, ...). Works across several server processes."""
    id = models.BigAutoField(primary_key=True)
    bucket = models.CharField(max_length=40)
    key_hash = models.CharField(max_length=64)
    at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "rate_limit_hits"
        indexes = [models.Index(fields=["bucket", "key_hash", "at"])]


class PaymentEvent(models.Model):
    """One row per callback from the payment provider (kept for the owner's records and refunds)."""
    transaction_id = models.BigIntegerField(primary_key=True)
    provider = models.CharField(max_length=20, default="paymob")
    ref = models.CharField(max_length=20, blank=True, default="")
    success = models.BooleanField(default=False)
    pending = models.BooleanField(default=False)
    amount_cents = models.BigIntegerField(null=True, blank=True)
    currency = models.CharField(max_length=3, blank=True, default="")
    outcome = models.CharField(max_length=30, blank=True, default="")  # paid | duplicate | unknown_order | needs_refund ...
    raw = models.JSONField(default=dict, blank=True)
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payment_events"
        ordering = ["-created_at"]


# --------------------------------------------------------------------------- content

class Course(models.Model):
    """A material: course, meditation, manual ... (some are free)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.TextField(blank=True, default="")
    category_ar = models.TextField(blank=True, default="")
    type = models.CharField(max_length=30, blank=True, default="course")
    title = models.TextField()
    title_ar = models.TextField(blank=True, default="")
    description = models.TextField(blank=True, default="")
    description_ar = models.TextField(blank=True, default="")
    full_description = models.TextField(blank=True, default="")
    full_description_ar = models.TextField(blank=True, default="")
    meta = models.TextField(blank=True, default="")
    meta_ar = models.TextField(blank=True, default="")
    badge = models.TextField(blank=True, default="")
    badge_ar = models.TextField(blank=True, default="")
    what_you_get = models.JSONField(default=list, blank=True)
    what_you_get_ar = models.JSONField(default=list, blank=True)
    image_url = models.TextField(blank=True, default="")
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False)
    downloadable = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)
    published = models.BooleanField(default=False)
    pack_items = models.JSONField(default=list, blank=True)
    has_teaser = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "courses"
        ordering = ["sort_order", "created_at"]


class CourseFile(models.Model):
    """PRIVATE file / video of a course (admin-only table)."""
    course = models.OneToOneField(Course, primary_key=True, on_delete=models.CASCADE, related_name="private")
    file_path = models.TextField(blank=True, default="")  # inside the private bucket
    video_id = models.TextField(blank=True, default="")    # Bunny Stream video id

    class Meta:
        db_table = "course_files"


class CourseActivity(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    last_opened_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "course_activity"
        constraints = [models.UniqueConstraint(fields=["user", "course"], name="course_activity_unique")]


class LessonProgress(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    lesson_key = models.CharField(max_length=100)
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lesson_progress"
        constraints = [models.UniqueConstraint(fields=["user", "course", "lesson_key"], name="lesson_progress_unique")]


class Workshop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    title_ar = models.TextField(blank=True, default="")
    starts_at = models.DateTimeField()
    time_label = models.TextField(blank=True, default="")
    time_label_ar = models.TextField(blank=True, default="")
    spots = models.PositiveIntegerField(default=0)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    format = models.TextField(blank=True, default="")
    format_ar = models.TextField(blank=True, default="")
    duration = models.TextField(blank=True, default="")
    duration_ar = models.TextField(blank=True, default="")
    overview = models.TextField(blank=True, default="")
    overview_ar = models.TextField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "workshops"
        ordering = ["starts_at"]


class WorkshopLink(models.Model):
    """PRIVATE joining link of a workshop. Shown to customers only from 2 hours before the start."""
    workshop = models.OneToOneField(Workshop, primary_key=True, on_delete=models.CASCADE, related_name="link")
    join_link = models.TextField(blank=True, default="")

    class Meta:
        db_table = "workshop_links"


class JournalPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.TextField(blank=True, default="")
    category_ar = models.TextField(blank=True, default="")
    read_time = models.TextField(blank=True, default="")
    read_time_ar = models.TextField(blank=True, default="")
    title = models.TextField()
    title_ar = models.TextField(blank=True, default="")
    excerpt = models.TextField(blank=True, default="")
    excerpt_ar = models.TextField(blank=True, default="")
    body = models.TextField(blank=True, default="")
    body_ar = models.TextField(blank=True, default="")
    image_url = models.TextField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "journal_posts"
        ordering = ["sort_order", "-published_at"]


class MeditationSample(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    title_ar = models.TextField(blank=True, default="")
    note = models.TextField(blank=True, default="")
    note_ar = models.TextField(blank=True, default="")
    duration = models.TextField(blank=True, default="")
    duration_ar = models.TextField(blank=True, default="")
    audio_url = models.TextField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "meditation_samples"
        ordering = ["sort_order", "created_at"]


class Testimonial(models.Model):
    class Kind(models.TextChoices):
        WRITTEN = "written"
        VOICE = "voice"
        SCREENSHOT = "screenshot"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.WRITTEN)
    name = models.TextField(blank=True, default="")
    name_ar = models.TextField(blank=True, default="")
    role = models.TextField(blank=True, default="")
    role_ar = models.TextField(blank=True, default="")
    quote = models.TextField(blank=True, default="")
    quote_ar = models.TextField(blank=True, default="")
    summary = models.TextField(blank=True, default="")
    summary_ar = models.TextField(blank=True, default="")
    audio_url = models.TextField(blank=True, default="")
    image_url = models.TextField(blank=True, default="")
    image_url_ar = models.TextField(blank=True, default="")
    via = models.TextField(blank=True, default="")
    via_ar = models.TextField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "testimonials"
        ordering = ["sort_order", "created_at"]


class TestimonialSubmission(models.Model):
    """A story sent by a visitor (needs consent)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField(blank=True, default="")
    email = models.EmailField(blank=True, default="")
    service = models.TextField(blank=True, default="")
    story = models.TextField()
    lang = models.CharField(max_length=2, default="en")
    consent = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default="new")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "testimonial_submissions"
        ordering = ["-created_at"]


class NewsletterSubscriber(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    lang = models.CharField(max_length=2, default="en")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "newsletter_subscribers"
        ordering = ["-created_at"]


# --------------------------------------------------------------------------- gifts, verification, audit

class Gift(models.Model):
    class Mode(models.TextChoices):
        CARD = "card"      # sender gets a link to share
        DIRECT = "direct"  # receiver is emailed

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=80, unique=True, default=new_gift_token)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="gifts")
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.CARD)
    sender_name = models.TextField(blank=True, default="")
    recipient_name = models.TextField(blank=True, default="")
    recipient_email = models.EmailField(blank=True, default="")
    message = models.TextField(blank=True, default="")
    lang = models.CharField(max_length=2, default="en")
    recipient_sent_at = models.DateTimeField(null=True, blank=True)
    redeemed_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="redeemed_gifts")
    redeemed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "gifts"
        ordering = ["-created_at"]


class CourseAccess(models.Model):
    """A material a member owns: bought, received as a gift, or claimed (free)."""
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="course_access")
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    source = models.CharField(max_length=10, default="order")  # order | gift | free
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_access"
        constraints = [models.UniqueConstraint(fields=["user", "course"], name="course_access_unique")]


class Verification(models.Model):
    """One-time codes (email / phone). Only a hash of the code is stored."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=10)  # email | phone
    target = models.TextField()
    code_hash = models.CharField(max_length=64, blank=True, default="")
    expires_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
    ip_hash = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "verifications"
        indexes = [models.Index(fields=["kind", "target"])]


class AdminAudit(models.Model):
    """Who changed what."""
    id = models.BigAutoField(primary_key=True)
    at = models.DateTimeField(auto_now_add=True)
    actor = models.UUIDField(null=True, blank=True)
    actor_email = models.TextField(blank=True, default="")
    table_name = models.TextField()
    op = models.CharField(max_length=10)
    row_id = models.TextField(blank=True, default="")
    summary = models.TextField(blank=True, default="")
    changes = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "admin_audit"
        ordering = ["-at"]
