define('travelSystem', ['underscore', 'exports'], function(_, exports) {

  function TravelSystem(map, progressSelector, timeReportSelector) {
    this.objects = [];
    this.map = map;
    this.interval = null;
    this.progress = $(progressSelector).get(0);
    this.spanTimeReport = $(timeReportSelector);
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
        beginTime = null,
        endTime = null;

    _.each(this.objects, function(obj) {
      obj.start();
      var oStartTime = obj.getStartTime(), oEndTime = obj.getEndTime();

      if (oStartTime) {
        beginTime = !beginTime ? oStartTime : Math.min(oStartTime, beginTime);
      }

      if (oEndTime) {
        endTime = !endTime ? oEndTime : Math.min(oEndTime, endTime);
      }
    });

    if (this.progress) {
      this.progress.min = 0;
      this.progress.max = (endTime - beginTime);
      this.progress.value = 0;
    }

    currentTime = beginTime;

    var reportTime = function() {
      if (this.spanTimeReport) {
        this.spanTimeReport.text(
          (new Date(currentTime * 1000)).toLocaleString() 
          + ' (begin: ' 
          + (new Date(beginTime * 1000)).toLocaleString() 
          + ', end: ' 
          + (new Date(endTime * 1000)).toLocaleString()
          + ')'
        );
      }
    }.bind(this);

    reportTime();

    if (currentTime && endTime && currentTime < endTime) {
      this.interval = setInterval(function() {
        currentTime += speed;
        if (currentTime > endTime) {
          this.stop();
        } else {
          if (this.progress) {
            this.progress.value += speed;
          }
          reportTime();

          _.each(this.objects, function(obj) {
            obj.move(currentTime);
          }.bind(this));
        }
      }.bind(this), 1000);
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
          // Move object closer to next position
        }
      }
    }
    
  };

  return exports.create = function(map, progressSelector, timeReportSelector) {
    return new TravelSystem(map, progressSelector, timeReportSelector);
  };
});

