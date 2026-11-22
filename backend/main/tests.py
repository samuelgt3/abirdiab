import hashlib
import hmac
import json
import time
from datetime import timedelta
from unittest import mock

from django.test import Client, TestCase, override_settings
from django.utils import timezone

from .courses import verify_mux_signature
from .models import Appointment, BlogPost, GroupBooking, GroupSession, Series, User, VideoCourse
from .views import ZoomError

PW = "correct-horse-9"


def post_json(client, url, data):
    return client.post(url, json.dumps(data), content_type="application/json")


def future(days=2):
    return (timezone.now() + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%S")


class UserModelTests(TestCase):
    def test_create_user_with_email_keyword(self):
        u = User.objects.create_user(email="A@Example.com", password=PW, first_name="A", last_name="B")
        self.assertEqual(u.email, "a@example.com")
        self.assertTrue(u.check_password(PW))

    def test_duplicate_email_is_case_insensitive(self):
        User.objects.create_user(email="a@example.com", password=PW)
        with self.assertRaises(ValueError):
            User.objects.create_user(email="A@EXAMPLE.com", password=PW)

    def test_superuser_flags(self):
        u = User.objects.create_superuser(email="root@example.com", password=PW)
        self.assertTrue(u.is_staff and u.is_superuser)


class AuthTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="a@example.com", password=PW, first_name="A", last_name="B")
        self.client = Client()

    def test_login_ok_and_case_insensitive_email(self):
        r = post_json(self.client, "/api/login/", {"email": "A@Example.com", "password": PW})
        self.assertEqual(r.status_code, 200)

    def test_login_wrong_password(self):
        r = post_json(self.client, "/api/login/", {"email": "a@example.com", "password": "nope"})
        self.assertEqual(r.status_code, 401)

    def test_login_bad_json_is_400_not_500(self):
        r = self.client.post("/api/login/", "not json", content_type="application/json")
        self.assertEqual(r.status_code, 400)

    def test_login_requires_post(self):
        self.assertEqual(self.client.get("/api/login/").status_code, 405)

    def test_logout(self):
        self.client.force_login(self.user)
        self.assertEqual(self.client.post("/api/logout/").status_code, 200)
        self.assertNotIn("_auth_user_id", self.client.session)

    def test_csrf_cookie_endpoint(self):
        r = self.client.get("/api/csrf/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("csrftoken", r.cookies)


class BlogTests(TestCase):
    def test_list_blogposts(self):
        BlogPost.objects.create(titleEng="t", titleArb="ع", contentEng="c", contentArb="م")
        r = Client().get("/api/blogposts/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()[0]["titleEng"], "t")

    def test_create_requires_superuser(self):
        payload = {"titleEnglish": "t", "titleArabic": "ع", "contentEnglish": "c", "contentArabic": "م"}
        self.assertEqual(post_json(Client(), "/api/newblogpost/", payload).status_code, 401)
        normal = User.objects.create_user(email="n@example.com", password=PW)
        c = Client(); c.force_login(normal)
        self.assertEqual(post_json(c, "/api/newblogpost/", payload).status_code, 403)
        admin = User.objects.create_superuser(email="root@example.com", password=PW)
        c = Client(); c.force_login(admin)
        self.assertEqual(post_json(c, "/api/newblogpost/", payload).status_code, 201)
        self.assertEqual(post_json(c, "/api/newblogpost/", {"titleEnglish": "x"}).status_code, 400)


@mock.patch("main.views._create_zoom_meeting", return_value="https://zoom.example/j/1")
class AppointmentTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="a@example.com", password=PW, first_name="A", last_name="B")
        self.client = Client(); self.client.force_login(self.user)

    def test_requires_login(self, _zoom):
        r = post_json(Client(), "/api/appointments/", {"datetime": future(), "duration": 60})
        self.assertEqual(r.status_code, 401)

    def test_books_and_stores_aware_datetime(self, _zoom):
        r = post_json(self.client, "/api/appointments/", {"datetime": future(), "duration": 60})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["Zoom Link"], "https://zoom.example/j/1")
        self.assertTrue(timezone.is_aware(Appointment.objects.get().aptTime))

    def test_slot_cannot_be_double_booked(self, _zoom):
        when = future()
        post_json(self.client, "/api/appointments/", {"datetime": when, "duration": 60})
        other = User.objects.create_user(email="b@example.com", password=PW)
        c2 = Client(); c2.force_login(other)
        r = post_json(c2, "/api/appointments/", {"datetime": when, "duration": 60})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Appointment.objects.count(), 1)

    def test_validation(self, _zoom):
        for body in (
            {"datetime": future(), "duration": 999},
            {"datetime": future(), "duration": 0},
            {"datetime": future(), "duration": "abc"},
            {"datetime": "2020-01-01T10:00:00", "duration": 60},
            {"datetime": "garbage", "duration": 60},
        ):
            self.assertEqual(post_json(self.client, "/api/appointments/", body).status_code, 400, body)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_zoom_failure_creates_nothing(self, zoom):
        zoom.side_effect = ZoomError("zoom is not configured", status=503)
        r = post_json(self.client, "/api/appointments/", {"datetime": future(), "duration": 60})
        self.assertEqual(r.status_code, 503)
        self.assertEqual(Appointment.objects.count(), 0)


