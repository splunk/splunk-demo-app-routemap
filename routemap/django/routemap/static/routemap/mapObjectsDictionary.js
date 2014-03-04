define(
  ['underscore', 'backbone', './utils'], 
  function(_, Backbone, utils) {

  'use strict';

  // How many seconds we show object on map after we think it disappears.
  var defaultObjectTimeout = 300;
  var defaultColors = [
    '#236326', '#29762d', '#2f8934', '#359d3b', '#3bb042', '#44c04b', '#57c75d', '#6ace6f', '#7cd582', '#8fdb94', // Green
    '#615f22', '#747128', '#87842f', '#9b9735', '#aeaa3b', '#c0bb43', '#c7c355', '#ceca68', '#d4d17b', '#dbd88e', // Yellow
    '#2d737f', '#338592', '#3996a6', '#3fa8b9', '#4fb3c3', '#61bbca', '#74c4d1', '#87ccd8', '#9ad5de', '#addde5', // Blue,
    '#562397', '#6227ad', '#6d2bc2', '#7a34d2', '#8749d7', '#955ddc', '#a372e1', '#b186e6', '#be9beb', '#ccb0ef', // Violet
    '#af5b28', '#c4662c', '#d27238', '#d7814c', '#dc8f60', '#e19e75', '#e6ad8a', '#ebbb9e', '#efcab3', '#f4d9c8', // Orange-ish
  ];

  /*
  * Gets random color from defaultColors list, example '#236326'.
  */ 
  var getRandomColor = function() {
    return defaultColors[Math.floor(Math.random() * defaultColors.length)];
  };

  /*
  * Gets a value indicating whether this point still in default object timeout limit.
  */
  function inTimeoutLimit(currentTime, point) {
    return Math.abs(currentTime - point.ts, 0) <= defaultObjectTimeout;
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
        points: [], // points ordered by ts asc 
        showObject: true,
        showRoute: false,
        autoHideRoute: true,
        color: getRandomColor(),
        realtimeWindow: 300, // Window of storing data
        modelId: '',
        raw: {}
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
          this.unset('raw');
        }
      }.bind(this));

      this.on('change:raw', function(model, raw) {
        if (this.autoHideRoute()) {
          this.showRoute(raw ? true : false);
        }
      }.bind(this));

      this.set('title', this.get('title') || utils.generateString(this.get('obj')) || 'unknown');
      this.map = this.get('map');
      this.marker = null;
      this.polyline = null;
    },

    /*
    * Add new point for object,
    * @param point - should be in format 
    *               { ts: [float], lat: [float], lon: [float] }
    *
    */ 
    add: function(point) {
      if (!point ||
        !_.isNumber(point.ts) ||
        !_.isNumber(point.lat) ||
        !_.isNumber(point.lon)) {
        throw 'Argument exception. Invalid point format';
      }
      var points = this.getPoints();
      if (_.last(points) && _.last(points).ts > point.ts) {
        throw 'We expect to see all points to be added to desc order by timestamp';
      }
      points.push(point);
      if (this.showRoute()) {
        if (this.polyline) {
          this.polyline.addPoint(point.lat, point.lon);
        } else {
          this.showRoute(true);
        }
      }
    },

    /*
    * Place object on map in current time.
    * @param currentTime - timestamp for which we want to calculate position.
    * @param realtime - in case of realtime object always show latest known position
    *                   for time specified by default value.
    *
    * Current method calculates position and set it as backbone model field `pos`.
    */
    calculatePos: function(currentTime, realtime, timeWindow) {
      if (this.showObject()) {
        // Trying to find point 
        var points = this.getPoints();

        var lat, lon, raw;

        if (timeWindow) {
          // At first let's remove all old points.
          var deadline = currentTime - timeWindow;
          var firstPoint = _.first(points);
          while (firstPoint && firstPoint.ts < deadline) {
            if (points.length === 1 &&
              inTimeoutLimit(currentTime, _.first(points))) {
              break;
            }
            firstPoint = points.shift();
            if (this.polyline) {
              this.polyline.removePoint(0);
            }
          }
        }

        if (realtime) {
          var lastPoint = _.last(points);
          if (lastPoint) {
            lat = lastPoint.lat;
            lon = lastPoint.lon;
            raw = lastPoint.raw;
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
            raw = currentPoint.raw;
          }
        }

        this.set({ raw: raw });

        if (lat && lon) {
          if (this.marker) {
            this.marker.move(lat, lon);
          } else {
            this.marker = this.map.addMarker({
                lat: lat,
                lon: lon,
                title: this.get('title'),
                color: this.get('color'),
            });
          }
        } else {
          // Current object does not have points in this time
          this.clearPos();
          this.unset('raw');
        }
      } else {
        this.clearPos();
        this.unset('raw');
      }
    },

    /*
    * Remove marker from map.
    *
    * Method invoke `unset` for field `pos`.
    */
    clearPos: function() {
      if (this.marker) {
        this.marker.remove();
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
    * Gets or sets the auto-hide route.
    * @param value - if not undefined - set value to autoHideRoutes.
    */
    autoHideRoute: function(value) {
      if (arguments.length !== 0) {
        this.set({'autoHideRoute': value});

        if (!value) {
          if (this.showRoute() && this.get('row')) {
            this.showRoute(false);
          }
        } else {
          if (!this.showRoute() && this.get('row')) {
            this.showRoute(true);
          }
        }
      }
      return this.get('autoHideRoute');
    },

    /*
    * Gets or sets the show object value.
    * @param value - if not undefined - set value to showObject.
    */ 
    showObject: function(value) {
      if (arguments.length !== 0) {
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
      if (arguments.length !== 0) {
        this.set({'showRoute': value});

        if (value) {
          if (!this.polyline) {
            var path = _.map(this.getPoints(), function(p) {
              return [p.lat, p.lon];
            });

            path.reverse();

            this.polyline = this.map.addPolyline({
              path: path,
              color: this.get('color')
            });
          }
        } else {
          if (this.polyline) {
            this.polyline.remove();
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
    },

    /*
    * Highlight object on the map. 
    */
    highlightObject: function() {
      if (!this.showRoute()) this.showRoute(true);
      if (!this.showObject()) this.showObject(true);

      this.polyline.zoomTo();

      // Highlight object
      if (this.marker) {
        this.marker.highlight();
      }
      if (this.polyline) {
        this.polyline.highlight();
      }
    },

    /*
    * Gets a value indicating whether this object does not have any points. 
    */ 
    isEmpty: function() {
      return _.isEmpty(this.getPoints());
    },

    /*
    * Gets an unique identified for this object.
    */
    modelId: function() {
      return this.get('modelId');
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

    defaults: {
      showAllObjects: true,
      showAllRoutes: true,
      autoHideRoutes: true
    },

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
                        map: this.map,
                        showObject: this.showAllObjects(),
                        showRoute: this.showAllRoutes(),
                        modelId: id
                     });
        this.models[id] = model;
        this.trigger('add', model);
        model
        .on('change:showObject', function(model, showObject) {
          if (this.showAllObjects() && !showObject) {
            this.showAllObjects(false, true /* silent */);
          }
        }.bind(this))
        .on('change:showRoute', function(model, showRoute) {
          if (this.showAllRoutes() && !showRoute) {
            this.showAllRoutes(false, true /* silent */);
          }
        }.bind(this));
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
        model.off();
        model.clearPos();
        model.showRoute(false);
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
    },

    /*
    * Gets a value indicating whether all objects should be be visible.
    */ 
    showAllObjects: function(value, silent) {
      if (arguments.length !== 0) {
        var oldValue = this.get('showAllObjects');

        this.set('showAllObjects', value);

        if (oldValue !== value && !silent) {
          this.each(function(model) {
            model.showObject(value);
          });
        }
      }

      return this.get('showAllObjects');
    },

    /*
    * Gets a value indicating whether all objects routes should be be visible.
    */ 
    showAllRoutes: function(value, silent) {
      if (arguments.length !== 0) {
        var oldValue = this.get('showAllRoutes');

        this.set('showAllRoutes', value);

        if (oldValue !== value && !silent) {
          this.each(function(model) {
            model.showRoute(value);
          });
        }
      }

      return this.get('showAllRoutes');
    },

    /*
    * Gets a value indicating whether object should auto hide their routes is they are invisible.
    */ 
    autoHideRoutes: function(value, silent) {
      if (arguments.length !== 0) {
        var oldValue = this.get('autoHideRoutes');

        this.set('autoHideRoutes', value);

        if (oldValue !== value && !silent) {
          this.each(function(model) {
            model.autoHideRoute(value);
          });
        }
      }

      return this.get('autoHideRoutes');
    },

    /*
    * Clear all empty objects from collection.
    */
    clearEmptyObjects: function() {
      this.each(function(model, id) {
        if (model.isEmpty()) {
          model.off();
          model.clearPos();
          model.showRoute(false);
          this.trigger('remove', model);
          delete this.models[id];
        }
      }.bind(this));
    }
  });

  // Require export (MapObjectsDictionary constructor)
  return MapObjectsDictionary;
});