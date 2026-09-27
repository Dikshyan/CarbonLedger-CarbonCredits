from django.http import JsonResponse, HttpResponse

def home_page(request):
    if "application/json" in request.headers.get("Accept", ""):
        return JsonResponse({
            "status": "online",
            "service": "CarbonLedger API",
            "endpoints": {
                "api": "/api/v1/",
                "admin": "/admin/",
                "token": "/api/token/",
                "token_refresh": "/api/token/refresh/",
            }
        })
    return HttpResponse("<h2>CarbonLedger API is running.</h2><p>API endpoint: <a href='/api/v1/'>/api/v1/</a></p>")