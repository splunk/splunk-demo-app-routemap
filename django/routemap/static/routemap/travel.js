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

    var toolbar = $(toolbarSelector);
    if (toolbar) {
      this.progress = $('meter', toolbar.append('<div><meter /></div>')).get(0);
      var timeBar = toolbar.append('<div class="row-fluid"><div class="span2 text-left"/><div class="span8 text-center" /><div class="span2 text-right"/></div>');
      this.spanTimeReport = $('div > div:nth-child(2)', timeBar);
      this.spanTimeBegin = $('div > div:first-child', timeBar);
      this.spanTimeEnd = $('div > div:last-child', timeBar);
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
        endTime = !endTime ? oEndTime : Math.min(oEndTime, endTime);
      }
    });

    if (this.progress) {
      this.progress.min = 0;
      this.progress.max = (endTime - currentTime);
      this.progress.value = 0;
    }

    if (this.spanTimeBegin) { this.spanTimeBegin.text((new Date(currentTime * 1000)).toLocaleString()); }
    if (this.spanTimeEnd) { this.spanTimeEnd.text((new Date(endTime * 1000)).toLocaleString()); }

    var reportTime = function() {
      if (this.spanTimeReport) { this.spanTimeReport.text((new Date(currentTime * 1000)).toLocaleString()); }
    }.bind(this);

    reportTime();

    if (currentTime && endTime && currentTime < endTime) {
      this.interval = setInterval(function() {
        var step = speed / 5;
        currentTime += step;
        if (currentTime > endTime) {
          this.stop();
        } else {
          if (this.progress) {
            this.progress.value += step;
          }
          reportTime();

          _.each(this.objects, function(obj) {
            obj.move(currentTime);
          }.bind(this));
        }
      }.bind(this), 50);
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
    this.currentIndex = -1;
    this.map = map;
    this.marker = null;
    this.title = title;
  }

  TravelObject.prototype.addPoint = function(ts, lat, lon) {
    this.points.push({ ts: ts, lat: lat, lon: lon });
  };

  TravelObject.prototype.start = function() {
    // Prepare to travel - sort array
    this.points = _.sortBy(this.points, function(o) { return o.ts; });
    this.currentIndex = -1;
  };

  TravelObject.prototype.getStartTime = function() {
    return (this.points.length === 0) ? null : this.points[0].ts;
  };

  TravelObject.prototype.getEndTime = function() {
    return (this.points.length === 0) ? null : this.points[this.points.length - 1].ts;
  };

  TravelObject.prototype.move = function(currentTime) {
    if (this.points.length > 0){
      if (this.currentIndex + 1 >= this.points.length) {
        if (this.marker) {
          this.marker.setMap(null);
          this.marker = null;
        }
      } else {
        var previousIndex = this.currentIndex;
        while (this.points[++this.currentIndex].ts <= currentTime) {};

        if (this.currentIndex - previousIndex > 0) {
          if (this.marker){
            this.marker.setPosition( new google.maps.LatLng(this.points[this.currentIndex].lat, this.points[this.currentIndex].lon) );
          } else {
            this.marker = this.map.addMarker({
                optimized: false,
                lat: parseFloat(this.points[this.currentIndex].lat),
                lng: parseFloat(this.points[this.currentIndex].lon),
                title: this.title,
                zIndex: 1,
                icon: "http://www.globalincidentmap.com/mapicons/general.gif"
            });
          }
        } 
        else {
          var currentPoint = this.points[this.currentIndex];
          var nextPoint = this.points[this.currentIndex + 1];
          var p = (currentTime - currentPoint)/(nextPoint - currentPoint);
          var lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * p;
          var lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * p;
          this.marker.setPosition( new google.maps.LatLng(this.points[this.currentIndex].lat, this.points[this.currentIndex].lon) );
        }
      }
    }
    
  };

  return exports.create = function(map, toolbarSelector) {
    return new TravelSystem(map, toolbarSelector);
  };
});

