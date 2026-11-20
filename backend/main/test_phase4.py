import hashlib
import json
import os
from decimal import Decimal
from unittest import mock

from django.core import mail
from django.test import override_settings
from django.utils import timezone

from . import checkout, emails, fulfil, mailer, paymob
from .models import CheckoutHold, Order, PaymentEvent, PendingCheckout, SiteSettings
from .test_phase2 import make_user
from .test_phase3 import Shop, person

SAMPLE = {
    "amount_cents": 100, "created_at": "2020-03-25T18:39:44.719228", "currency": "EGP", "error_occured": False,
    "has_parent_transaction": False, "id": 2556706, "integration_id": 6741, "is_3d_secure": True, "is_auth": False,
    "is_capture": False, "is_refunded": False, "is_standalone_payment": True, "is_voided": False, "order": {"id": 4778239},
    "owner": 4705, "pending": False, "source_data": {"pan": "2346", "sub_type": "MasterCard", "type": "card"}, "success": True,
}
KEYS = {"PAYMOB_SECRET_KEY": "sk", "PAYMOB_PUBLIC_KEY": "pk", "PAYMOB_HMAC_SECRET": "hm", "PAYMOB_INTEGRATION_IDS": "123"}


class PaymobHelpers(Shop):
    def test_hmac_string_matches_documented_example(self):
        self.assertEqual(paymob.hmac_string(SAMPLE),
                         "1002020-03-25T18:39:44.719228EGPfalsefalse25567066741truefalsefalsefalsetruefalse47782394705false2346MasterCardcardtrue")

    def test_verify_hmac(self):
        good = paymob.hmac_sha512_hex("secret", paymob.hmac_string(SAMPLE))
        self.assertEqual(len(good), 128)
        self.assertTrue(paymob.verify_hmac(SAMPLE, good, "secret"))
        self.assertTrue(paymob.verify_hmac(SAMPLE, good.upper(), "secret"))
        self.assertFalse(paymob.verify_hmac(dict(SAMPLE, amount_cents=1), good, "secret"))
        self.assertFalse(paymob.verify_hmac(SAMPLE, good, "wrong"))
        self.assertFalse(paymob.verify_hmac(SAMPLE, None, "secret"))
        self.assertFalse(paymob.verify_hmac(SAMPLE, "", "secret"))
        wallet = dict(SAMPLE, source_data={"pan": None, "sub_type": "wallet", "type": "wallet"})
        for nul in ("", "null"):
            self.assertTrue(paymob.verify_hmac(wallet, paymob.hmac_sha512_hex("k", paymob.hmac_string(wallet, nul)), "k"))

    def test_helpers(self):
        self.assertEqual(paymob.ref_from("AD-1A2B3C4D5-lx3k2"), "AD-1A2B3C4D5")
        self.assertEqual(paymob.ref_from("ad-3c5e15"), "AD-3C5E15")
        self.assertIsNone(paymob.ref_from("something-else"))
        self.assertIsNone(paymob.ref_from(None))
        self.assertEqual(paymob.charge_cents(69, "USD", 1), 6900)
        self.assertEqual(paymob.charge_cents(9.99, "USD", 1), 999)
        self.assertEqual(paymob.charge_cents(69, "EGP", 53.437041), 368800)
        self.assertEqual(paymob.charge_cents(10, "EGP", 50), 50000)
        self.assertEqual(paymob.charge_cents(0, "EGP", 50), 0)
        with self.assertRaises(ValueError):
            paymob.charge_cents(10, "EGP", 0)
        self.assertEqual(paymob.split_name("Rana Mostafa Ali"), {"first": "Rana", "last": "Mostafa Ali"})
        self.assertEqual(paymob.split_name("Rana"), {"first": "Rana", "last": "Rana"})


