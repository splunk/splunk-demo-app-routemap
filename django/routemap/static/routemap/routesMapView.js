define('routesMapView', ['underscore', 'backbone', 'exports', ], function(_, Backbone, exports) {

  /*
  * Routes map view
  */
  var RoutesMapView = Backbone.View.extend({
    
    el: $('#routes-map-view'),

    events: {
      'change #input-speed-value': 'userChangeSpeed',
      'change #input-graduality-value': 'userChangeGraduality',
      'change #input-time': 'userChangeTime',
      'click #button-play': 'userPlay',
      'click #button-pause': 'userPause',
      'click #button-autozoom': 'userAutoZoom'
    },

    initialize: function() {
      this.viewModel = new RoutesMapViewModel;

      this.buttonPlay = this.$('#button-play');
      this.buttonPause = this.$('#button-pause');
      this.spanSpeedValue = this.$('#span-speed-value');
      this.inputSpeedValue = this.$('#input-speed-value');
      this.spanGradualityValue = this.$('#span-graduality-value');
      this.inputGradualityValue = this.$('#input-graduality-value');
      this.labelBeginTime = this.$('#bar-time-ranges div:first-child > span');
      this.labelCurrentTime = this.$('#bar-time-ranges div:nth-child(2) > span');
      this.labelEndTime = this.$('#bar-time-ranges div:last-child > span');
      this.inputTime = this.$('#input-time');

      // Connect view to view-model
      this.viewModel
        .on('change:currentTime', function() {
            this.labelCurrentTime.text(
              this.viewModel.has('currentTime') ? (new Date(this.viewModel.get('currentTime') * 1000)).toLocaleString() : '');
            this.inputTime.prop('disabled', !this.viewModel.has('currentTime'));
            this.inputTime.val(this.viewModel.get('currentTime'));
          }.bind(this))
        .on('change:beginTime', function() {
            if (this.viewModel.has('beginTime')) {
              this.inputTime.prop('min', this.viewModel.get('beginTime'));
              this.labelBeginTime.text((new Date(this.viewModel.get('beginTime') * 1000)).toLocaleString());
            } else {
              this.labelBeginTime.text('');
            }
          }.bind(this))
        .on('change:endTime', function() {
            if (this.viewModel.has('endTime')) {
              this.inputTime.prop('max', this.viewModel.get('endTime'));
              this.labelEndTime.text((new Date(this.viewModel.get('endTime') * 1000)).toLocaleString());
            } else {
              this.labelEndTime.text('');
            }
          }.bind(this))
        .on('change:speed', function() {
            if (this.viewModel.has('speed')) {
              var currentSpeed = this.viewModel.get('speed');
              this.spanSpeedValue.text(currentSpeed);
              this.inputSpeedValue.val(currentSpeed);
              this.inputSpeedValue.prop('disabled', false);
            } else {
              this.spanSpeedValue.text('');
              this.inputSpeedValue.prop('disabled', true);
            }
          }.bind(this))
        .on('change:graduality', function() {
            if (this.viewModel.has('graduality')) {
              var currentGraduality = this.viewModel.get('graduality');
              this.spanGradualityValue.text(currentGraduality);
              this.inputGradualityValue.val(currentGraduality);
              this.inputGradualityValue.prop('disabled', false);
            } else {
              this.spanGradualityValue.text('');
              this.inputGradualityValue.prop('disabled', true);
            }
          }.bind(this))
        .on('change:playInterval change:currentTime', function() {
            var isPlaying = this.viewModel.has('playInterval');
            this.buttonPlay.prop('disabled', !this.viewModel.has('currentTime') || isPlaying);
            this.buttonPause.prop('disabled', !isPlaying);
          }.bind(this))
        .trigger('change:currentTime change:beginTime change:endTime change:speed change:graduality change:playInterval');
    },

    // Event handlers
    userChangeSpeed: function() {
      this.viewModel.pause();
      this.viewModel.set('speed', this.inputSpeedValue.val());
      this.viewModel.play();
    },

    userChangeGraduality: function() {
      this.viewModel.pause();
      this.viewModel.set('graduality', parseFloat(this.inputGradualityValue.val()));
      this.viewModel.play();
    },

    userChangeTime: function() {
      this.viewModel.pause();
      this.viewModel.setCurrentTime(parseFloat(this.inputTime.val()));
    },

    userPlay: function() {
      this.viewModel.play();
    },

    userPause: function() {
      this.viewModel.pause();
    },

    userAutoZoom: function() {
      this.viewModel.autoZoom();
    }
  });

  /*
  * View-Model
  */
  var RoutesMapViewModel = Backbone.Model.extend({
    defaults: {
      graduality: 20,
      speed: 150
    },

    initialize: function() {
      // Initialize sub-models
      this.collection = new TravelModelsCollection;
      this.bounds = null;
      this.map = new GMaps({ div: '#map', lat: 0, lng: 0, zoom: 2 });

      this.collection.on('add', function(model) {
        var points = model.get('points');

        _.each(points, function(point) { (this.bounds || (this.bounds = new google.maps.LatLngBounds())).extend(new google.maps.LatLng(point.lat, point.lon)); }.bind(this))

        if (points.length > 0){
          var oStartTime = _.first(points).ts, 
              oEndTime = _.last(points).ts;

          if (oStartTime) {
            this.set('beginTime', !this.has('beginTime') ? oStartTime : Math.min(oStartTime, this.get('beginTime')));
          }

          if (oEndTime) {
            this.set('endTime', !this.has('endTime') ? oEndTime : Math.max(oEndTime, this.get('endTime')));
          }
        }

        var marker = null;
        model.on('change:pos', function(model, pos) {
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
        }.bind(this)); 
      }.bind(this));

      this.collection.on('remove', function(model) {
        model.clearPos();
      });
    },

    setCurrentTime: function(time) {
      this.set('currentTime', time);
      this.collection.each(function(obj) {
        obj.calculatePos(time);
      }.bind(this));
    },

    setBeginTime: function(time) {
      this.set('beginTime', time);
    },

    setEndTime: function(time) {
      this.set('endTime', time);
    },

    /*
    * Add object on the map. 
    * @param title - will be used as a tooltip for marker.
    * @param points - array of points where each point is { ts: [float], lat: [float], lon: [float]}
    */
    addObject: function(title, points) {
      points = _.sortBy(points || [], function(o) { return o.ts; });

      var travelModel = new TravelModel({
                                map: this.map, 
                                title: title, 
                                points: points
                              });

      this.collection.add([travelModel]);

      return travelModel;
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
    * Start travel system
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
    * Pause system.
    */
    pause: function() {
      if (this.has('playInterval')) {
        clearInterval(this.get('playInterval'));
        this.unset('playInterval');
      }
    },

    autoZoom: function() {
      if (this.bounds) {
        this.map.fitBounds(this.bounds);
      }
    }
  });

  /*
  * Class represents each individual object on map. It stores all points and knows how to travel between them on map.
  */
  var TravelModel = Backbone.Model.extend({
    /*
    * Place object on map in current time.
    */
    calculatePos: function(currentTime) {
      // Trying to find point 
      var points = this.get('points');

      var nextPointIndex = -1;
      while ((++nextPointIndex) < points.length) {
        if (points[nextPointIndex].ts > currentTime) {
          break;
        }
      }

      if (nextPointIndex == 0 || nextPointIndex >= points.length) {
        // Current object does not have points in this time
        this.clearPos();
      } else {
        // Let's find position of current object and place it on map
        var currentPoint = points[nextPointIndex - 1];
        var nextPoint = points[nextPointIndex];
        var p = (currentTime - currentPoint.ts)/(nextPoint.ts - currentPoint.ts);
        var lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * p;
        var lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * p;

        this.set({pos: { lat: lat, lon: lon }});
      }
    },

    /*
    * Remove marker from map.
    */
    clearPos: function() {
      this.unset({pos: null});
    }
  });

  /*
  * Collection stores all travel models.
  */
  var TravelModelsCollection = Backbone.Collection.extend({
    model: TravelModel
  });

  // Require export (create new travel system)
  return exports.create = function() {
    return new RoutesMapView();
  };
});

