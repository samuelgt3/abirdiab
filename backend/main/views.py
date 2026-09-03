from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from .models import Appointment, User, Course
from datetime import datetime
import requests
import mux_python
import os

def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")

def createAppointment(request, user_id):

    user=get_object_or_404(User, email=user_id)

    if user.is_authenticated:

        name=user.first_name
        email = user.email
        body = request.POST
        time = body["datetime"] #format yyyy-MM-ddTHH:mm:ss
        duration = body["duration"]

        zoom = requests.post(
            "https://api.zoom.us/v2/users/30R7kT7bTIKSNUFEuH_Qlg/meetings", #replace with userid

        headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_SECRET_TOKEN" #user_token
        },

        json={
            "agenda": "{name}'s Consultation",
            "duration": duration,
            "pre_schedule": True,
            "schedule_for": email,
            "start_time": time,
            "timezone": "Africa/Cairo",
            "type": 2
        }
            )
        
        zoomLink = zoom["registration_url"]
        time = datetime.strptime(time)

        apt = Appointment(
            aptTime = time,
            user = user_id,
            length = duration,
            zoomLink = zoomLink,

        )
        return HttpResponse()
    
    else:
        return redirect("frontend/login") #replace when created
    
def uploadCourse(request):

    video=request.POST["video"]

    configuration = mux_python.Configuration()
    configuration.username = os.environ['MUX_TOKEN_ID']
    configuration.password = os.environ['MUX_TOKEN_SECRET']
    assets_api = mux_python.AssetsApi(mux_python.ApiClient(configuration))
    input_settings = [mux_python.InputSettings(video)]
    create_asset_request = mux_python.CreateAssetRequest(inputs=input_settings, playback_policies=[mux_python.PlaybackPolicy.PUBLIC], video_quality="basic")
    create_asset_response = assets_api.create_asset(create_asset_request)

    playback=create_asset_response["data"]["playback_ids"][0]["id"]
    manage=create_asset_response["data"]["id"]

    course = Course(
        name=request.POST["name"],
        description=request.POST["description"],
        playback_id=playback,
        manage_id=manage,
        downloadable=request.POST["downloadable"],
        language=request.POST.get("language"),
        price=request.POST["price"]
    )


