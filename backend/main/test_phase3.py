from datetime import timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from . import checkout
from .models import (AvailabilitySlot, CheckoutHold, Course, CourseAccess, CourseFile, Gift, Order, OrderAccessKey,
                     PaymentEvent, SiteSettings, User, Verification, Workshop, WorkshopLink)
from .test_phase2 import Base, make_user

KEY = "k" * 40


def person(**over):
    d = {"customer_name": "Sara Ali", "email": "sara@example.com", "phone": "501234567", "phone_dial": "+971",
         "phone_country": "AE", "country": "AE", "lang": "en", "delivery_method": "email"}
    d.update(over)
    return d


class Shop(Base):
    def setUp(self):
        super().setUp()
        self.s = SiteSettings.get()
        self.s.session_price_usd = 50
        self.s.payments_enabled = False
        self.s.save()
        tz = ZoneInfo(self.s.booking_timezone)
        self.day = (timezone.now().astimezone(tz) + timedelta(days=3)).date()
        self.s.booking_weekdays = list(range(7))
        self.s.save()
        for t in ("10:00", "12:00", "14:00"):
            AvailabilitySlot.objects.create(slot_date=self.day, slot_time=t)
        self.free = Course.objects.create(title="Free", is_free=True, published=True)
        self.paid = Course.objects.create(title="Paid", price_usd=20, published=True)
        self.ws = Workshop.objects.create(title="WS", starts_at=timezone.now() + timedelta(days=5), spots=2,
                                          price_usd=30, published=True)

    def msg(self, r):
        return r.json().get("message")

    def session(self, t="10:00", **over):
        return person(kind="session", sessions=[{"date": self.day.isoformat(), "time": t}], **over)


class CheckBookingTests(Shop):
    def test_good_and_bad_details(self):
        self.assertEqual(self.rpc("check_booking", {"p": self.session()}).json()["data"], {"ok": True})
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": self.session(customer_name="x")})), "invalid name")
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": self.session(email="nope")})), "invalid email")
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": self.session(phone="12")})), "invalid phone")
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": self.session(delivery_method="")})), "delivery required")
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": self.session(delivery_method="whatsapp", delivery_to="12")})), "invalid whatsapp")

    def test_time_rules(self):
        p = self.session(t="11:00")
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": p})), "time not available")
        p = person(kind="session", delivery_method="email", sessions=[{"date": "2020-01-01", "time": "10:00"}])
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": p})), "date not available")
        many = person(kind="session", delivery_method="email",
                      sessions=[{"date": self.day.isoformat(), "time": "10:00"}] * 6)
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": many})), "too many sessions")

    def test_session_price_must_be_set_and_courses_need_sign_in(self):
        self.s.session_price_usd = None
        self.s.save()
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": self.session()})), "session price not set")
        p = person(kind="course", item_id=str(self.free.id))
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": p})), "sign in required")
        self.assertEqual(self.rpc("check_booking", {"p": p}, self.member).status_code, 200)


class PlaceOrderTests(Shop):
    def test_priced_things_cannot_skip_payment(self):
        self.assertEqual(self.msg(self.rpc("place_order", {"p": self.session()})), "payments not open")
        self.s.payments_enabled = True
        self.s.save()
        self.assertEqual(self.msg(self.rpc("place_order", {"p": self.session()})), "payment required")
        self.assertEqual(Order.objects.count(), 0)

    def test_free_course_gives_access(self):
        r = self.rpc("place_order", {"p": person(kind="course", item_id=str(self.free.id))}, self.member)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["data"]["status"], "confirmed")
        self.assertTrue(CourseAccess.objects.filter(user=self.member, course=self.free).exists())

    def test_free_session_and_double_booking(self):
        self.s.session_price_usd = 0
        self.s.save()
        r = self.rpc("place_order", {"p": self.session()})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.msg(self.rpc("place_order", {"p": self.session()})), "slot taken")
        self.assertEqual(Order.objects.filter(kind="session").count(), 1)

    def test_verification_when_required(self):
        self.s.session_price_usd = 0
        self.s.require_email_verification = True
        self.s.save()
        self.assertEqual(self.msg(self.rpc("place_order", {"p": self.session()})), "verification required")
        v = Verification.objects.create(kind="email", target="sara@example.com",
                                        expires_at=timezone.now() + timedelta(minutes=5), verified_at=timezone.now())
        p = self.session(email_verification=str(v.id))
        self.assertEqual(self.rpc("place_order", {"p": p}).status_code, 200)
        # a code can only be used once
        p2 = self.session("12:00", email_verification=str(v.id))
        self.assertEqual(self.msg(self.rpc("place_order", {"p": p2})), "verification required")

    def test_client_cannot_set_payment_fields(self):
        self.s.session_price_usd = 0
        self.s.save()
        self.rpc("place_order", {"p": self.session(charge_amount_cents=1, paymob_transaction_id=5, amount_usd=0.01)})
        o = Order.objects.get()
        self.assertIsNone(o.charge_amount_cents)
        self.assertIsNone(o.paymob_transaction_id)


