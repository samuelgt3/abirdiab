import json
import shutil
import tempfile
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.test import TestCase, override_settings
from django.utils import timezone

from .models import (AdminAudit, AdminEmail, AvailabilitySlot, CheckoutHold, Course, CourseAccess, CourseFile,
                     NewsletterSubscriber, Order, OrderAdminNote, SiteSettings, User, Workshop, WorkshopLink)
from .tokens import make_token

PW = "Sunrise2026"


def make_user(email, admin=False):
    u = User.objects.create_user(email, PW)
    u.email_confirmed_at = timezone.now()
    u.save()
    if admin:
        AdminEmail.objects.create(email=email)
    return u


class Base(TestCase):
    def setUp(self):
        self.admin = make_user("boss@example.com", admin=True)
        self.member = make_user("member@example.com")

    def call(self, path, data=None, user=None, method="post", **extra):
        if user is not None:
            extra["HTTP_AUTHORIZATION"] = f"Bearer {make_token(user, 'access', 600)}"
        if method == "get":
            return self.client.get(path, **extra)
        return self.client.post(path, json.dumps(data or {}), content_type="application/json", **extra)

    def db(self, table, user=None, **body):
        return self.call(f"/api/db/{table}", body, user)

    def rpc(self, name, args=None, user=None):
        return self.call(f"/api/rpc/{name}", args or {}, user)


