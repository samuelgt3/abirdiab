import json
import os
import re
from datetime import timedelta
from unittest import mock
from urllib.parse import parse_qs, urlparse

import jwt
from django.conf import settings
from django.core import mail
from django.utils import timezone

from . import jobs
from .models import (CheckoutAttempt, CourseAccess, Gift, NewsletterSubscriber, Order, RateLimitHit, SiteSettings, User,
                     Verification, WorkshopLink)
from .test_phase2 import Base, make_user
from .test_phase3 import Shop, person


def code_from_mail():
    return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)


class CodeTests(Base):
    def send(self, **kw):
        return self.call("/api/fn/send-code", dict({"kind": "email", "target": "Sara@Example.com", "lang": "en"}, **kw))

    def check(self, code, **kw):
        return self.call("/api/fn/check-code", dict({"kind": "email", "target": "sara@example.com", "code": code}, **kw))

    def test_email_code_round_trip_and_single_use_id(self):
        self.assertEqual(self.send().json(), {"sent": True})
        v = Verification.objects.get()
        self.assertNotIn(code_from_mail(), v.code_hash)  # only a hash is stored
        r = self.check(code_from_mail())
        self.assertTrue(r.json()["verified"])
        self.assertEqual(r.json()["id"], str(v.id))
        self.assertEqual(self.check(code_from_mail()).json()["error"], "wrong_code")  # already used up

    def test_wrong_code_five_times_locks(self):
        self.send()
        good = code_from_mail()
        bad = "000000" if good != "000000" else "111111"
        for _ in range(5):
            self.assertEqual(self.check(bad).json()["error"], "wrong_code")
        self.assertEqual(self.check(good).json()["error"], "too_many")

    def test_expired_and_unknown(self):
        self.send()
        Verification.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        self.assertEqual(self.check(code_from_mail()).json()["error"], "expired")
        self.assertEqual(self.check("123456", target="nobody@example.com").json()["error"], "wrong_code")
        self.assertEqual(self.check("12").json()["error"], "wrong_code")

    def test_rate_limits_and_bad_input(self):
        for _ in range(5):
            self.assertEqual(self.send().status_code, 200)
        r = self.send()
        self.assertEqual((r.status_code, r.json()["error"]), (429, "rate_limited"))
        self.assertEqual(self.send(target="nope").json()["error"], "send_failed")
        self.assertEqual(self.send(kind="fax").json()["error"], "send_failed")

    def test_arabic_email(self):
        self.send(lang="ar")
        self.assertIn("رمز التحقق", mail.outbox[0].subject)

    def test_phone_needs_twilio(self):
        r = self.send(kind="phone", target="+20 101 234 5678")
        self.assertEqual((r.status_code, r.json()["error"]), (503, "not_configured"))

    def test_phone_through_twilio(self):
        env = {"TWILIO_ACCOUNT_SID": "AC1", "TWILIO_AUTH_TOKEN": "t", "TWILIO_VERIFY_SID": "VA1"}
        ok = mock.Mock(ok=True)
        ok.json.return_value = {"status": "approved"}
        with mock.patch.dict(os.environ, env), mock.patch("main.otp.requests.post", return_value=ok) as post:
            self.assertEqual(self.send(kind="phone", target="201012345678", channel="whatsapp").json(), {"sent": True})
            self.assertTrue(post.call_args.args[0].endswith("/Services/VA1/Verifications"))
            self.assertEqual(post.call_args.kwargs["data"], {"To": "+201012345678", "Channel": "whatsapp"})
            r = self.call("/api/fn/check-code", {"kind": "phone", "target": "201012345678", "code": "123456"})
            self.assertTrue(r.json()["verified"])
            ok.json.return_value = {"status": "pending"}
            self.send(kind="phone", target="201012345678")
            r = self.call("/api/fn/check-code", {"kind": "phone", "target": "201012345678", "code": "654321"})
            self.assertEqual(r.json()["error"], "wrong_code")

    def test_verified_phone_goes_into_an_order(self):
        s = SiteSettings.get()
        s.require_phone_verification = True
        s.save()
        v = Verification.objects.create(kind="phone", target="971501234567", expires_at=timezone.now() + timedelta(minutes=5),
                                        verified_at=timezone.now())
        from . import checkout
        details = checkout.clean_details(person(phone="0501234567"), s, None)
        checkout.require_verifications({"phone_verification": str(v.id)}, details, None, s)  # dial + number without the leading 0
        v.refresh_from_db()
        self.assertIsNotNone(v.used_at)