class TestModePayments(Shop):
    def setUp(self):
        super().setUp()
        self.s.payments_enabled = True
        self.s.payment_test_mode = True
        self.s.emails_enabled = True
        self.s.save()

    def fnc(self, name, data, user=None, **extra):
        return self.call(f"/api/fn/{name}", data, user, **extra)

    def start(self, **over):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("PAYMOB_SECRET_KEY", None)
            return self.fnc("paymob-checkout", self.session(**over))

    def test_pretend_payment_books_for_real_once(self):
        r = self.start()
        self.assertEqual(r.status_code, 200, r.content)
        d = r.json()
        self.assertTrue(d["testMode"])
        self.assertEqual((d["clientSecret"], d["publicKey"]), ("test", "test"))
        self.assertEqual(d["amount_usd"], 50.0)
        self.assertEqual(len(d["refs"]), 1)
        self.assertEqual(Order.objects.count(), 0)  # nothing booked before payment
        t = self.fnc("test-payment", {"p": d["p"], "sig": d["sig"]})
        self.assertEqual(t.json(), {"outcome": "paid"})
        o = Order.objects.get()
        self.assertEqual((o.ref, o.status), (d["refs"][0], "paid"))
        self.assertEqual(self.fnc("test-payment", {"p": d["p"], "sig": d["sig"]}).json(), {"outcome": "duplicate"})
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(self.rpc("order_status", {"p_ref": o.ref}).json()["data"]["status"], "paid")
        self.assertEqual(len(mail.outbox), 1)  # the thank-you email went out at payment time
        self.assertEqual(self.fnc("booking-email", {"ref": o.ref}).json(), {"sent": False, "reason": "already_sent"})

    def test_edited_payment_is_refused(self):
        d = self.start().json()
        p = json.loads(d["p"])
        p["unit_usd"] = "0.01"
        r = self.fnc("test-payment", {"p": json.dumps(p, sort_keys=True), "sig": d["sig"]})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_pretend_payment_is_impossible_with_a_real_key_or_when_off(self):
        d = self.start().json()
        with mock.patch.dict(os.environ, KEYS):
            self.assertEqual(self.fnc("test-payment", {"p": d["p"], "sig": d["sig"]}).status_code, 403)
        self.s.payment_test_mode = False
        self.s.save()
        self.assertEqual(self.fnc("test-payment", {"p": d["p"], "sig": d["sig"]}).status_code, 403)
        self.assertEqual(Order.objects.count(), 0)

    def test_checkout_rules(self):
        self.assertEqual(self.start(phone="").json()["error"], "phone required")
        self.s.payment_test_mode = False
        self.s.save()
        r = self.fnc("paymob-checkout", self.session())
        self.assertEqual((r.status_code, r.json()["error"]), (503, "not_configured"))
        self.s.payments_enabled = False
        self.s.save()
        self.assertEqual(self.fnc("paymob-checkout", self.session()).json()["error"], "payments not open")
        self.assertEqual(CheckoutHold.objects.count(), 0)


