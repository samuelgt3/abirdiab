"""
Django settings for the Abir Diab backend.

Every secret / address comes from environment variables (see backend/.env.example).
Nothing secret lives in this file.
"""
import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env(name, default=None):
    return os.environ.get(name, default)


def env_bool(name, default=False):
    return str(env(name, str(default))).strip().lower() in ("1", "true", "yes", "on")


def env_list(name, default=""):
    return [x.strip() for x in str(env(name, default)).split(",") if x.strip()]


DEBUG = env_bool("DEBUG", False)

SECRET_KEY = env("SECRET_KEY")
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = "dev-only-not-secret"
    else:
        raise RuntimeError("SECRET_KEY is not set. Add it to backend/.env (see .env.example).")

if not DEBUG and len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY is too short. Use at least 32 random characters.")

ALLOWED_HOSTS = ["*"]


# The public website address(es) that may call this API and that links in emails point to.
SITE_URL = env("SITE_URL", "http://localhost:5173").rstrip("/")
SITE_URLS = env_list("SITE_URLS", SITE_URL)
# AUTO_CONFIRM_EMAIL=1: new sign-ups are confirmed straight away (no email link). Admin emails are never auto-confirmed.
AUTO_CONFIRM_EMAIL = env("AUTO_CONFIRM_EMAIL", "").strip().lower() in ("1", "true", "yes", "on")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    "corsheaders",
    "main.apps.MainConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    'whitenoise.middleware.WhiteNoiseMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Only the real website may call the API from a browser (never "*").
CORS_ALLOWED_ORIGINS = SITE_URLS
CORS_ALLOW_HEADERS = ["authorization", "content-type", "x-client-info"]

ROOT_URLCONF = "mysite.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "mysite.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("PGDATABASE", "postgres"),
        "USER": os.environ.get("PGUSER", "postgres"),
        "PASSWORD": os.environ.get("PGPASSWORD", ""),
        "HOST": os.environ.get("PGHOST", "localhost"),
        "PORT": os.environ.get("PGPORT", "5432"),
    }
}
AUTH_USER_MODEL = "main.User"
AUTHENTICATION_BACKENDS = ["main.backends.EmailBackend"]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]
# Also reject passwords that appear in known data leaks (haveibeenpwned, k-anonymity: the password never leaves the server).
LEAKED_PASSWORD_CHECK = env_bool("LEAKED_PASSWORD_CHECK", not DEBUG)

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"  # times are stored in UTC; each booking keeps its own timezone name
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

# Uploaded files. Both folders must be on a disk that is kept between restarts / deploys.
MEDIA_ROOT = env("MEDIA_ROOT", str(BASE_DIR / "data" / "media"))                 # public pictures / audio
PRIVATE_FILES_ROOT = env("PRIVATE_FILES_ROOT", str(BASE_DIR / "data" / "private"))  # paid PDFs etc.
MAX_UPLOAD_MB = int(env("MAX_UPLOAD_MB", "100"))
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024  # normal (non-file) requests are small

# Bunny Stream (paid course videos). The token key is the library's "Token Authentication Key" - keep it secret.
BUNNY_TOKEN_KEY = env("BUNNY_TOKEN_KEY", "")
STATIC_ROOT = BASE_DIR / "staticfiles"

# ---- Login tokens (the site keeps them in the browser; no cookies, so no CSRF risk on the API) ----
JWT_SECRET = env("JWT_SECRET", SECRET_KEY)
ACCESS_TOKEN_SECONDS = 60 * 60            # 1 hour
REFRESH_TOKEN_SECONDS = 60 * 60 * 24 * 30  # 30 days

# ---- Email (real sending is added with the email provider; until then emails print in the terminal) ----
EMAIL_BACKEND = env("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("MAIL_FROM", "Abir Diab <no-reply@localhost>")
CSRF_TRUSTED_ORIGINS = ["https://*.up.railway.app"]
# ---- Production hardening (only when DEBUG is off) ----
if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30
    SECURE_CONTENT_TYPE_NOSNIFF = True
