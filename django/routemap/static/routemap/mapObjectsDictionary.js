define(
  'mapObjectsDictionary', 
  ['underscore', 'backbone'], 
  function(_, Backbone) {

  'use strict'

  // How many seconds we show object on map after we think it disappears.
  var defaultObjectTimeout = 60;

  /*
  * Generate title string from object's fields. 
  * @param obj - object.
  * 
  * For example if your obj is { a: '1', b: '2' } this 
  * method will generate P
  */ 
  function generateTitle(obj) {
    var title = '';

    if (obj) {  
      for (var field in obj) {
        if (obj.hasOwnProperty(field)) {
          if (title !== '') {
            title += ', ';
          }
          title += field + ': ' + obj[field];
        }
      }
    } 

    return title;
  }

  /*
  * Class represents each individual object on map. 
  * It stores all points and knows how to travel between them on map.
  */
  var MapObject = Backbone.Model.extend({

    /*
    * Model default values.
    */ 
    defaults: function() {
      return {
        title: '',
        obj: {},
        points: [],
        showObject: true,
        showRoute: false
      };
    },

    /*
    * Backbone initialize method.
    */
    initialize: function() {

      // When we hide object we trigger event that we removed current position
      this.on('change:showObject', function() {
        if (!this.showObject()) {
          this.clearPos();
        }
      }.bind(this));

      this.set('title', this.get('title') || generateTitle(this.get('obj')) || 'unknown');
      this.map = this.get('map');
      this.marker = null;
      this.polyline = null;
    },

    /*
    * Add new point for object,
    * @param point - should be in format 
    *               { ts: [float], lat: [float], lon: [float] }
    */ 
    add: function(point) {
      if (!point 
        || !_.isNumber(point.ts)
        || !_.isNumber(point.lat)
        || !_.isNumber(point.lon)) {
        throw 'Argument exception. Invalid point format';
      }
      this.getPoints().unshift(point);
    },

    /*
    * Place object on map in current time.
    * @param currentTime - timestamp for which we want to calculate position.
    * @param realtime - in case of realtime object always show latest known position
    *                   for time specified by default value.
    *
    * Current method calculates position and set it as backbone model field `pos`.
    */
    calculatePos: function(currentTime, realtime) {
      if (this.showObject()) {
        // Trying to find point 
        var points = this.getPoints();

        var lat, lon;

        if (realtime) {
          var lastPoint = _.last(points);
          if (lastPoint && Math.abs(currentTime - lastPoint.ts, 0) <= defaultObjectTimeout) {
            lat = lastPoint.lat;
            lon = lastPoint.lon;
          }
        } else {
          var nextPointIndex = -1;
          while ((++nextPointIndex) < points.length) {
            if (points[nextPointIndex].ts > currentTime) {
              break;
            }
          }

          if (nextPointIndex !== 0 && nextPointIndex < points.length) {
            // Let's find position of current object and place it on map
            var currentPoint = points[nextPointIndex - 1];
            var nextPoint = points[nextPointIndex];
            var p = (currentTime - currentPoint.ts)/(nextPoint.ts - currentPoint.ts);
            lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * p;
            lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * p;
          }
        }

        if (lat && lon) {
          if (this.marker) {
            this.marker.setPosition(new google.maps.LatLng(lat, lon));
          } else {
            this.marker = this.map.addMarker({
                lat: lat,
                lng: lon,
                title: this.get('title'),
                zIndex: 1
            });
          }
        } else {
          // Current object does not have points in this time
          this.clearPos();
        }
      } else {
        this.clearPos();
      }
    },

    /*
    * Remove marker from map.
    *
    * Method invoke `unset` for field `pos`.
    */
    clearPos: function() {
      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }
    },

    /*
    * Toggle current state of show route (field `showRoute`).
    */
    toggleShowRoute: function() {
      this.showRoute(!this.showRoute());
    },

    /*
    * Toggle current state of show object (field `showObject`).
    */
    toggleShowObject: function() {
      this.showObject(!this.showObject());
    },

    /*
    * Gets or sets the show object value.
    * @param value - if not undefined - set value to showObject.
    */ 
    showObject: function(value) {
      if (!_.isUndefined(value)) {
        this.set({'showObject': value});

        if (!value) {
          this.clearPos();
        }
      }
      return this.get('showObject');
    },

    /*
    * Gets or sets the show object value.
    * @param value - if not undefined - set value to showRoute.
    */ 
    showRoute: function(value) {
      if (!_.isUndefined(value)) {
        this.set({'showRoute': value});

        if (value) {
          var path = _.map(this.getPoints(), function(p) {
            return [p.lat, p.lon];
          });

          this.polyline = this.map.drawPolyline({
            path: path,
            strokeColor: '#131540',
            strokeOpacity: 0.6,
            strokeWeight: 6
          });
        } else {
          if (this.polyline) {
            this.polyline.setMap(null);
            this.polyline = null;
          }
        }
      }
      return this.get('showRoute');
    },

    /*
    * Gets points array.
    */
    getPoints: function() {
      return this.get('points');
    }
  });

  /*
  * Dictionary stores all travel models.
  *
  * To initialize this dictionary you need to set { map: [Gmaps object] };
  * 
  * Backbone custom events:
  * add - new MapObject has been added.
  * remove - object has been removed.
  * reset - all elements are going to be removed.
  */
  var MapObjectsDictionary = Backbone.Model.extend({

    /*
    * Backbone initialize method.
    */
    initialize: function() {
      this.models = {};
      this.map = this.get('map');
      if (!this.map) throw 'Map object should be set to initialize dictionary';
    },

    /*
    * Add new data for dictionary.
    * @param obj - map object. Fields of this object defines unique objects.
    * @param point - new point for object specified with fields.
    * @return - MapObject value.
    *
    * Method generates id based on fields and create new MapObject element if dictionary
    * does not have value by generated id, otherwise it adds new point to existing MapObject.
    *
    * After first 100 objects this method sets `showObject` to `false` for next objects.
    */
    addData: function(obj, point) {
      var id = JSON.stringify(obj);

      var model = null;

      if (this.models.hasOwnProperty(id)) {
        model = this.models[id];
      } else {
        model = new MapObject({ 
                        obj: obj, 
                        map: this.map
                     });
        this.models[id] = model;
        this.trigger('add', model);
      }

      model.add(point);

      return model;
    },

    /*
    * Remove all objects from dictionary.
    */
    reset: function() {
      this.trigger('reset');
      this.each(function(model, id) {
        this.trigger('remove', model);
        delete this.models[id];
      }.bind(this));
    },

    /*
    * Invoke action for each object in dictionary.
    * @param action - function which will be invoked with two arguments model, generated_id.
    */ 
    each: function(action) {
      if (!_.isFunction(action)) {
        throw 'Argument exception. Action is not a function.';
      }
      for (var id in this.models) {
        if (this.models.hasOwnProperty(id)) {
          action(this.models[id], id);
        }
      }
    }
  });

  // Require export (MapObjectsDictionary constructor)
  return MapObjectsDictionary;
});