class TableApiTests(Base):
    def test_visitors_see_published_content_only(self):
        Course.objects.create(title="Shown", published=True)
        Course.objects.create(title="Draft", published=False)
        r = self.db("courses", select="*")
        self.assertEqual([c["title"] for c in r.json()["data"]], ["Shown"])
        # even if they ask for drafts explicitly
        r = self.db("courses", filters=[["eq", "published", False]])
        self.assertEqual(r.json()["data"], [])

    def test_private_tables_are_closed_to_visitors_and_customers(self):
        o = Order.objects.create(kind="course", email="member@example.com", user=self.member)
        OrderAdminNote.objects.create(order=o, notes="secret note")
        w = Workshop.objects.create(title="W", starts_at=timezone.now() + timedelta(days=3), published=True)
        WorkshopLink.objects.create(workshop=w, join_link="https://zoom.example/secret")
        for table in ("orders", "order_admin_notes", "workshop_links", "course_files", "site_settings",
                      "payment_events", "gifts", "admin_audit", "testimonial_submissions",
                      "newsletter_subscribers", "availability_slots"):
            for who in (None, self.member):
                r = self.db(table, who, select="*")
                self.assertEqual(r.status_code, 403, f"{table} readable by {who}")
        self.assertNotIn("secret", json.dumps(self.db("workshops").json()))

    def test_customers_cannot_write_anything(self):
        for who in (None, self.member):
            for op, extra in (("insert", {"values": {"title": "x"}}), ("update", {"values": {"title": "x"}, "filters": [["eq", "title", "a"]]}),
                              ("delete", {"filters": [["eq", "title", "a"]]})):
                self.assertEqual(self.db("courses", who, op=op, **extra).status_code, 403)

    def test_unconfirmed_admin_email_is_not_admin(self):
        u = User.objects.create_user("pending@example.com", PW)
        AdminEmail.objects.create(email="pending@example.com")
        self.assertEqual(self.db("site_settings", u, select="*").status_code, 403)

    def test_admin_crud_and_audit(self):
        r = self.db("courses", self.admin, op="insert", values={"title": "New", "price_usd": 12.5, "what_you_get": ["a"]},
                    returning="id", mode="single")
        cid = r.json()["data"]["id"]
        self.assertTrue(Course.objects.get(pk=cid).what_you_get == ["a"])
        r = self.db("courses", self.admin, op="update", values={"published": True}, filters=[["eq", "id", cid]])
        self.assertEqual(r.status_code, 200)
        self.assertTrue(Course.objects.get(pk=cid).published)
        r = self.db("courses", self.admin, op="delete", filters=[["eq", "id", cid]])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(Course.objects.count(), 0)
        ops = list(AdminAudit.objects.order_by("id").values_list("op", flat=True))
        self.assertEqual(ops, ["insert", "update", "delete"])
        self.assertEqual(AdminAudit.objects.filter(op="update").get().changes["published"], {"from": False, "to": True})

    def test_update_and_delete_need_a_filter(self):
        Course.objects.create(title="A")
        self.assertEqual(self.db("courses", self.admin, op="update", values={"title": "x"}).status_code, 400)
        self.assertEqual(self.db("courses", self.admin, op="delete").status_code, 400)
        self.assertEqual(Course.objects.get().title, "A")

    def test_unknown_columns_and_tables(self):
        self.assertEqual(self.db("courses", self.admin, op="insert", values={"nope": 1}).status_code, 400)
        self.assertEqual(self.db("auth_user", self.admin, select="*").status_code, 404)
        self.assertEqual(self.db("main_user", self.admin, select="*").status_code, 404)

    def test_order_edits_are_limited_to_safe_columns(self):
        o = Order.objects.create(kind="course", amount_usd=10)
        r = self.db("orders", self.admin, op="update", values={"amount_usd": 0}, filters=[["eq", "id", str(o.id)]])
        self.assertEqual(r.status_code, 403)
        r = self.db("orders", self.admin, op="update", values={"status": "confirmed", "join_url": "https://z.example/1"},
                    filters=[["eq", "id", str(o.id)]])
        self.assertEqual(r.status_code, 200)
        o.refresh_from_db()
        self.assertEqual((o.status, o.join_url), ("confirmed", "https://z.example/1"))
        self.assertEqual(self.db("orders", self.admin, op="delete", filters=[["eq", "id", str(o.id)]]).status_code, 403)

    def test_audit_and_payment_tables_are_read_only_even_for_admin(self):
        self.assertEqual(self.db("admin_audit", self.admin, op="delete", filters=[["gte", "id", 0]]).status_code, 403)
        self.assertEqual(self.db("payment_events", self.admin, op="insert", values={"transaction_id": 1}).status_code, 403)

    def test_newsletter_visitors_can_add_but_not_read(self):
        r = self.db("newsletter_subscribers", op="insert", values={"email": "Fan@Example.com", "lang": "ar"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(NewsletterSubscriber.objects.get().email, "fan@example.com")
        dup = self.db("newsletter_subscribers", op="insert", values={"email": "fan@example.com"})
        self.assertEqual((dup.status_code, dup.json()["code"]), (409, "23505"))  # the site treats 23505 as "already on the list"
        self.assertEqual(self.db("newsletter_subscribers", select="*").status_code, 403)
        sneaky = self.db("newsletter_subscribers", op="insert", values={"email": "b@example.com", "id": "3b0e6a39-0000-4000-8000-000000000000"})
        self.assertEqual(sneaky.status_code, 403)

    def test_slots_upsert_ignore_duplicates_and_count(self):
        rows = [{"slot_date": "2030-01-10", "slot_time": "10:00"}, {"slot_date": "2030-01-10", "slot_time": "11:00"}]
        kw = dict(op="upsert", values=rows, onConflict="slot_date,slot_time", ignoreDuplicates=True)
        self.assertEqual(self.db("availability_slots", self.admin, **kw).status_code, 200)
        self.assertEqual(self.db("availability_slots", self.admin, **kw).status_code, 200)
        self.assertEqual(AvailabilitySlot.objects.count(), 2)
        r = self.db("availability_slots", self.admin, select="id", count="exact", head=True,
                    filters=[["gte", "slot_date", "2030-01-01"]])
        self.assertEqual(r.json(), {"count": 2, "data": None})

    def test_notes_workshop_link_and_course_files_upserts(self):
        o = Order.objects.create(kind="course")
        self.db("order_admin_notes", self.admin, op="upsert", values={"order_id": str(o.id), "notes": "one"})
        self.db("order_admin_notes", self.admin, op="upsert", values={"order_id": str(o.id), "notes": "two"})
        self.assertEqual(OrderAdminNote.objects.get().notes, "two")
        w = Workshop.objects.create(title="W", starts_at=timezone.now())
        self.db("workshop_links", self.admin, op="upsert", values={"workshop_id": str(w.id), "join_link": "https://x.example"})
        r = self.db("workshop_links", self.admin, select="workshop_id,join_link", filters=[["eq", "workshop_id", str(w.id)]], mode="maybe")
        self.assertEqual(r.json()["data"], {"workshop_id": str(w.id), "join_link": "https://x.example"})
        c = Course.objects.create(title="C")
        r = self.db("course_files", self.admin, op="upsert", values={"course_id": str(c.id), "video_id": None, "file_path": "courses/a.pdf"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(CourseFile.objects.get().video_id, "")
        # the link itself is never copied into the audit trail
        self.assertNotIn("x.example", json.dumps(list(AdminAudit.objects.values_list("changes", flat=True))))

    def test_single_and_ordering(self):
        Course.objects.create(title="B", sort_order=2, published=True)
        Course.objects.create(title="A", sort_order=1, published=True)
        r = self.db("courses", select="title", order=[["sort_order", True]])
        self.assertEqual([x["title"] for x in r.json()["data"]], ["A", "B"])
        r = self.db("courses", select="title", mode="single")
        self.assertEqual(r.status_code, 406)


class SettingsRowTests(Base):
    def test_settings_row_exists_from_the_start_with_the_websites_defaults(self):
        s = SiteSettings.objects.get(id=1)  # created by the migration, not by a request
        self.assertEqual(s.booking_timezone, "Asia/Dubai")
        self.assertEqual(s.booking_weekdays, [0, 1, 2, 3, 4, 5, 6])
        self.assertEqual(s.booking_times, ["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"])
        self.assertFalse(s.payments_enabled)
        self.assertFalse(s.payment_test_mode)
        r = self.db("site_settings", self.admin, select="*", filters=[["eq", "id", 1]], mode="maybe")
        self.assertEqual(r.json()["data"]["booking_timezone"], "Asia/Dubai")


class RpcTests(Base):
    def test_public_settings_has_no_secrets(self):
        s = SiteSettings.get(); s.session_link_base = "https://meet.example/"; s.session_price_usd = 50; s.save()
        d = self.rpc("public_settings").json()["data"]
        self.assertEqual(d["session_price_usd"], 50)
        self.assertNotIn("session_link_base", d)
        self.assertNotIn("id", d)

    def test_is_admin(self):
        self.assertIs(self.rpc("is_admin").json()["data"], False)
        self.assertIs(self.rpc("is_admin", user=self.member).json()["data"], False)
        self.assertIs(self.rpc("is_admin", user=self.admin).json()["data"], True)

    def test_unknown_function(self):
        self.assertEqual(self.rpc("drop_everything").status_code, 501)

    def test_available_slots_rules(self):
        s = SiteSettings.get(); s.booking_timezone = "Africa/Cairo"; s.booking_days_ahead = 30; s.booking_weekdays = [0, 1, 2, 3, 4, 5, 6]; s.save()
        tz = ZoneInfo("Africa/Cairo")
        today = datetime.now(tz).date()
        d = today + timedelta(days=5)
        free, booked, held = (AvailabilitySlot.objects.create(slot_date=d, slot_time=t) for t in ("10:00", "11:00", "12:00"))
        AvailabilitySlot.objects.create(slot_date=today - timedelta(days=1), slot_time="10:00")        # past
        AvailabilitySlot.objects.create(slot_date=today + timedelta(days=90), slot_time="10:00")       # too far ahead
        Order.objects.create(kind="session", session_date=d, session_time="11:00", status="paid")
        CheckoutHold.objects.create(ref="AD-X", kind="session", slot_date=d, slot_time="12:00", expires_at=timezone.now() + timedelta(minutes=20))
        got = self.rpc("available_slots").json()["data"]
        self.assertEqual(got, [{"date": d.isoformat(), "time": "10:00"}])
        # an expired hold frees the time again
        CheckoutHold.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        times = [x["time"] for x in self.rpc("available_slots").json()["data"]]
        self.assertEqual(times, ["10:00", "12:00"])
        # weekday switched off (website numbering: Sunday = 0)
        s.booking_weekdays = [x for x in range(7) if x != d.isoweekday() % 7]; s.save()
        self.assertEqual(self.rpc("available_slots").json()["data"], [])

    def test_workshop_seats_never_show_exact_count(self):
        w = Workshop.objects.create(title="W", starts_at=timezone.now() + timedelta(days=9), spots=12, published=True)
        for _ in range(2):
            Order.objects.create(kind="workshop", item_id=w.id, status="paid")
        CheckoutHold.objects.create(ref="AD-H", kind="workshop", workshop=w, expires_at=timezone.now() + timedelta(minutes=5))
        d = self.rpc("workshop_seats").json()["data"][str(w.id)]
        self.assertEqual(d, {"shown": 2, "sold_out": False})  # 9 left -> ceil(9/5) = 2
        Order.objects.create(kind="workshop", item_id=w.id, status="paid")
        for _ in range(9):
            Order.objects.create(kind="workshop", item_id=w.id, status="confirmed")
        self.assertEqual(self.rpc("workshop_seats").json()["data"][str(w.id)], {"shown": 0, "sold_out": True})

    def test_story_needs_consent(self):
        p = {"name": "A", "email": "a@example.com", "service": "1:1", "story": "It helped me a lot.", "lang": "en"}
        self.assertIs(self.rpc("submit_story", {"p": {**p, "consent": False}}).json()["data"], False)
        self.assertIs(self.rpc("submit_story", {"p": {**p, "consent": True}}).json()["data"], True)
        self.assertEqual(self.rpc("submit_story", {"p": {**p, "consent": True, "email": "bad"}}).json()["data"], False)

    def test_course_access_free_paid_owner(self):
        free = Course.objects.create(title="F", is_free=True, published=True)
        paid = Course.objects.create(title="P", published=True)
        CourseFile.objects.create(course=free, video_id="vid-free")
        CourseFile.objects.create(course=paid, video_id="vid-paid", file_path="courses/p.pdf")
        self.assertEqual(self.rpc("course_access", {"p_id": str(free.id)}).json()["data"]["video_id"], "vid-free")
        for who in (None, self.member):
            self.assertIsNone(self.rpc("course_access", {"p_id": str(paid.id)}, who).json()["data"])
        self.assertIsNone(self.rpc("course_access", {"p_id": "not-a-uuid"}).json()["data"])
        CourseAccess.objects.create(user=self.member, course=paid)
        got = self.rpc("course_access", {"p_id": str(paid.id)}, self.member).json()["data"]
        self.assertEqual((got["video_id"], got["file_path"]), ("vid-paid", "courses/p.pdf"))
        self.assertIsNone(self.rpc("course_access", {"p_id": str(paid.id)}, self.admin.__class__.objects.create_user("other@example.com", PW)).json()["data"])

    @override_settings(BUNNY_TOKEN_KEY="k3y")
    def test_bunny_signed_link(self):
        c = Course.objects.create(title="P", published=True)
        CourseFile.objects.create(course=c, video_id="abc")
        CourseAccess.objects.create(user=self.member, course=c)
        d = self.rpc("course_access", {"p_id": str(c.id)}, self.member).json()["data"]
        import hashlib
        self.assertEqual(d["video_token"], hashlib.sha256(f"k3y" f"abc{d['video_expires']}".encode()).hexdigest())

    def test_progress_needs_ownership(self):
        c = Course.objects.create(title="P", published=True)
        r = self.rpc("set_lesson_done", {"p_course": str(c.id), "p_key": "l1", "p_done": True}, self.member)
        self.assertEqual(r.status_code, 400)
        CourseAccess.objects.create(user=self.member, course=c)
        self.rpc("set_lesson_done", {"p_course": str(c.id), "p_key": "l1", "p_done": True}, self.member)
        self.rpc("touch_course", {"p_course": str(c.id)}, self.member)
        d = self.rpc("my_progress", user=self.member).json()["data"]
        self.assertEqual([x["key"] for x in d["done"]], ["l1"])
        self.assertEqual(len(d["opened"]), 1)
        self.assertEqual(self.rpc("my_progress").status_code, 401)

    def test_newsletter_toggle(self):
        self.assertIs(self.rpc("newsletter_subscribed", user=self.member).json()["data"], False)
        self.rpc("set_newsletter", {"subscribe": True, "lang": "ar"}, self.member)
        self.assertIs(self.rpc("newsletter_subscribed", user=self.member).json()["data"], True)
        self.rpc("set_newsletter", {"subscribe": False}, self.member)
        self.assertEqual(NewsletterSubscriber.objects.count(), 0)


class FunctionTests(Base):
    def test_geo_uses_cdn_header(self):
        r = self.client.get("/api/fn/geo", HTTP_CF_IPCOUNTRY="eg")
        self.assertEqual(r.json(), {"country": "EG"})

    def test_setup_status_is_admin_only_and_hides_values(self):
        self.assertEqual(self.call("/api/fn/setup-status").status_code, 401)
        self.assertEqual(self.call("/api/fn/setup-status", user=self.member).status_code, 403)
        r = self.call("/api/fn/setup-status", user=self.admin)
        self.assertEqual(set(r.json()), {"email", "email_from", "reminders", "sms", "paymob", "site_url"})
        self.assertTrue(all(isinstance(v, bool) for v in r.json().values()))


class StorageTests(Base):
    def setUp(self):
        super().setUp()
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        o = override_settings(MEDIA_ROOT=f"{self.tmp}/media", PRIVATE_FILES_ROOT=f"{self.tmp}/private")
        o.enable(); self.addCleanup(o.disable)

    def up(self, bucket, path, content=b"data", user=None, name="f.png"):
        from django.core.files.uploadedfile import SimpleUploadedFile
        extra = {"HTTP_AUTHORIZATION": f"Bearer {make_token(user, 'access', 600)}"} if user else {}
        return self.client.post(f"/api/storage/{bucket}/upload", {"path": path, "file": SimpleUploadedFile(name, content)}, **extra)

    def test_only_admin_uploads_and_public_can_read_media(self):
        self.assertEqual(self.up("media", "images/1-a.png").status_code, 401)
        self.assertEqual(self.up("media", "images/1-a.png", user=self.member).status_code, 403)
        self.assertEqual(self.up("media", "images/1-a.png", user=self.admin).status_code, 200)
        r = self.client.get("/api/storage/v1/object/public/media/images/1-a.png")
        self.assertEqual((r.status_code, b"".join(r.streaming_content)), (200, b"data"))
        self.assertEqual(self.up("media", "images/1-a.png", user=self.admin).status_code, 409)  # no silent overwrite

    def test_dangerous_uploads_refused(self):
        for path in ("../evil.png", "a/../../evil.png", "/etc/passwd.png", "x\\y.png", "images/evil.svg", "images/evil.html", "images/.htaccess"):
            self.assertIn(self.up("media", path, user=self.admin).status_code, (400, 415), path)
        self.assertEqual(self.client.get("/api/storage/v1/object/public/media/../../etc/passwd").status_code, 404)
        # the private bucket is never served through the public address
        self.up("paid-files", "courses/1-p.pdf", user=self.admin, name="p.pdf")
        self.assertEqual(self.client.get("/api/storage/v1/object/public/media/courses/1-p.pdf").status_code, 404)

    def test_private_files_need_ownership_and_expire(self):
        c = Course.objects.create(title="P", published=True)
        CourseFile.objects.create(course=c, file_path="courses/1-p.pdf")
        self.up("paid-files", "courses/1-p.pdf", content=b"%PDF", user=self.admin, name="p.pdf")
        body = {"path": "courses/1-p.pdf"}
        for who in (None, self.member):
            self.assertEqual(self.call("/api/storage/paid-files/sign", body, who).status_code, 403)
        CourseAccess.objects.create(user=self.member, course=c)
        r = self.call("/api/storage/paid-files/sign", body, self.member)
        self.assertEqual(r.status_code, 200)
        url = r.json()["signedUrl"].replace("http://testserver", "")
        d = self.client.get(url)
        self.assertEqual((d.status_code, b"".join(d.streaming_content)), (200, b"%PDF"))
        self.assertEqual(self.client.get(url + "x").status_code, 403)  # tampered link
        self.assertEqual(self.client.get("/api/storage/v1/object/sign/paid-files/download?token=").status_code, 403)

    def test_remove(self):
        self.up("media", "images/1-a.png", user=self.admin)
        r = self.call("/api/storage/media/remove", {"paths": ["images/1-a.png", "images/none.png"]}, self.admin)
        self.assertEqual(r.json(), {"removed": 1})
        self.assertEqual(self.call("/api/storage/media/remove", {"paths": ["images/1-a.png"]}, self.member).status_code, 403)
