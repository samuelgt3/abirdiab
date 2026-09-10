from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from .models import Appointment, User, VideoCourse
from datetime import datetime
import requests
import mux_python
import os
from dotenv import load_dotenv
import asyncio
from django.contrib.auth import authenticate, login, logout

load_dotenv()
zoom_key=os.getenv("ZOOM_KEY")
mux_user=os.getenv['MUX_TOKEN_ID']
mux_pass=os.getenv['MUX_TOKEN_SECRET']

def login_view(request):

    email = request.POST.get("email")
    password = request.POST.get("password")

    user = authenticate(request, username=email, password=password) 
    
    if user is not None:

        login(request, user)  
        return HttpResponse({"status": "ok"})
    
    return HttpResponse({"error": "Invalid credentials"}, status=401)

def logout_view(request):

    logout(request) 

    return HttpResponse({"status": "ok"})


def createAppointment(request, user_id):

    if user_id:

        user=get_object_or_404(User, email=user_id)
        name=user.first_name
        email = user.email
        body = request.POST
        time = body.get("datetime") #format yyyy-MM-ddTHH:mm:ss
        duration = int(body.get("duration"))

        zoom = requests.post(
            "https://api.zoom.us/v2/users/30R7kT7bTIKSNUFEuH_Qlg/meetings", #replace with userid

        headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_SECRET_TOKEN" #user_token
        },

        json={
            "agenda": f"{name}'s Consultation",
            "duration": duration,
            "pre_schedule": True,
            "schedule_for": email,
            "start_time": time,
            "timezone": "Africa/Cairo",
            "type": 2
        }
            )
        data=zoom.json()
        try:
            time = datetime.strptime(time,'%Y%m%d%H%M%S')

        except (KeyError, ValueError):
            return HttpResponse()

        if not time or time<datetime.now():
            return HttpResponse()
        
        if 0>duration or duration>180:
            return HttpResponse()
        
        appts = Appointment.objects.filter(aptTime=time)

        if len(appts):
            return HttpResponse()
        
        if zoom.status_code==201:

            zoomLink = data["registration_url"]
            
            apt = Appointment(
                aptTime = time,
                user = user,
                length = duration,
                zoomLink = zoomLink,
            )

            apt.save()

        else:

            return HttpResponse()
        
        return HttpResponse()

    
    else:
        return redirect("frontend/login") #replace when created
    
def uploadCourse(request, user_id):

    if not user_id:
        return HttpResponse()
    
    else:
        if not user_id.is_super_user():
            return HttpResponse()
    video=request.POST["video"]

    configuration = mux_python.Configuration()
    configuration.username = mux_user
    configuration.password = mux_pass
    assets_api = mux_python.AssetsApi(mux_python.ApiClient(configuration))
    input_settings = [mux_python.InputSettings(video)]
    create_asset_request = mux_python.CreateAssetRequest(inputs=input_settings, playback_policies=[mux_python.PlaybackPolicy.PUBLIC], video_quality="basic")
    create_asset_response = assets_api.create_asset(create_asset_request)

    playback=create_asset_response["data"]["playback_ids"][0]["id"]
    manage=create_asset_response["data"]["id"]

    course = VideoCourse(
        name=request.POST["name"],
        description=request.POST["description"],
        playback_id=playback,
        manage_id=manage,
        downloadable=request.POST["downloadable"],
        language=request.POST.get("language"),
        price=request.POST["price"]
    )


