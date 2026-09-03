from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, Email, password=None, **extra_fields):
        if not Email:
            raise ValueError("Please fill in the email field")
        if len(User.objects.filter(email=Email))>0:
            raise ValueError("This email is already in use. Please use another email or reset your password")

        Email = self.normalize_email(Email)
        user = self.model(email=Email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    USERNAME_FIELD = 'email'
    first_name=models.CharField(max_length=50)
    last_name=models.CharField(max_length=50)
    email = models.EmailField(('email address'), unique=True) # changes email to unique and blank to false
    REQUIRED_FIELDS = [first_name, last_name]
    objects = UserManager()



class Appointment(models.Model):

    class Status(models.TextChoices):
        HELD = "held", "Held"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    ALLOWED_TRANSITIONS = {
        Status.HELD: {Status.CONFIRMED, Status.CANCELLED},
        Status.CONFIRMED: {Status.CANCELLED},
        Status.CANCELLED: set(),  
    }

    aptTime=models.DateTimeField()
    user=models.ForeignKey(User, on_delete=models.CASCADE)
    length=models.IntegerField()
    status=models.CharField(max_length=20, choices=Status, default=Status.HELD)
    updatedTime = models.DateTimeField(auto_now=True)
    zoomLink=models.TextField()

class Course(models.Model):
    class Language(models.TextChoices):
        ENG="English"
        AR="Arabic"
    name=models.CharField(max_length=100)
    description=models.TextField()
    price=models.PositiveIntegerField()
    downloadable=models.BooleanField()
    preview_id=models.TextField()
    playback_id=models.TextField()
    manage_id=models.TextField()
    language=models.CharField(max_length=20, default="English", choices=Language)

class BlogPost(models.Model):
    title=models.TextField()
    contentEng=models.TextField()

class Testimonial(models.Model):
    name=models.TextField()
    text=models.TextField()

class GroupSession(models.Model):
    total_capacity=models.IntegerField()
    seats_left=models.IntegerField()
    time=models.DateTimeField()
    name=models.TextField()