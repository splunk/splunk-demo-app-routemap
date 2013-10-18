define('travelSystem', ['underscore', 'backbone', 'exports', ], function(_, Backbone, exports) {

  function TravelSystem(map, toolbarSelector) {
    this.objects = [];
    this.map = map;

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

    // Private members
    var interval = null;
    var graduality = 50;
    var speed = 200;

    var currentTime = null;
    var beginTime = null;
    var endTime = null;

    // Public function

    /*
    * Add object on the map. 
    * @param title - will be used as a tooltip for marker.
    * @param points - array of points where each point is { ts: [float], lat: [float], lon: [float]}
    */
    this.addObject = function(title, points) {
      points = _.sortBy(points || [], function(o) { return o.ts; });
      var travelObject = new TravelObject({
                                map: this.map, 
                                title: title, 
                                points: points
                              });

      this.objects.push(travelObject);

      if (points.length > 0){
        var oStartTime = _.first(points).ts, 
            oEndTime = _.last(points).ts;

        if (oStartTime) {
          beginTime = !beginTime ? oStartTime : Math.min(oStartTime, beginTime);
          this.progress.prop('min', beginTime);
        }

        if (oEndTime) {
          endTime = !endTime ? oEndTime : Math.max(oEndTime, endTime);
          this.progress.prop('max', endTime);
        }
      }

      return travelObject;
    }.bind(this);

    /*
    * Remove all tracking objects.
    */ 
    this.removeAllObjects = function() {
      this.pause();
      _.each(this.objects, function(obj) { obj.removeMarker(); })
      this.objects = [];
      this.currentTime = this.beginTime = this.endTime = null;
      this.progress.val(undefined);
    }.bind(this)

    /*
    * Start travel system
    */
    this.play = function() {
      if (!beginTime || !endTime) {
        // No objects
        return;
      }

      if (!currentTime) { currentTime = beginTime;}

      if (this.progress) {
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

      if (currentTime && endTime && currentTime < endTime) {
        interval = setInterval(function() {
          currentTime += (speed / (1000 / graduality));

          _.each(this.objects, function(obj) {
            obj.move(currentTime);
          }.bind(this));

          if (currentTime > endTime) {
            this.pause();
          } else {
            if (this.progress) {
              this.progress.val(currentTime);
            }
            reportTime();
          }
        }.bind(this), graduality);
      }
    }.bind(this);

    /*
    * Pause system.
    */
    this.pause = function() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }.bind(this);
  }

  /*
  * Class represents each individual object on map. It stores all points and knows how to travel between them on map.
  */
  var TravelObject = Backbone.Model.extend({
    /*
    * Place object on map in current time.
    */
    move: function(currentTime) {
      // Trying to find point 
      var nextPointIndex = -1;
      while ((++nextPointIndex) < this.get('points').length) {
        if (this.get('points')[nextPointIndex].ts > currentTime) {
          break;
        }
      }

      if (nextPointIndex == 0 || nextPointIndex >= this.get('points').length) {
        // Current object does not have points in this time
        this.removeMarker();
      } else {
        // Let's find position of current object and place it on map
        var currentPoint = this.get('points')[nextPointIndex - 1];
        var nextPoint = this.get('points')[nextPointIndex];
        var p = (currentTime - currentPoint.ts)/(nextPoint.ts - currentPoint.ts);
        var lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * p;
        var lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * p;

        if (this.get('marker')) {
          this.get('marker').setPosition(new google.maps.LatLng(lat, lon));
        } else {
          this.set('marker', this.get('map').addMarker({
              lat: lat,
              lng: lon,
              title: this.get('title'),
              zIndex: 1
          }));
        }
      }
    },

    /*
    * Remove marker from map.
    */
    removeMarker: function() {
      if (this.get('marker')) {
        this.get('marker').setMap(null);
        this.set('marker', null);
      }
    }
  });

  // Require export (create new travel system)
  return exports.create = function(map, toolbarSelector) {
    return new TravelSystem(map, toolbarSelector);
  };
});