class SignupVerifiedTests(Base):
    def verified(self, email="new@example.com"):
        return Verification.objects.create(kind="email", target=email, expires_at=timezone.now() + timedelta(minutes=5),
                                           verified_at=timezone.now())

    def signup(self, vid, **kw):
        body = {"email": "new@example.com", "password": "Sunrise2026", "name": "New Person", "email_verification": str(vid)}
        return self.call("/api/fn/signup-verified", dict(body, **kw))

    def test_creates_a_confirmed_account_that_can_sign_in(self):
        v = self.verified()
        self.assertEqual(self.signup(v.id).json(), {"created": True})
        u = User.objects.get(email="new@example.com")
        self.assertIsNotNone(u.email_confirmed_at)
        self.assertEqual(u.user_metadata["full_name"], "New Person")
        r = self.call("/api/auth/token", {"grant_type": "password", "email": "new@example.com", "password": "Sunrise2026"})
        self.assertEqual(r.status_code, 200, r.content)
        v.refresh_from_db()
        self.assertIsNone(v.used_at)  # the same code can still go into the order

    def test_refuses_without_a_checked_code(self):
        self.assertEqual(self.signup("not-a-uuid").json()["error"], "verification required")
        v = Verification.objects.create(kind="email", target="new@example.com", expires_at=timezone.now() + timedelta(minutes=5))
        self.assertEqual(self.signup(v.id).json()["error"], "verification required")  # never checked
        other = self.verified("other@example.com")
        self.assertEqual(self.signup(other.id).json()["error"], "verification required")  # code was for another address
        self.assertEqual(User.objects.filter(email="new@example.com").count(), 0)

    def test_weak_password_and_existing_account(self):
        v = self.verified()
        self.assertEqual(self.signup(v.id, password="abc").json()["error"], "weak password")
        v2 = self.verified("member@example.com")
        self.assertEqual(self.signup(v2.id, email="member@example.com").json()["error"], "exists")


class DeleteAccountTests(Shop):
    def test_scrubs_orders_and_removes_the_login(self):
        o = Order.objects.create(kind="course", item_id=self.paid.id, status="paid", user=self.member, customer_name="Mona",
                                 email="member@example.com", phone="501234567", notes="hi", amount_usd=20)
        CourseAccess.objects.create(user=self.member, course=self.paid)
        NewsletterSubscriber.objects.create(email="member@example.com")
        r = self.call("/api/fn/delete-account", {"confirm": "DELETE"}, self.member)
        self.assertEqual(r.json(), {"deleted": True})
        o.refresh_from_db()
        self.assertEqual((o.customer_name, o.email, o.phone, o.notes, o.user_id), ("Deleted customer", "", "", "", None))
        self.assertEqual(float(o.amount_usd), 20.0)  # kept for accounting
        self.assertFalse(User.objects.filter(email="member@example.com").exists())
        self.assertFalse(NewsletterSubscriber.objects.exists())
        self.assertEqual(CourseAccess.objects.count(), 0)

    def test_needs_confirmation_login_and_refuses_admins(self):
        self.assertEqual(self.call("/api/fn/delete-account", {"confirm": "no"}, self.member).json()["error"], "confirmation required")
        self.assertEqual(self.call("/api/fn/delete-account", {"confirm": "DELETE"}).status_code, 401)
        self.assertEqual(self.call("/api/fn/delete-account", {"confirm": "DELETE"}, self.admin).status_code, 403)
        self.assertTrue(User.objects.filter(email="boss@example.com").exists())

    def test_gift_details_are_scrubbed_too(self):
        o = Order.objects.create(kind="gift", item_id=self.paid.id, status="paid", user=self.member, gift_to_email="x@example.com")
        g = Gift.objects.create(order=o, course=self.paid, sender_name="Mona", recipient_email="x@example.com", message="hello")
        self.call("/api/fn/delete-account", {"confirm": "DELETE"}, self.member)
        g.refresh_from_db()
        self.assertEqual((g.sender_name, g.recipient_email, g.message), ("", "", ""))