@mock.patch("main.views._create_zoom_meeting", return_value="https://zoom.example/j/2")
class GroupSessionTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email="root@example.com", password=PW)
        self.user = User.objects.create_user(email="a@example.com", password=PW)
        self.body = {"name": "Circle", "description": "d", "datetime": future(), "capacity": 2, "duration": 60}

    def test_create_requires_staff(self, _zoom):
        self.assertEqual(post_json(Client(), "/api/newgroupsession/", self.body).status_code, 401)
        c = Client(); c.force_login(self.user)
        self.assertEqual(post_json(c, "/api/newgroupsession/", self.body).status_code, 403)
        c = Client(); c.force_login(self.admin)
        self.assertEqual(post_json(c, "/api/newgroupsession/", self.body).status_code, 201)
        self.assertEqual(GroupSession.objects.get().seats_left, 2)

    def test_join_rules(self, _zoom):
        gs = GroupSession.objects.create(
            total_capacity=1, seats_left=1, description="d", time=timezone.now() + timedelta(days=1),
            name="g", zoom_link="https://zoom.example/j/3", duration=60,
        )
        url = f"/api/joingroup/{gs.id}/"
        self.assertEqual(Client().post(url).status_code, 401)
        self.assertEqual(Client().get(url).status_code, 405)

        c = Client(); c.force_login(self.user)
        r = c.post(url)
        self.assertEqual((r.status_code, r.json()["link"]), (200, "https://zoom.example/j/3"))
        self.assertEqual(c.post(url).status_code, 400)  # already booked

        other = User.objects.create_user(email="b@example.com", password=PW)
        c2 = Client(); c2.force_login(other)
        self.assertEqual(c2.post(url).status_code, 400)  # full
        gs.refresh_from_db()
        self.assertEqual(gs.seats_left, 0)
        self.assertEqual(GroupBooking.objects.count(), 1)
        self.assertEqual(c.post("/api/joingroup/99999/").status_code, 404)


class CoursesTests(TestCase):
    def test_catalogue_never_leaks_playback_ids(self):
        s = Series.objects.create(name="Course", price=10, downloadable=False)
        VideoCourse.objects.create(
            name="v", course=s, downloadable=False, playback_id="SECRET-PLAYBACK", manage_id="SECRET-MANAGE"
        )
        r = Client().get("/api/courses/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("SECRET", r.content.decode())
        self.assertEqual(r.json()[0]["videos"][0]["name"], "v")

    def test_upload_requires_staff(self):
        self.assertEqual(Client().post("/api/uploadvideo/", {"name": "x", "price": "1"}).status_code, 401)
        c = Client(); c.force_login(User.objects.create_user(email="n@example.com", password=PW))
        self.assertEqual(c.post("/api/uploadvideo/", {"name": "x", "price": "1"}).status_code, 403)


SECRET = "whsec_test"


def sign(body: bytes, ts=None, secret=SECRET):
    ts = str(ts if ts is not None else int(time.time()))
    return f"t={ts},v1=" + hmac.new(secret.encode(), ts.encode() + b"." + body, hashlib.sha256).hexdigest()


@mock.patch.dict("os.environ", {"MUX_WEBHOOK_SECRET": SECRET})
class MuxWebhookTests(TestCase):
    def setUp(self):
        s = Series.objects.create(name="C", price=1, downloadable=False)
        self.course = VideoCourse.objects.create(name="v", course=s, downloadable=False, upload_id="up1")
        self.ready = json.dumps({"type": "video.asset.ready", "data": {
            "id": "asset1", "upload_id": "up1", "playback_ids": [{"id": "pb1"}]}}).encode()

    def hit(self, body, header=None):
        headers = {"HTTP_MUX_SIGNATURE": header} if header is not None else {}
        return Client().post("/api/webhooks/mux", body, content_type="application/json", **headers)

    def test_forged_or_missing_signature_rejected(self):
        self.assertEqual(self.hit(self.ready).status_code, 400)
        self.assertEqual(self.hit(self.ready, sign(self.ready, secret="wrong")).status_code, 400)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, VideoCourse.Status.PROCESSING)

    def test_old_signature_rejected(self):
        self.assertEqual(self.hit(self.ready, sign(self.ready, ts=int(time.time()) - 3600)).status_code, 400)

    def test_valid_ready_event_marks_course_ready(self):
        self.assertEqual(self.hit(self.ready, sign(self.ready)).status_code, 200)
        self.course.refresh_from_db()
        self.assertEqual((self.course.status, self.course.playback_id, self.course.manage_id),
                         (VideoCourse.Status.READY, "pb1", "asset1"))

    def test_valid_errored_event_marks_failed(self):
        body = json.dumps({"type": "video.asset.errored", "data": {"upload_id": "up1"}}).encode()
        self.assertEqual(self.hit(body, sign(body)).status_code, 200)
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, VideoCourse.Status.FAILED)

    def test_get_not_allowed(self):
        self.assertEqual(Client().get("/api/webhooks/mux").status_code, 405)

    @mock.patch.dict("os.environ", {"MUX_WEBHOOK_SECRET": ""})
    def test_unconfigured_secret_is_503_not_open(self):
        self.assertEqual(self.hit(self.ready, sign(self.ready, secret="")).status_code, 503)

    def test_verify_helper_handles_garbage(self):
        for header in ("", "garbage", "t=abc,v1=zz", "t=1"):
            self.assertFalse(verify_mux_signature(b"{}", header, SECRET))
