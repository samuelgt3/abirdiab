from django.http import JsonResponse
from django.shortcuts import redirect, get_object_or_404
from zoneinfo import ZoneInfo
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Appointment, GroupSession, GroupBooking, BlogPost, Testimonial, Series, VideoCourse, AudioCourse, DocumentCourse
from datetime import datetime
import requests
import os
from dotenv import load_dotenv
from django.db import transaction
from django.contrib.auth import authenticate, login, logout
from .courses import createUploadUrl, mux_webhook
import json
import time
import base64

load_dotenv()

_cached_token = None
_token_expires_at = 0

def login_view(request):

    data = json.loads(request.body)
    email = data.get("email")
    password = data.get("password")

    user = authenticate(request, username=email, password=password) 
    
    if user is not None:

        login(request, user)  
        return JsonResponse({"status": "ok"})
    
    return JsonResponse({"error": "Invalid credentials"}, status=401)


def logout_view(request):

    logout(request) 

    return JsonResponse({"status": "ok"})


def _parse_and_validate(time_str, duration):
    try:
        appt_time = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S")

    except (TypeError, ValueError):
        return None, JsonResponse({"error": "invalid time"}, status=400)
    
    CAIRO = ZoneInfo("Africa/Cairo")
    session_time = timezone.make_aware(appt_time, CAIRO)

    if session_time < timezone.now():
        return None, JsonResponse({"error": "invalid time"}, status=400)

    if duration <= 0 or duration > 180:
        return None, JsonResponse({"error": "meeting duration out of the 0 - 3 hours range"}, status=400)

    return appt_time, None


def get_zoom_access_token():

        global _cached_token, _token_expires_at

        if _cached_token and time.time() < _token_expires_at:
            return _cached_token

        account_id = os.environ["ZOOM_ACCOUNT_ID"]
        client_id = os.environ["ZOOM_CLIENT_ID"]
        client_secret = os.environ["ZOOM_CLIENT_SECRET"]

        credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

        response = requests.post(
            "https://zoom.us/oauth/token",
            params={"grant_type": "account_credentials", "account_id": account_id},
            headers={"Authorization": f"Basic {credentials}"},
        )
        response.raise_for_status()
        data = response.json()

        _cached_token = data["access_token"]
        _token_expires_at = time.time() + data["expires_in"] - 60  # refresh 60s early

        return _cached_token


def createAppointment(request):
    

    if not request.user.is_authenticated:
        return redirect("frontend/login") #replace later

    user = request.user
    body = json.loads(request.body)
    time_str = body.get("datetime")

    try:
        duration = int(body.get("duration"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid duration"}, status=400)

    appt_time, err = _parse_and_validate(time_str, duration)
    if err:
        return err

    with transaction.atomic():
        if Appointment.objects.select_for_update().filter(aptTime=appt_time).exists():
            return JsonResponse({"error": "appointment already taken"}, status=400)

        try:
            zoom = requests.post(
                f"https://api.zoom.us/v2/users/me/meetings",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {get_zoom_access_token()}", 
                    },
                json={
                    "agenda": f"{user.first_name}'s Consultation",
                    "duration": duration,
                    "pre_schedule": True,
                    "schedule_for": user.email,
                    "start_time": time_str,
                    "timezone": "Africa/Cairo",
                    "type": 2,
                },
                timeout=10,
            )
        except requests.RequestException:
            return JsonResponse({"error": "failed to reach zoom, please try again"}, status=502)

        if zoom.status_code != 201:
            return JsonResponse({"error": "failed to retrieve zoom link, please try again"}, status=400)

        zoom_link = zoom.json()["join_url"]

        Appointment.objects.create(
            aptTime=appt_time,
            user=user,
            length=duration,
            zoomLink=zoom_link,
        )

    return JsonResponse({"Zoom Link": zoom_link}, status=201)


def createGroupSession(request):

    body = json.loads(request.body)
    name = body.get("name")
    description = body.get("description")
    time_str = body.get("datetime")
    try:
        capacity = int(body.get("capacity"))
        duration = int(body.get("duration"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "invalid capacity or duration"}, status=400)

    if capacity <= 0:
        return JsonResponse({"error": "capacity must be positive"}, status=400)

    session_time, err = _parse_and_validate(time_str, duration)
    if err:
        return err

    try:
        zoom = requests.post(
            f"https://api.zoom.us/v2/users/me/meetings",
            headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {get_zoom_access_token()}", 
                    },
            json={
                "agenda": name,
                "duration": duration,
                "pre_schedule": True,
                "start_time": time_str,
                "timezone": "Africa/Cairo",
                "type": 2,
            },
            timeout=10,
        )
    except requests.RequestException:
        return JsonResponse({"error": "failed to reach zoom, please try again"}, status=502)

    if zoom.status_code != 201:
        return JsonResponse({"error": "failed to retrieve zoom link, please try again"}, status=400)

    zoom_link = zoom.json()["join_url"]

    GroupSession.objects.create(
        name=name,
        description=description,
        total_capacity=capacity,
        seats_left=capacity,
        time=session_time,
        duration=duration,
        zoom_link=zoom_link,
    )

    return JsonResponse({"zoom link": zoom_link}, status=201)


def joinGroup(request, id):

    user=request.user

    if not user.is_authenticated:
        return redirect("")
    
    with transaction.atomic():

        group = get_object_or_404(GroupSession.objects.select_for_update(), id=id)

        if group.seats_left==0:
            return JsonResponse({"error": "session full"}, status= 400)
        
        if GroupBooking.objects.filter(user=user, session=group).exists():
            return JsonResponse({"error": "booking already exists"}, status=400)
        
        group.seats_left=group.seats_left-1
        group.save()

        booking = GroupBooking.objects.create(
            user=user,
            session=group
        )

        link = group.zoom_link
        return JsonResponse({"link": link}, status=200)  


def createBlogPost(request):

    user = request.user
    if not user.is_authenticated or not user.is_super_user:
        return JsonResponse({"Access denied"}, status=400)
    
    body=json.loads(request.body)
    contentA=body.get("contentArabic")
    titleA=body.get("titleArabic")
    contentE=body.get("contentEnglish")
    titleE=body.get("titleEnglish")

    blog = BlogPost.objects.create(
        titleEng=titleE,
        titleArb=titleA,
        contentEng=contentE,
        contentArb=contentA
    )

    return JsonResponse({"Success"}, status=200)


def getBlogPosts():
    blogs = list(BlogPost.objects.all().values)
    return JsonResponse(blogs, safe=False)


def getCourses():

    courses = Series.objects.all()
    seriesList=[]

    #fix this to not include links yet
    for c in courses:
        seriesList.append({
        "id": c.id,
        "title": c.name,
        "videos":VideoCourse.objects.filter(course=c),
        "audios":AudioCourse.objects.filter(course=c),
        "document":DocumentCourse.objects.filter(course=c),
        })

    return JsonResponse(seriesList, safe=False)

def getCourse(request, id):

    return 
'''
def processPayment():

def showAvailability():

def showUserAppointments():

def getTestimonials():

def processPayment(request):

def viewSchedule():
'''  