class PayFirstTests(Shop):
    def setUp(self):
        super().setUp()
        self.s.payments_enabled = True
        self.s.save()

    def begin(self, p, user=None, ip="h1"):
        return checkout.begin_checkout(p, user, ip)

    def test_holds_block_others_and_hold_no_personal_data(self):
        payload, cart = self.begin(self.session())
        self.assertEqual(payload["amount_usd"], "50.00")
        h = CheckoutHold.objects.get()
        self.assertFalse(any(hasattr(h, f) for f in ("email", "customer_name", "phone")))
        self.assertEqual(self.msg(self.rpc("check_booking", {"p": self.session()})), "slot taken")
        slots = self.rpc("available_slots").json()["data"]
        self.assertNotIn({"date": self.day.isoformat(), "time": "10:00"}, slots)
        h.expires_at = timezone.now() - timedelta(minutes=1)
        h.save()
        self.assertEqual(self.rpc("check_booking", {"p": self.session()}).status_code, 200)

    def test_prices_come_from_the_server(self):
        payload, _ = self.begin(self.session(display_amount="0.01", amount_usd=0.01))
        self.assertEqual(payload["unit_usd"], "50.00")
        payload, _ = self.begin(self.session("12:00") | {"sessions": [{"date": self.day.isoformat(), "time": "12:00"},
                                                                         {"date": self.day.isoformat(), "time": "14:00"}]})
        self.assertEqual(payload["amount_usd"], "100.00")

    def test_finalize_creates_all_orders_once(self):
        payload, _ = self.begin(self.session() | {"sessions": [{"date": self.day.isoformat(), "time": "10:00"},
                                                                 {"date": self.day.isoformat(), "time": "12:00"}]})
        r = checkout.finalize_paid_order(payload, 9001, True, False, 10000, "EGP", "77")
        self.assertEqual(r["outcome"], "paid")
        self.assertEqual(Order.objects.filter(status="paid").count(), 2)
        self.assertEqual(CheckoutHold.objects.count(), 0)
        again = checkout.finalize_paid_order(payload, 9001, True, False, 10000, "EGP", "77")
        self.assertEqual(again["outcome"], "duplicate")
        self.assertEqual(Order.objects.count(), 2)
        self.assertEqual(PaymentEvent.objects.count(), 1)

    def test_forged_payload_is_refused(self):
        payload, _ = self.begin(self.session())
        payload = dict(payload, unit_usd="0.01")
        r = checkout.finalize_paid_order(payload, 9002, True, False, 1, "EGP")
        self.assertEqual(r["outcome"], "unknown_order")
        self.assertEqual(Order.objects.count(), 0)

    def test_failed_payment_frees_the_hold_and_creates_nothing(self):
        payload, _ = self.begin(self.session())
        r = checkout.finalize_paid_order(payload, 9003, False, False, 10000, "EGP")
        self.assertEqual(r["outcome"], "ignored")
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(CheckoutHold.objects.count(), 0)

    def test_paid_but_taken_is_flagged_for_refund(self):
        payload, _ = self.begin(self.session())
        CheckoutHold.objects.all().delete()
        Order.objects.create(kind="session", session_date=self.day, session_time="10:00", status="paid")
        r = checkout.finalize_paid_order(payload, 9004, True, False, 10000, "EGP")
        self.assertEqual(r["outcome"], "needs_refund")
        self.assertEqual(Order.objects.count(), 1)  # nothing half-created
        self.assertEqual(PaymentEvent.objects.get().outcome, "needs_refund")

    def test_workshop_seats_count_holds(self):
        p = person(kind="workshop", item_id=str(self.ws.id), delivery_method="email")
        self.begin(p)
        self.begin(p)
        with self.assertRaises(Exception) as cm:
            self.begin(p)
        self.assertEqual(str(cm.exception), "sold out")

    def test_rate_limit_on_starting_payments(self):
        for _ in range(10):
            try:
                self.begin(self.session())
            except Exception:
                pass
        with self.assertRaises(Exception) as cm:
            self.begin(self.session("14:00"))
        self.assertEqual(str(cm.exception), "rate_limited")

    def test_paid_course_for_member(self):
        p = person(kind="course", item_id=str(self.paid.id))
        payload, _ = self.begin(p, self.member)
        checkout.finalize_paid_order(payload, 9005, True, False, 2000, "EGP")
        self.assertTrue(CourseAccess.objects.filter(user=self.member, course=self.paid).exists())


