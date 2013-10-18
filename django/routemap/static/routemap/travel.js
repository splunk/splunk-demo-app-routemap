define('travelSystem', ['underscore', 'exports'], function(_, exports) {

  function TravelSystem(map, toolbarSelector) {
    this.objects = [];
    this.map = map;
    this.interval = null;

    // UI Controls
    this.progress = null;
    this.spanTimeReport = null;
    this.spanTimeBegin = null;
    this.spanTimeEnd = null;
    this.sliderSpeedControl = null;

    var toolbar = $(toolbarSelector);
    if (toolbar) {
      this.progress = $('input:first-child', toolbar.append('<div><input type="range" /></div>'));
      var timeBar = toolbar.append('<div class="row-fluid"><div class="span2 text-left"/><div class="span8 text-center" /><div class="span2 text-right"/></div>');
      this.spanTimeReport = $('div > div:nth-child(2)', timeBar);
      this.spanTimeBegin = $('div > div:first-child', timeBar);
      this.spanTimeEnd = $('div > div:last-child', timeBar);
      var speedBar = toolbar.append('<div><form class="form-inline"><label>Speed:</label><input type="range" min="0.1" max="600"/><span></span></form></div>');
    }
  }

  TravelSystem.prototype.addObject = function(title, points) {
    var travelObject = new TravelObject(this.map, title, points);
    this.objects.push(travelObject);
    return travelObject;
  };

  TravelSystem.prototype.start = function(speed) {
    if (!speed) {
      speed = 1;
    }

    var currentTime = null,
        endTime = null;

    _.each(this.objects, function(obj) {
      if (obj.points.length > 0){
        var oStartTime = _.first(obj.points).ts, 
            oEndTime = _.last(obj.points).ts;

        if (oStartTime) {
          currentTime = !currentTime ? oStartTime : Math.min(oStartTime, currentTime);
        }

        if (oEndTime) {
          endTime = !endTime ? oEndTime : Math.max(oEndTime, endTime);
        }
      }
    });

    if (this.progress) {
      this.progress.prop('min', currentTime);
      this.progress.prop('max', endTime);
      this.progress.val(currentTime);
    }

    if (this.spanTimeBegin) { this.spanTimeBegin.text((new Date(currentTime * 1000)).toLocaleString()); }
    if (this.spanTimeEnd) { this.spanTimeEnd.text((new Date(endTime * 1000)).toLocaleString()); }

    if (this.sliderSpeedControl) {
      this.sliderSpeedControl.val(speed);
    }

    var reportTime = function() {
      if (this.spanTimeReport) { this.spanTimeReport.text((new Date(currentTime * 1000)).toLocaleString()); }
    }.bind(this);

    reportTime();

    var graduality = 50;

    if (currentTime && endTime && currentTime < endTime) {
      this.interval = setInterval(function() {
        var step = speed / (1000 / graduality);
        currentTime += step;

        _.each(this.objects, function(obj) {
          obj.move(currentTime);
        }.bind(this));

        if (currentTime > endTime) {
          this.stop();
        } else {
          if (this.progress) {
            this.progress.val(currentTime);
          }
          reportTime();
        }
      }.bind(this), graduality);
    }
  };

  TravelSystem.prototype.stop = function() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /*
  * Class represents each individual object on map. It stores all points and knows how to travel between them on map.
  */
  function TravelObject(map, title, points) {
    this.points = _.sortBy(points || [], function(o) { return o.ts; });
    this.title = title;

    // Private members
    var marker = null; // Google map marker

    // Public functions

    /*
    * Place object on map in current time.
    */
    this.move = function(currentTime) {
      // Trying to find point 
      var nextPointIndex = -1;
      while ((++nextPointIndex) < this.points.length) {
        if (this.points[nextPointIndex].ts > currentTime) {
          break;
        }
      }

      if (nextPointIndex == 0 || nextPointIndex >= this.points.length) {
        // Current object does not have points in this time
        if (marker) {
          marker.setMap(null);
          marker = null;
        }
      } else {
        // Let's find position of current object and place it on map
        var currentPoint = this.points[nextPointIndex - 1];
        var nextPoint = this.points[nextPointIndex];
        var p = (currentTime - currentPoint.ts)/(nextPoint.ts - currentPoint.ts);
        var lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * p;
        var lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * p;

        if (marker) {
          marker.setPosition(new google.maps.LatLng(lat, lon));
        } else {
          marker = map.addMarker({
              lat: lat,
              lng: lon,
              title: this.title,
              zIndex: 1
          });
        }
      }
    }.bind(this);
  }

  // Require export (create new travel system)
  return exports.create = function(map, toolbarSelector) {
    return new TravelSystem(map, toolbarSelector);
  };
});

