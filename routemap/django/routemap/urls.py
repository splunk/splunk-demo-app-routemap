from django.conf.urls import patterns, include, url
from splunkdj.utility.views import render_template as render

urlpatterns = patterns('',
    url(r'^map/$', 'routemap.views.map', name='map'),
    url(r'^openstreetmap/$', 'routemap.views.openstreetmap', name='openstreetmap') 
)
