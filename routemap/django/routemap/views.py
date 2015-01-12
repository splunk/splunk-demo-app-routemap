from django.contrib.auth.decorators import login_required
from splunkdj.decorators.render import render_to

@render_to('routemap:map.html')
@login_required
def map(request):
    return {
        "app_name": "routemap"
    }

@render_to('routemap:openstreetmap.html')
def openstreetmap(request): 
    return {
        "app_name": "routemap"
    }