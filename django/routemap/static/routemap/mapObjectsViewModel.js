define(
  'mapObjectsViewModel', 
  ['underscore', 'backbone', 'mapObjectsDictionary'], 
  function(_, Backbone, MapObjectsDictionary) {

  'use strict'

  /*
  * View-Model object for map objects view.
  */
  var MapObjectsViewModel = Backbone.Model.extend({

    /*
    * Default values for view model.
    */
    defaults: {
      graduality: 10,
      speed: 150
    },

    /*
    * Backbone model initialization.
    */ 
    initialize: function() {
      // Initialize sub-models
      this.collection = new MapObjectsDictionary();
      this.map = new GMaps({ div: '#map', lat: 0, lng: 0, zoom: 2 });

      this.collection.on('add', function(model) {
        var marker = null;
        var polyline = null;
        model
            .on('add-point', function(model, point) {
              this.set('beginTime', !this.has('beginTime') ? point.ts : Math.min(point.ts, this.get('beginTime')));
              this.set('endTime', !this.has('endTime') ? point.ts : Math.max(point.ts, this.get('endTime')));
            }.bind(this))
            .on('change:pos', function(model, pos) {
              if (pos) {
                if (marker) {
                  marker.setPosition(new google.maps.LatLng(pos.lat, pos.lon));
                } else {
                  marker = this.map.addMarker({
                      lat: pos.lat,
                      lng: pos.lon,
                      title: model.get('title'),
                      zIndex: 1
                  });
                }
              } else {
                if (marker) {
                  marker.setMap(null);
                  marker = null;
                }
              }
            }.bind(this))
            .on('change:showRoute', function(model, showRoute) {
              if (showRoute) {
                var path = _.map(model.getPoints(), function(p) {
                  return [p.lat, p.lon];
                });

                polyline = this.map.drawPolyline({
                  path: path,
                  strokeColor: '#131540',
                  strokeOpacity: 0.6,
                  strokeWeight: 6
                });
              } else {
                if (polyline) {
                  polyline.setMap(null);
                  polyline = null;
                }
              }
            }.bind(this))
            .on('change:showObject', function(model, showObject) {
              if (showObject) {
                model.calculatePos(this.get('currentTime'))
              }
            }.bind(this))
      }.bind(this));

      this.collection.on('remove', function(model) {
        model.clearPos();
      });
    },

    /*
    * Set current time for view model.
    *
    * Method update each object on map and ask them to recalculate their
    * positions.
    */ 
    setCurrentTime: function(time) {
      this.set('currentTime', time);
      this.collection.each(function(obj) {
        if (obj.showObject()) {
          obj.calculatePos(time);
        }
      }.bind(this));
    },

    /*
    * Set begin time of current view model.
    * @param time - timestamp.
    */ 
    setBeginTime: function(time) {
      this.set('beginTime', time);
    },

    /*
    * Set end time of current view model.
    * @param time - timestamp.
    */ 
    setEndTime: function(time) {
      this.set('endTime', time);
    },

    /*
    * Add object on the map. 
    * @param fields - set of unique fields for object.
    * @param point - position of the object in time { ts: [float], lat: [float], lon: [float]}
    */
    addData: function(fields, point) {
      return this.collection.addData(fields, point);
    },

    /*
    * Remove all tracking objects.
    */ 
    removeAllObjects: function() {
      this.pause();
      this.collection.each(function(obj) { obj.clearPos(); })
      this.collection.reset();
      this.unset({currentTime: null, beginTime: null, endTime: null});
    },

    /*
    * Start playback of all objects on map.
    */
    play: function() {
      if (!this.has('beginTime') || !this.has('endTime') || this.has('playInterval')) {
        // No objects or already in play mode
        return; 
      }

      if (!this.has('currentTime')) {
        this.setCurrentTime(this.get('beginTime'));
      }

      this.set('playInterval', setInterval(function() {
          this.setCurrentTime(this.get('currentTime') + (this.get('speed') / this.get('graduality')));
          if (this.get('currentTime') > this.get('endTime')) {
            this.pause();
          } 
        }.bind(this), (1000 / this.get('graduality'))));
    }, 

    /*
    * Pause playback.
    */
    pause: function() {
      if (this.has('playInterval')) {
        clearInterval(this.get('playInterval'));
        this.unset('playInterval');
      }
    },

    /*
    * Auto-zoom map to area of selected objects.
    */
    autoZoom: function() {
      // Calculate bounds of all visible objects
      var bounds = new google.maps.LatLngBounds();
      this.collection.each(function(model) {
        if (model.showObject()) {
          var points = model.getPoints();
          _.each(points, function(point) {
            bounds.extend(new google.maps.LatLng(point.lat, point.lon))
          });
        }
      });

      this.map.fitBounds(bounds);
    }
  });

  return MapObjectsViewModel;
});