class JobTests(Shop):
    def setUp(self):
        super().setUp()
        self.s.emails_enabled = True
        self.s.save()

    def workshop_order(self, hours_to_start, **kw):
        self.ws.starts_at = timezone.now() + timedelta(hours=hours_to_start)
        self.ws.save()
        WorkshopLink.objects.update_or_create(workshop=self.ws, defaults={"join_link": "https://zoom.us/j/ws"})
        return Order.objects.create(kind="workshop", item_id=self.ws.id, item_title="WS", status="paid", email="a@example.com",
                                    delivery_method="email", customer_name="Ana Lee", **kw)

    def test_reminder_goes_out_two_hours_before_and_only_once(self):
        o = self.workshop_order(5)
        self.assertEqual(jobs.send_reminders(), 0)  # too early
        self.ws.starts_at = timezone.now() + timedelta(hours=1, minutes=59)
        self.ws.save()
        self.assertEqual(jobs.send_reminders(), 1)
        self.assertIn("https://zoom.us/j/ws", mail.outbox[0].body)
        o.refresh_from_db()
        self.assertIsNotNone(o.join_sent_at)
        self.assertEqual(jobs.send_reminders(), 0)

    def test_reminder_keeps_trying_until_six_hours_after_and_needs_a_link(self):
        self.workshop_order(-3)
        self.assertEqual(jobs.send_reminders(), 1)  # late link still goes out
        o2 = self.workshop_order(-8)
        Order.objects.exclude(pk=o2.pk).update(join_sent_at=timezone.now())
        self.assertEqual(jobs.send_reminders(), 0)  # too late
        o3 = self.workshop_order(1)
        WorkshopLink.objects.update(join_link="")
        Order.objects.exclude(pk=o3.pk).update(join_sent_at=timezone.now())
        self.assertEqual(jobs.send_reminders(), 0)  # no link yet: nothing to send

    def test_reminder_skips_whatsapp_unpaid_and_emails_off(self):
        o = self.workshop_order(1)
        Order.objects.filter(pk=o.pk).update(delivery_method="whatsapp")
        self.assertEqual(jobs.send_reminders(), 0)
        Order.objects.filter(pk=o.pk).update(delivery_method="email", status="awaiting_payment")
        self.assertEqual(jobs.send_reminders(), 0)
        Order.objects.filter(pk=o.pk).update(status="paid")
        self.s.emails_enabled = False
        self.s.save()
        self.assertEqual(jobs.send_reminders(), 0)

    def test_session_reminder_uses_its_own_link(self):
        start = timezone.now() + timedelta(hours=1)
        from zoneinfo import ZoneInfo
        local = start.astimezone(ZoneInfo(self.s.booking_timezone))
        Order.objects.create(kind="session", item_title="1:1", status="paid", email="s@example.com", delivery_method="email",
                             join_url="https://zoom.us/j/mine", session_date=local.date(), session_time=local.strftime("%H:%M"),
                             session_timezone=self.s.booking_timezone, customer_name="Sam Lee")
        self.assertEqual(jobs.send_reminders(), 1)
        self.assertIn("https://zoom.us/j/mine", mail.outbox[0].body)

    def test_direct_gift_email_once(self):
        o = Order.objects.create(kind="gift", item_id=self.paid.id, status="paid")
        g = Gift.objects.create(order=o, course=self.paid, mode="direct", sender_name="Sara", recipient_name="Layla Hassan",
                                recipient_email="layla@example.com", message="enjoy")
        Gift.objects.create(order=o, course=self.paid, mode="card", sender_name="Sara")
        self.assertEqual(jobs.send_gift_emails(), 1)
        self.assertEqual(mail.outbox[0].to, ["layla@example.com"])
        self.assertIn(f"/gift/{g.token}", mail.outbox[0].body)
        self.assertEqual(jobs.send_gift_emails(), 0)
        unpaid = Order.objects.create(kind="gift", item_id=self.paid.id, status="awaiting_payment")
        Gift.objects.create(order=unpaid, course=self.paid, mode="direct", recipient_email="z@example.com")
        self.assertEqual(jobs.send_gift_emails(), 0)

    def test_purge_and_cleanup(self):
        from .models import CheckoutHold
        CheckoutHold.objects.create(ref="AD-OLD", kind="session", slot_date=self.day, slot_time="10:00",
                                    expires_at=timezone.now() - timedelta(minutes=1))
        live = CheckoutHold.objects.create(ref="AD-NEW", kind="session", slot_date=self.day, slot_time="12:00",
                                           expires_at=timezone.now() + timedelta(minutes=20))
        stray = Order.objects.create(kind="course", status="awaiting_payment")
        Order.objects.filter(pk=stray.pk).update(created_at=timezone.now() - timedelta(hours=1))
        fresh = Order.objects.create(kind="course", status="awaiting_payment")
        paid = Order.objects.create(kind="course", status="paid")
        Order.objects.filter(pk=paid.pk).update(created_at=timezone.now() - timedelta(days=5))
        old = CheckoutAttempt.objects.create(ip_hash="x")
        CheckoutAttempt.objects.filter(pk=old.pk).update(at=timezone.now() - timedelta(days=2))
        CheckoutAttempt.objects.create(ip_hash="y")
        RateLimitHit.objects.create(bucket="b", key_hash="k")
        RateLimitHit.objects.update(at=timezone.now() - timedelta(days=2))
        Verification.objects.create(kind="email", target="a@example.com", expires_at=timezone.now() - timedelta(days=2))
        out = jobs.run_all()
        self.assertEqual(list(CheckoutHold.objects.values_list("pk", flat=True)), [live.pk])
        self.assertEqual(set(Order.objects.values_list("pk", flat=True)), {fresh.pk, paid.pk})
        self.assertEqual((CheckoutAttempt.objects.count(), RateLimitHit.objects.count(), Verification.objects.count()), (1, 0, 0))
        self.assertGreaterEqual(out["purged"], 2)

    def test_cron_endpoint_is_protected(self):
        self.assertEqual(self.call("/api/fn/cron", {}).status_code, 503)  # no secret configured
        with mock.patch.dict(os.environ, {"CRON_SECRET": "s3cret-value"}):
            self.assertEqual(self.call("/api/fn/cron", {}).status_code, 403)
            self.assertEqual(self.call("/api/fn/cron", {}, HTTP_X_CRON_SECRET="wrong").status_code, 403)
            r = self.call("/api/fn/cron", {}, HTTP_X_CRON_SECRET="s3cret-value")
            self.assertEqual(r.status_code, 200)
            self.assertEqual(set(r.json()), {"purged", "reminders", "gifts", "cleaned"})


