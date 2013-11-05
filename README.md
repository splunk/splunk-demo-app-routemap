# Splunk-RouteMap demo application

RouteMap is a demo application for [Splunk](https://splunk.com). 
Current application has only one view, which can project objects with their routes 
from Splunk events on Google Map control. 

## Requirements

  * You need to have [Splunk](http://www.splunk.com/download) installed on your machine 
    (this application is tested with Splunk 6.0).

## Installation
 
  1. Install the app by copying `routemap` folder to `$SPLUNK_HOME/etc/apps`. 
     On *nix based machines instead of copying you can do symbolic link to `routemap` folder
     from `$SPLUNK_HOME/etc/apps` with command `ln -s [PATH TO CURRENT FOLDER]/routemap`.
     Make sure that you use `routemap` as an application folder, otherwise you will have routing issues.
  2. (Re)start Splunk so that the app is recognized.
  3. From Splunk home page navigate to `Route Map -> Map` menu item. 

## Configuration

If you want to project your own objects on map you just need to change search command.
Using `normalize` macros you can specify properties in your events, which contains
information about time stamps, latitude and longitude:

  * ts - Time stamp in [Unix time](http://en.wikipedia.org/wiki/Unix_time) format (number).
  * lat - [Latitude](http://en.wikipedia.org/wiki/Latitude).
  * lat - [Longitude](http://en.wikipedia.org/wiki/Longitude).
  * fieldX - Set of fields which can be used to group events by object.

After that you can try to invoke search command, for example

    source="my-data-source" | `normalize(ts=ts, lat=lat, lon=lon, field1=name)`

## License

This software is licensed under the Apache License 2.0. Details can be found in the file LICENSE.