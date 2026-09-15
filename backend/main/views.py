from django.http import JsonResponse
from django.shortcuts import redirect, get_object_or_404
from .models import Appointment, GroupSession, GroupBooking
from datetime import datetime, timezone
import requests
import os
from dotenv import load_dotenv
from django.db import transaction
from django.contrib.auth import authenticate, login, logout
from .courses import createUploadUrl, mux_webhook

load_dotenv()

zoom_key=os.getenv('ZOOM_KEY')
bearer_token=os.getenv('BEARER_TOKEN')


def login_view(request):

    email = request.POST.get("email")
    password = request.POST.get("password")

    user = authenticate(request, username=email, password=password) 
    
    if user is not None:

        login(request, user)  
        return JsonResponse({"status": "ok"})
    
    return JsonResponse({"error": "Invalid credentials"}, status=401)

def logout_view(request):

    logout(request) 

    return JsonResponse({"status": "ok"})

ZOOM_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {bearer_token}", #replace with user token
}

def _parse_and_validate(time_str, duration):
    try:
        appt_time = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S")

    except (TypeError, ValueError):
        return None, JsonResponse({"error": "invalid time"}, status=400)

    if appt_time < timezone.now():
        return None, JsonResponse({"error": "invalid time"}, status=400)

    if duration <= 0 or duration > 180:
        return None, JsonResponse({"error": "meeting duration out of the 0 - 3 hours range"}, status=400)

    return appt_time, None


def createAppointment(request):

    if not request.user.is_authenticated:
        return redirect("frontend/login") #replace later

    user = request.user
    body = request.POST
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
                f"https://api.zoom.us/v2/users/{zoom_key}/meetings",
                headers=ZOOM_HEADERS,
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

        zoom_link = zoom.json()["registration_url"]

        Appointment.objects.create(
            aptTime=appt_time,
            user=user,
            length=duration,
            zoomLink=zoom_link,
        )

    return JsonResponse({"Zoom Link": zoom_link}, status=201)


def createGroupSession(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({"error": "Forbidden"}, status=403)

    body = request.POST
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
            f"https://api.zoom.us/v2/users/{zoom_key}/meetings",
            headers=ZOOM_HEADERS,
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

    zoom_link = zoom.json()["registration_url"]

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