class BookingPageTests(Shop):
    def paid_session(self, hours_from_now, join="https://meet.example/abc"):
        starts = timezone.now() + timedelta(hours=hours_from_now)
        tz = ZoneInfo(self.s.booking_timezone)
        local = starts.astimezone(tz)
        return Order.objects.create(kind="session", item_title="1:1", status="paid", amount_usd=50, join_url=join,
                                    session_date=local.date(), session_time=local.strftime("%H:%M"),
                                    session_timezone=self.s.booking_timezone, email="sara@example.com")

    def page(self, ref, user=None, key=None):
        return self.rpc("booking_page", {"p_ref": ref, "p_key": key}, user).json()["data"]

    def test_session_link_with_reference_alone_until_six_hours_after(self):
        o = self.paid_session(5)
        self.assertEqual(self.page(o.ref)["join_url"], "https://meet.example/abc")
        o2 = self.paid_session(-7)
        d = self.page(o2.ref)
        self.assertIsNone(d["join_url"])
        self.assertFalse(d["released"])

    def test_workshop_link_needs_owner_and_the_two_hour_window(self):
        WorkshopLink.objects.create(workshop=self.ws, join_link="https://zoom.example/ws")
        o = Order.objects.create(kind="workshop", item_id=self.ws.id, item_title="WS", status="paid", user=self.member)
        self.assertFalse(self.page(o.ref, self.member)["released"])  # 5 days away
        self.ws.starts_at = timezone.now() + timedelta(hours=1)
        self.ws.save()
        self.assertEqual(self.page(o.ref, self.member)["join_url"], "https://zoom.example/ws")
        d = self.page(o.ref)  # stranger with only the reference
        self.assertTrue(d["released"])
        self.assertIsNone(d["join_url"])
        self.assertIsNone(self.page(o.ref, make_user("other@example.com"))["join_url"])

    def test_device_key_unlocks_the_workshop_link(self):
        WorkshopLink.objects.create(workshop=self.ws, join_link="https://zoom.example/ws")
        self.ws.starts_at = timezone.now() + timedelta(hours=1)
        self.ws.save()
        o = Order.objects.create(kind="workshop", item_id=self.ws.id, item_title="WS", status="paid")
        self.assertEqual(self.rpc("register_access", {"p_refs": [o.ref], "p_key": KEY}).json()["data"], 1)
        self.assertEqual(self.page(o.ref, key=KEY)["join_url"], "https://zoom.example/ws")
        self.assertIsNone(self.page(o.ref, key="z" * 40)["join_url"])
        self.assertEqual(OrderAccessKey.objects.get().key_hash, checkout.sha256_hex(KEY))

    def test_register_access_only_for_new_orders_without_a_key(self):
        old = Order.objects.create(kind="workshop", item_id=self.ws.id, status="paid")
        Order.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(hours=1))
        self.assertEqual(self.rpc("register_access", {"p_refs": [old.ref], "p_key": KEY}).json()["data"], 0)
        new = Order.objects.create(kind="workshop", item_id=self.ws.id, status="paid")
        self.assertEqual(self.rpc("register_access", {"p_refs": [new.ref], "p_key": KEY}).json()["data"], 1)
        # someone else cannot add a second key to it
        self.assertEqual(self.rpc("register_access", {"p_refs": [new.ref], "p_key": "q" * 40}).json()["data"], 0)
        self.assertEqual(self.msg(self.rpc("register_access", {"p_refs": [new.ref], "p_key": "short"})), "invalid access key")

    def test_unknown_or_cancelled_gives_nothing_and_status_is_minimal(self):
        self.assertIsNone(self.page("AD-NOPE"))
        o = self.paid_session(5)
        st = self.rpc("order_status", {"p_ref": o.ref.lower()}).json()["data"]
        self.assertEqual(set(st), {"ref", "status", "item_title", "kind", "charge_amount_cents", "charge_currency"})
        o.status = "cancelled"
        o.save()
        self.assertIsNone(self.page(o.ref))


