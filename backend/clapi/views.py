from django.http import HttpResponse
def home_page(request):
    print("home page requested")
    return HttpResponse("<h1>This is homepage</h1>")