class GoogleTests(Base):
    ENV = {"GOOGLE_CLIENT_ID": "cid", "GOOGLE_CLIENT_SECRET": "csec", "API_URL": "https://api.example.com"}

    def switch_on(self):
        s = SiteSettings.get()
        s.google_signin_enabled = True
        s.save()

    def state(self, redirect="http://localhost:5173/account"):
        with mock.patch.dict(os.environ, self.ENV):
            r = self.client.get("/api/auth/google/start", {"redirect_to": redirect})
        return r, parse_qs(urlparse(r["Location"]).query).get("state", [None])[0]

    def test_start_needs_the_switch_and_keys(self):
        with mock.patch.dict(os.environ, self.ENV):
            r = self.client.get("/api/auth/google/start")
        self.assertIn("#error=google_not_connected", r["Location"])
        self.switch_on()
        r, state = self.state()
        self.assertTrue(r["Location"].startswith("https://accounts.google.com/o/oauth2/v2/auth?"))
        q = parse_qs(urlparse(r["Location"]).query)
        self.assertEqual(q["redirect_uri"], ["https://api.example.com/api/auth/google/callback"])
        self.assertEqual(q["client_id"], ["cid"])

    def test_foreign_redirects_are_ignored(self):
        self.switch_on()
        r, state = self.state(redirect="https://evil.example/steal")
        self.assertEqual(jwt.decode(state, settings.JWT_SECRET, algorithms=["HS256"])["redirect"], f"{settings.SITE_URL}/account")

    def finish(self, info, ok=True):
        self.switch_on()
        _, state = self.state()
        tok = mock.Mock(ok=ok)
        tok.json.return_value = {"access_token": "g-access"}
        me = mock.Mock()
        me.json.return_value = info
        with mock.patch.dict(os.environ, self.ENV), mock.patch("main.google.requests.post", return_value=tok), \
                mock.patch("main.google.requests.get", return_value=me):
            return self.client.get("/api/auth/google/callback", {"code": "abc", "state": state})

    def test_new_and_existing_users_are_signed_in(self):
        r = self.finish({"email": "Fresh@Example.com", "email_verified": True, "name": "Fresh One"})
        frag = parse_qs(urlparse(r["Location"]).fragment)
        self.assertTrue(frag["access_token"][0])
        u = User.objects.get(email="fresh@example.com")
        self.assertIsNotNone(u.email_confirmed_at)
        self.assertFalse(u.has_usable_password())
        me = self.client.get("/api/auth/user", HTTP_AUTHORIZATION=f"Bearer {frag['access_token'][0]}")
        self.assertEqual(me.json()["user"]["email"], "fresh@example.com")
        r = self.finish({"email": "member@example.com", "email_verified": True})
        self.assertIn("access_token=", r["Location"])
        self.assertEqual(User.objects.filter(email="member@example.com").count(), 1)

    def test_unverified_google_email_is_refused(self):
        r = self.finish({"email": "member@example.com", "email_verified": False})
        self.assertIn("#error=google_unverified", r["Location"])
        self.assertNotIn("access_token", r["Location"])

    def test_bad_state_and_cancel(self):
        r = self.client.get("/api/auth/google/callback", {"code": "x", "state": "garbage"})
        self.assertIn("#error=invalid_state", r["Location"])
        self.switch_on()
        _, state = self.state()
        with mock.patch.dict(os.environ, self.ENV):
            r = self.client.get("/api/auth/google/callback", {"error": "access_denied", "state": state})
        self.assertIn("#error=google_cancelled", r["Location"])