class RealModeTests(Shop):
    def setUp(self):
        super().setUp()
        self.s.payments_enabled = True
        self.s.payment_currency = "EGP"
        self.s.emails_enabled = True
        self.s.save()
        self.env = mock.patch.dict(os.environ, dict(KEYS, API_URL="https://api.example.com"))
        self.env.start()
        self.addCleanup(self.env.stop)

    def checkout(self, **over):
        fake = mock.Mock(ok=True)
        fake.json.return_value = {"client_secret": "cs_123", "id": 555}
        with mock.patch("main.paymob.fx_rate", return_value=Decimal("50")), \
                mock.patch("main.paymob.requests.post", return_value=fake) as post:
            r = self.call("/api/fn/paymob-checkout", self.session(**over))
        return r, post

    def webhook(self, obj, secret="hm", sign=True):
        q = paymob.hmac_sha512_hex(secret, paymob.hmac_string(obj)) if sign else "bad"
        return self.client.post(f"/api/fn/paymob-webhook?hmac={q}", json.dumps({"type": "TRANSACTION", "obj": obj}),
                                content_type="application/json")

    def txn(self, ref, cents=250000, **over):
        o = dict(SAMPLE, id=777001, amount_cents=cents, currency="EGP", success=True,
                 order={"id": 99, "merchant_order_id": f"{ref}-abc123"})
        o.update(over)
        return o

    def test_checkout_prices_in_charge_currency_and_calls_paymob(self):
        r, post = self.checkout()
        self.assertEqual(r.status_code, 200, r.content)
        d = r.json()
        self.assertEqual((d["amount_cents"], d["currency"], d["clientSecret"], d["publicKey"]), (250000, "EGP", "cs_123", "pk"))
        self.assertTrue(d["url"].startswith("https://accept.paymob.com/"))
        sent = post.call_args.kwargs["json"]
        self.assertEqual((sent["amount"], sent["currency"], sent["payment_methods"]), (250000, "EGP", [123]))
        self.assertEqual(sent["notification_url"], "https://api.example.com/api/fn/paymob-webhook")
        self.assertTrue(sent["special_reference"].startswith(d["refs"][0]))
        self.assertEqual(post.call_args.kwargs["headers"]["Authorization"], "Token sk")
        self.assertTrue(PendingCheckout.objects.filter(pk=d["refs"][0]).exists())
        self.assertEqual(CheckoutHold.objects.count(), 1)
        self.assertEqual(Order.objects.count(), 0)

    def test_paymob_down_frees_the_hold(self):
        bad = mock.Mock(ok=False)
        bad.json.return_value = {}
        with mock.patch("main.paymob.fx_rate", return_value=Decimal("50")), mock.patch("main.paymob.requests.post", return_value=bad):
            r = self.call("/api/fn/paymob-checkout", self.session())
        self.assertEqual(r.json()["error"], "payment_unavailable")
        self.assertEqual((CheckoutHold.objects.count(), PendingCheckout.objects.count()), (0, 0))

    def test_signed_webhook_creates_the_order_and_emails(self):
        ref = self.checkout()[0].json()["refs"][0]
        r = self.webhook(self.txn(ref))
        self.assertEqual(r.json(), {"received": True, "outcome": "paid"})
        o = Order.objects.get()
        self.assertEqual((o.ref, o.status, o.charge_amount_cents, o.charge_currency), (ref, "paid", 250000, "EGP"))
        self.assertEqual(o.paymob_transaction_id, 777001)
        self.assertEqual(CheckoutHold.objects.count(), 0)
        self.assertEqual(PendingCheckout.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.webhook(self.txn(ref)).json()["outcome"], "duplicate")  # Paymob retries are harmless
        self.assertEqual(Order.objects.count(), 1)

    def test_bad_signature_is_rejected(self):
        ref = self.checkout()[0].json()["refs"][0]
        self.assertEqual(self.webhook(self.txn(ref), sign=False).status_code, 401)
        self.assertEqual(self.webhook(self.txn(ref), secret="other").status_code, 401)
        self.assertEqual(Order.objects.count(), 0)

    def test_wrong_amount_creates_no_order(self):
        ref = self.checkout()[0].json()["refs"][0]
        r = self.webhook(self.txn(ref, cents=100))
        self.assertEqual(r.json()["outcome"], "wrong_amount")
        self.assertEqual(Order.objects.count(), 0)
        self.assertIn("250000", PaymentEvent.objects.get().note)

    def test_unknown_payment_is_recorded_not_booked(self):
        r = self.webhook(self.txn("AD-ZZZZZZZZZ"))
        self.assertEqual(r.json()["outcome"], "unknown_order")
        self.assertEqual((Order.objects.count(), PaymentEvent.objects.get().outcome), (0, "unknown_order"))

    def test_failed_attempt_then_successful_retry(self):
        ref = self.checkout()[0].json()["refs"][0]
        self.assertEqual(self.webhook(self.txn(ref, id=1, success=False)).json()["outcome"], "ignored")
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(self.webhook(self.txn(ref, id=2)).json()["outcome"], "paid")

    def test_refunded_callback_books_nothing(self):
        ref = self.checkout()[0].json()["refs"][0]
        self.assertEqual(self.webhook(self.txn(ref, is_refunded=True)).json()["outcome"], "ignored")
        self.assertEqual(Order.objects.count(), 0)

    def test_taken_meanwhile_needs_refund(self):
        ref = self.checkout()[0].json()["refs"][0]
        CheckoutHold.objects.all().delete()
        Order.objects.create(kind="session", session_date=self.day, session_time="10:00", status="paid")
        self.assertEqual(self.webhook(self.txn(ref)).json()["outcome"], "needs_refund")
        self.assertEqual(Order.objects.count(), 1)