class MemberTests(Shop):
    def test_my_things_are_private(self):
        mine = Order.objects.create(kind="session", status="paid", user=self.member, customer_name="Mona",
                                    session_date=self.day, session_time="10:00", session_timezone="Asia/Dubai")
        Order.objects.create(kind="session", status="paid", user=self.admin, session_date=self.day, session_time="12:00")
        refs = [o["ref"] for o in self.rpc("my_orders", user=self.member).json()["data"]]
        self.assertEqual(refs, [mine.ref])
        self.assertEqual(self.rpc("my_display_name", user=self.member).json()["data"], "Mona")
        self.assertEqual(self.rpc("my_orders").status_code, 401)

    def test_library_includes_signed_video_and_file(self):
        CourseFile.objects.create(course=self.paid, file_path="f.pdf", video_id="vid1")
        CourseAccess.objects.create(user=self.member, course=self.paid)
        lib = self.rpc("my_library", user=self.member).json()["data"]
        self.assertEqual(len(lib), 1)
        self.assertEqual(lib[0]["file_path"], "f.pdf")
        self.assertEqual(lib[0]["video_id"], "vid1")
        self.assertEqual(self.rpc("my_library", user=self.admin).json()["data"], [])

    def test_claim_by_confirmed_email_and_by_key(self):
        o1 = Order.objects.create(kind="course", item_id=self.paid.id, status="paid", email="MEMBER@example.com")
        o2 = Order.objects.create(kind="workshop", item_id=self.ws.id, status="paid", email="typo@example.com")
        self.rpc("register_access", {"p_refs": [o2.ref], "p_key": KEY})
        self.assertEqual(self.rpc("claim_my_orders", user=self.member).json()["data"], 1)
        o1.refresh_from_db()
        self.assertEqual(o1.user_id, self.member.pk)
        self.assertTrue(CourseAccess.objects.filter(user=self.member, course=self.paid).exists())
        self.assertEqual(self.rpc("claim_with_keys", {"p_pairs": [{"ref": o2.ref, "key": "bad" * 15}]}, self.member).json()["data"], 0)
        self.assertEqual(self.rpc("claim_with_keys", {"p_pairs": [{"ref": o2.ref, "key": KEY}]}, self.member).json()["data"], 1)

    def test_unconfirmed_email_claims_nothing(self):
        u = User.objects.create_user("new@example.com", "Sunrise2026")
        Order.objects.create(kind="workshop", item_id=self.ws.id, status="paid", email="new@example.com")
        self.assertEqual(self.rpc("claim_my_orders", user=u).json()["data"], 0)

    def test_email_has_account(self):
        self.assertTrue(self.rpc("email_has_account", {"p_email": "MEMBER@example.com"}).json()["data"])
        self.assertFalse(self.rpc("email_has_account", {"p_email": "nobody@example.com"}).json()["data"])


class GiftTests(Shop):
    def make_gift(self, status="paid"):
        o = Order.objects.create(kind="gift", item_id=self.paid.id, status=status, user=self.admin, customer_name="Dina")
        return Gift.objects.create(order=o, course=self.paid, sender_name="Dina", message="enjoy")

    def test_gift_page_and_claim_once(self):
        g = self.make_gift()
        info = self.rpc("gift_info", {"p_token": g.token}).json()["data"]
        self.assertEqual((info["status"], info["sender_name"], info["course"]["title"]), ("ready", "Dina", "Paid"))
        self.assertIsNone(self.rpc("gift_info", {"p_token": "nope"}).json()["data"])
        self.assertEqual(self.rpc("redeem_gift", {"p_token": g.token}).status_code, 401)
        r = self.rpc("redeem_gift", {"p_token": g.token}, self.member)
        self.assertEqual(r.json()["data"], {"title": "Paid"})
        self.assertTrue(CourseAccess.objects.filter(user=self.member, course=self.paid, source="gift").exists())
        again = self.rpc("redeem_gift", {"p_token": g.token}, make_user("late@example.com"))
        self.assertEqual(self.msg(again), "gift already claimed")
        self.assertEqual(self.rpc("gift_info", {"p_token": g.token}).json()["data"]["status"], "redeemed")

    def test_unpaid_gift_cannot_be_claimed(self):
        g = self.make_gift("awaiting_payment")
        self.assertEqual(self.msg(self.rpc("redeem_gift", {"p_token": g.token}, self.member)), "gift not paid")

    def test_my_gifts_lists_what_i_sent(self):
        g = self.make_gift()
        rows = self.rpc("my_gifts", user=self.admin).json()["data"]
        self.assertEqual([r["token"] for r in rows], [g.token])
        self.assertEqual(self.rpc("my_gifts", user=self.member).json()["data"], [])

    def test_buying_a_gift_after_payment(self):
        self.s.payments_enabled = True
        self.s.save()
        p = person(kind="gift", gift_mode="card", item_id=str(self.paid.id))
        payload, _ = checkout.begin_checkout(p, self.admin, "ipx")
        self.assertEqual(checkout.finalize_paid_order(payload, 9100, True, False, 2000, "EGP")["outcome"], "paid")
        self.assertEqual(Gift.objects.count(), 1)
        direct = person(kind="gift", gift_mode="direct", item_id=str(self.paid.id), gift_to_name="Lina",
                        gift_to_email="lina@example.com", gift_message="hi")
        payload, _ = checkout.begin_checkout(direct, self.admin, "ipx")
        checkout.finalize_paid_order(payload, 9101, True, False, 2000, "EGP")
        g = Gift.objects.get(mode="direct")
        self.assertEqual((g.recipient_email, g.recipient_name, g.message), ("lina@example.com", "Lina", "hi"))
