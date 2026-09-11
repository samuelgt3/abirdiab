from django.http import JsonResponse
from django.shortcuts import redirect
from .models import Appointment
from datetime import datetime
import requests
import os
from dotenv import load_dotenv
from django.contrib.auth import authenticate, login, logout
from .courses import createUploadUrl, mux_webhook
load_dotenv()
zoom_key=os.getenv('ZOOM_KEY')

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


def createAppointment(request):
    user=request.user
    if user:

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
            return JsonResponse()

        if not time or time<datetime.now():
            return JsonResponse()
        
        if 0>duration or duration>180:
            return JsonResponse()
        
        appts = Appointment.objects.filter(aptTime=time)

        if len(appts):
            return JsonResponse()
        
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

            return JsonResponse()
        
        return JsonResponse()

    
    else:
        return redirect("frontend/login") #replace when created
    