class ZoomAndEmailTests(Shop):
    def setUp(self):
        super().setUp()
        self.s.emails_enabled = True
        self.s.save()

    def paid_session(self, **kw):
        return Order.objects.create(kind="session", item_title="1:1 session", status="paid", customer_name="Layla Hassan",
                                    email="l@example.com", session_date=self.day, session_time="10:00",
                                    session_timezone="Asia/Dubai", **kw)

    def test_zoom_link_is_made_and_failure_never_blocks(self):
        o = self.paid_session()
        with mock.patch("main.zoom.configured", return_value=True), \
                mock.patch("main.zoom.create_meeting", return_value=("https://zoom.us/j/1", "https://zoom.us/s/1")):
            fulfil.after_paid([o.ref])
        o.refresh_from_db()
        self.assertEqual((o.join_url, o.host_url), ("https://zoom.us/j/1", "https://zoom.us/s/1"))
        self.assertIn("https://zoom.us/j/1", mail.outbox[0].body)
        o2 = Order.objects.create(kind="session", status="paid", email="a@example.com", session_date=self.day,
                                  session_time="12:00", session_timezone="Asia/Dubai")
        with mock.patch("main.zoom.configured", return_value=True), mock.patch("main.zoom.create_meeting", side_effect=RuntimeError("boom")):
            fulfil.after_paid([o2.ref])
        o2.refresh_from_db()
        self.assertEqual(o2.status, "paid")
        self.assertIn("Zoom", o2.link_error)

    def test_email_sent_once_and_respects_the_switch(self):
        o = self.paid_session()
        self.assertEqual(fulfil.send_confirmation(o), "sent")
        self.assertEqual(fulfil.send_confirmation(o), "already_sent")
        self.assertEqual(len(mail.outbox), 1)
        self.s.emails_enabled = False
        self.s.save()
        o2 = Order.objects.create(kind="course", status="paid", email="b@example.com")
        self.assertEqual(fulfil.send_confirmation(o2), "emails_off")
        self.assertEqual(fulfil.send_confirmation(Order.objects.create(kind="course", status="awaiting_payment", email="c@example.com")), "not_paid")

    def test_failed_send_can_be_retried(self):
        o = self.paid_session()
        with mock.patch("main.mailer.send_email", side_effect=RuntimeError("down")):
            self.assertEqual(fulfil.send_confirmation(o), "failed")
        o.refresh_from_db()
        self.assertIsNone(o.thanks_sent_at)
        self.assertEqual(fulfil.send_confirmation(o), "sent")

    def test_booking_email_function_is_safe_for_strangers(self):
        r = self.call("/api/fn/booking-email", {"ref": "AD-NOPE"})
        self.assertEqual(r.json(), {"sent": False, "reason": "not_found"})
        o = self.paid_session()
        self.assertEqual(self.call("/api/fn/booking-email", {"ref": o.ref.lower()}).json(), {"sent": True})
        self.assertEqual(mail.outbox[0].to, ["l@example.com"])  # always to the order's own address

    def test_wording_english(self):
        o = self.paid_session(join_url="https://zoom.us/j/9")
        m = emails.booking_email(o, "https://www.abirdiab.com/")
        self.assertIn(o.ref, m["subject"])
        self.assertIn("Hi Layla,", m["html"])
        self.assertIn("10:00 (Asia/Dubai)", m["html"])
        self.assertIn("https://zoom.us/j/9", m["text"])
        self.assertIn("https://www.abirdiab.com/account?tab=sessions", m["html"])
        o.join_url = "javascript:alert(1)"
        self.assertNotIn("javascript:", emails.booking_email(o, "https://x.com")["html"])
        o.status, o.join_url = "awaiting_payment", ""
        self.assertIn("confirmed as soon as your payment is received", emails.booking_email(o, "https://x.com")["html"])

    def test_wording_arabic_and_escaping(self):
        o = self.paid_session(lang="ar")
        m = emails.booking_email(o, "https://x.com")
        self.assertIn('dir="rtl"', m["html"])
        self.assertIn("شكرًا", m["html"])
        o.customer_name = "<script>alert(1)</script>"
        self.assertNotIn("<script>", emails.booking_email(o, "https://x.com")["html"])

    def test_purchase_kinds(self):
        base = dict(ref="AD-1A2B3C4D5", customer_name="Mona Ali", email="mona@example.com", status="paid", item_title="Miraculous Monday")
        ws = Order(kind="workshop", delivery_method="email", **base)
        m = emails.booking_email(ws, "https://x.com", timezone.now())
        self.assertEqual(m["subject"], "Your booking: Miraculous Monday (AD-1A2B3C4D5)")
        self.assertIn("2 hours before", m["html"])
        self.assertIn("/account?tab=workshops", m["html"])
        c = emails.booking_email(Order(kind="course", **base), "https://x.com")
        self.assertEqual(c["subject"], "Your order: Miraculous Monday (AD-1A2B3C4D5)")
        self.assertIn("/account?tab=learning", c["html"])
        self.assertIn("using mona@example.com", c["html"])
        g = emails.booking_email(Order(kind="gift", **base), "https://x.com")
        self.assertIn("/account?tab=gifts", g["html"])
        d = emails.booking_email(Order(kind="gift", gift_to_name="Sara", gift_to_email="s@example.com", **base), "https://x.com")
        self.assertIn("We are emailing Sara their gift", d["html"])
        self.assertIn("رحلة التعلم", emails.booking_email(Order(kind="course", lang="ar", **base), "https://x.com")["html"])

    def test_join_and_gift_emails(self):
        o = self.paid_session()
        m = emails.join_email(o, "https://zoom.us/j/123", "https://x.com")
        self.assertIn("https://zoom.us/j/123", m["html"])
        self.assertNotIn("http://", emails.join_email(o, "http://evil.example", "https://x.com")["html"])
        from .models import Gift
        o2 = Order.objects.create(kind="gift", status="paid")
        g = Gift(token="abc123", order=o2, sender_name="Sara", recipient_name="Layla Hassan", message="Enjoy <3", lang="en")
        gm = emails.gift_email(g, "Intro to Reiki", "https://www.abirdiab.com/")
        self.assertIn("Sara", gm["subject"])
        self.assertIn("https://www.abirdiab.com/gift/abc123", gm["html"])
        self.assertIn("Enjoy &lt;3", gm["html"])

    def test_resend_is_used_when_a_key_exists(self):
        fake = mock.Mock(ok=True, status_code=200)
        with mock.patch.dict(os.environ, {"RESEND_API_KEY": "re_123"}), mock.patch("main.mailer.requests.post", return_value=fake) as post:
            mailer.send_email("x@example.com", "Hi", "text", "<p>html</p>")
        self.assertEqual(post.call_args.args[0], "https://api.resend.com/emails")
        self.assertEqual(post.call_args.kwargs["headers"]["Authorization"], "Bearer re_123")
        self.assertEqual(post.call_args.kwargs["json"]["to"], ["x@example.com"])
        self.assertEqual(len(mail.outbox), 0)
        fake.ok, fake.status_code = False, 403
        with mock.patch.dict(os.environ, {"RESEND_API_KEY": "re_123"}), mock.patch("main.mailer.requests.post", return_value=fake):
            with self.assertRaises(RuntimeError):
                mailer.send_email("x@example.com", "Hi", "text")

    def test_free_order_gets_link_and_email_straight_away(self):
        self.s.session_price_usd = 0
        self.s.save()
        r = self.rpc("place_order", {"p": self.session()})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(len(mail.outbox), 1)
