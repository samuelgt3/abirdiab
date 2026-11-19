import json
from datetime import date, timedelta
from urllib.parse import parse_qs, urlparse

from django.core import mail
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import AdminEmail, CheckoutHold, Order, SiteSettings, User
from .permissions import is_admin_user
from .security import password_problem, strong_enough
from .tokens import make_token

GOOD_PW = "Sunrise2026"


def post(client, path, data, token=None):
    extra = {"HTTP_AUTHORIZATION": f"Bearer {token}"} if token else {}
    return client.post(path, json.dumps(data), content_type="application/json", **extra)


@override_settings(LEAKED_PASSWORD_CHECK=False)
class AuthFlowTests(TestCase):
    def signup(self, email="Sara@Example.com", pw=GOOD_PW, **extra):
        return post(self.client, "/api/auth/signup", {"email": email, "password": pw, **extra})

    def confirm(self):
        """Follow the link in the confirmation email; return the session tokens from the redirect."""
        body = mail.outbox[-1].body
        link = next(w for w in body.split() if w.startswith("http"))
        r = self.client.get(link.replace("http://testserver", ""))
        self.assertEqual(r.status_code, 302)
        frag = parse_qs(urlparse(r["Location"]).fragment)
        return {k: v[0] for k, v in frag.items()}

    def test_password_rule_matches_website(self):
        self.assertTrue(strong_enough("abcdefg1"))
        self.assertTrue(strong_enough("كلمةمرور1"))
        self.assertFalse(strong_enough("short1"))
        self.assertFalse(strong_enough("onlyletters"))
        self.assertFalse(strong_enough("12345678"))
        self.assertIsNone(password_problem(GOOD_PW))
        self.assertEqual(password_problem("password123"), "weak password")  # too common

    def test_signup_then_must_confirm_email_before_login(self):
        r = self.signup(data={"full_name": "Sara A", "evil": "x"})
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["session"])
        u = User.objects.get(email="sara@example.com")
        self.assertEqual(u.user_metadata, {"full_name": "Sara A"})  # unknown keys dropped
        self.assertEqual(len(mail.outbox), 1)

        r = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "sara@example.com", "password": GOOD_PW})
        self.assertEqual(r.status_code, 400)
        self.assertIn("confirm", r.json()["message"].lower())  # the site matches /confirm/i

        tokens = self.confirm()
        self.assertEqual(tokens["type"], "signup")
        u.refresh_from_db()
        self.assertIsNotNone(u.email_confirmed_at)

        r = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "SARA@example.com", "password": GOOD_PW})
        self.assertEqual(r.status_code, 200)
        s = r.json()
        self.assertEqual(s["user"]["email"], "sara@example.com")
        self.assertTrue(s["user"]["email_confirmed_at"])

    def test_existing_email_is_not_revealed(self):
        self.signup()
        r = self.signup()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["user"]["identities"], [])
        self.assertEqual(User.objects.count(), 1)

    def test_weak_and_bad_input(self):
        self.assertEqual(self.signup(pw="abc").json()["message"], "weak password")
        self.assertEqual(self.signup(email="nope").json()["message"], "invalid email")

    def test_wrong_password_and_unknown_email_look_the_same(self):
        self.signup(); self.confirm()
        a = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "sara@example.com", "password": "Wrong12345"})
        b = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "who@example.com", "password": "Wrong12345"})
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))

    def test_login_is_rate_limited(self):
        for _ in range(10):
            post(self.client, "/api/auth/token", {"grant_type": "password", "email": "x@example.com", "password": "Wrong12345"})
        r = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "x@example.com", "password": "Wrong12345"})
        self.assertEqual(r.status_code, 429)
        self.assertEqual(r.json()["message"], "rate_limited")

    def test_refresh_and_signout_everywhere(self):
        self.signup(); self.confirm()
        s = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "sara@example.com", "password": GOOD_PW}).json()
        r = post(self.client, "/api/auth/token", {"grant_type": "refresh_token", "refresh_token": s["refresh_token"]})
        self.assertEqual(r.status_code, 200)
        # an access token is not accepted as a refresh token
        r = post(self.client, "/api/auth/token", {"grant_type": "refresh_token", "refresh_token": s["access_token"]})
        self.assertEqual(r.status_code, 401)
        post(self.client, "/api/auth/logout", {}, token=s["access_token"])
        r = post(self.client, "/api/auth/token", {"grant_type": "refresh_token", "refresh_token": s["refresh_token"]})
        self.assertEqual(r.status_code, 401)

    def test_user_endpoint_needs_login_and_whitelists_profile(self):
        self.assertEqual(self.client.get("/api/auth/user").status_code, 401)
        self.signup(); self.confirm()
        s = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "sara@example.com", "password": GOOD_PW}).json()
        auth = {"HTTP_AUTHORIZATION": f"Bearer {s['access_token']}"}
        r = self.client.put("/api/auth/user", json.dumps({"data": {"full_name": "Sara B", "is_staff": True}}),
                            content_type="application/json", **auth)
        self.assertEqual(r.json()["user"]["user_metadata"], {"full_name": "Sara B"})
        self.assertFalse(User.objects.get().is_staff)

    def test_password_change_signs_out_old_tokens_but_returns_new_session(self):
        self.signup(); self.confirm()
        s = post(self.client, "/api/auth/token", {"grant_type": "password", "email": "sara@example.com", "password": GOOD_PW}).json()
        auth = {"HTTP_AUTHORIZATION": f"Bearer {s['access_token']}"}
        r = self.client.put("/api/auth/user", json.dumps({"password": "Moonlight77"}), content_type="application/json", **auth)
        self.assertEqual(r.status_code, 200)
        self.assertIn("session", r.json())
        self.assertEqual(self.client.get("/api/auth/user", **auth).status_code, 401)  # old token dead
        new = {"HTTP_AUTHORIZATION": f"Bearer {r.json()['session']['access_token']}"}
        self.assertEqual(self.client.get("/api/auth/user", **new).status_code, 200)

    def test_password_reset_is_silent_and_link_works(self):
        self.signup(); self.confirm()
        mail.outbox.clear()
        self.assertEqual(post(self.client, "/api/auth/recover", {"email": "nobody@example.com"}).status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(post(self.client, "/api/auth/recover", {"email": "sara@example.com"}).status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        tokens = self.confirm()
        self.assertEqual(tokens["type"], "recovery")
        self.assertIn("access_token", tokens)

    def test_email_links_only_go_back_to_the_real_site(self):
        self.signup(redirect_to="https://evil.example/steal"); 
        link = next(w for w in mail.outbox[-1].body.split() if w.startswith("http"))
        r = self.client.get(link.replace("http://testserver", ""))
        self.assertTrue(r["Location"].startswith("http://localhost:5173/account#"))

    def test_bad_or_wrong_type_link_is_refused(self):
        u = User.objects.create_user("a@example.com", GOOD_PW)
        access = make_token(u, "access", 600)  # an access token must not work as a confirmation link
        r = self.client.get(f"/api/auth/verify?type=signup&token={access}&redirect_to=http://localhost:5173/account")
        self.assertIn("error=link_expired", r["Location"])
        u.refresh_from_db()
        self.assertIsNone(u.email_confirmed_at)


class AdminAllowListTests(TestCase):
    def test_admin_needs_allow_list_and_confirmed_email(self):
        u = User.objects.create_user("Boss@Example.com", GOOD_PW)
        self.assertFalse(is_admin_user(u))
        AdminEmail.objects.create(email="BOSS@example.com")
        self.assertFalse(is_admin_user(u))          # on the list but email not confirmed
        u.email_confirmed_at = timezone.now(); u.save()
        self.assertTrue(is_admin_user(u))
        self.assertFalse(is_admin_user(None))

    def test_make_admin_command(self):
        from django.core.management import call_command
        call_command("make_admin", "owner@example.com", "--password", GOOD_PW)
        self.assertTrue(is_admin_user(User.objects.get(email="owner@example.com")))


class DatabaseRuleTests(TestCase):
    """The database itself refuses double-booking, even if two payments race."""

    def make_order(self, **kw):
        base = dict(kind="session", session_date=date(2030, 1, 10), session_time="10:00", status="paid")
        base.update(kw)
        return Order.objects.create(**base)

    def test_same_session_slot_cannot_be_sold_twice(self):
        self.make_order()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_order()

    def test_cancelled_slot_can_be_sold_again(self):
        self.make_order(status="cancelled")
        self.make_order()

    def test_refs_are_unique_and_hard_to_guess(self):
        a, b = self.make_order(), self.make_order(session_time="11:00")
        self.assertRegex(a.ref, r"^AD-[A-Z0-9]{9}$")
        self.assertNotEqual(a.ref, b.ref)

    def test_one_hold_per_session_slot(self):
        exp = timezone.now() + timedelta(minutes=30)
        CheckoutHold.objects.create(ref="AD-1", kind="session", slot_date=date(2030, 1, 10), slot_time="10:00", expires_at=exp)
        with self.assertRaises(IntegrityError), transaction.atomic():
            CheckoutHold.objects.create(ref="AD-2", kind="session", slot_date=date(2030, 1, 10), slot_time="10:00", expires_at=exp)

    def test_site_settings_is_a_single_row(self):
        SiteSettings.get()
        with self.assertRaises(IntegrityError), transaction.atomic():
            SiteSettings.objects.create(id=2)

    def test_email_unique_ignoring_capitals(self):
        User.objects.create_user("a@example.com", GOOD_PW)
        with self.assertRaises(ValueError):
            User.objects.create_user("A@Example.com", GOOD_PW)
