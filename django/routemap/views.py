from django.contrib.auth.decorators import login_required
from splunkdj.decorators.render import render_to

@render_to('routemap:map.html')
@login_required
def map(request):
    return {
        "app_name": "Route Map"
    }