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

  TravelSystem.prototype.addObject = function(title) {
    var travelObject = new TravelObject(this.map, title);
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
      obj.start();
      var oStartTime = obj.getStartTime(), oEndTime = obj.getEndTime();

      if (oStartTime) {
        currentTime = !currentTime ? oStartTime : Math.min(oStartTime, currentTime);
      }

      if (oEndTime) {
        endTime = !endTime ? oEndTime : Math.max(oEndTime, endTime);
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

  function TravelObject(map, title) {
    this.points = [];
    this.map = map;
    this.marker = null;
    this.title = title;

    // Private functions
    var removeMarker = function() {
      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }
    }.bind(this);

    // Public functions
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
        removeMarker();
        return;
      }

      var currentPoint = this.points[nextPointIndex - 1];
      var nextPoint = this.points[nextPointIndex];
      var p = (currentTime - currentPoint.ts)/(nextPoint.ts - currentPoint.ts);
      var lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * p;
      var lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * p;

      if (this.marker) {
        this.marker.setPosition(new google.maps.LatLng(lat, lon));
      } else {
        this.marker = this.map.addMarker({
            lat: lat,
            lng: lon,
            title: this.title,
            zIndex: 1
        });
      }
    }.bind(this);

    this.addPoint = function(ts, lat, lon) {
      if (typeof lat !== 'number') { lat = parseFloat(lat); }
      if (typeof lon !== 'number') { lon = parseFloat(lon); }
      if (typeof ts !== 'number') { ts = parseFloat(ts); }
      this.points.push({ ts: ts, lat: lat, lon: lon });
    }.bind(this);

    this.start = function() {
      // Prepare to travel - sort array
      this.points = _.sortBy(this.points, function(o) { return o.ts; });
    }.bind(this);

    this.getStartTime = function() {
      return (this.points.length === 0) ? null : this.points[0].ts;
    }.bind(this);

    this.getEndTime = function() {
      return (this.points.length === 0) ? null : this.points[this.points.length - 1].ts;
    }.bind(this);
  }

  // Require export (create new travel system)
  return exports.create = function(map, toolbarSelector) {
    return new TravelSystem(map, toolbarSelector);
  };
});

