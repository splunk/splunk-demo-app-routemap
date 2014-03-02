define(
['jquery', 'underscore'], 
function($, _, L) {
  'use strict';

  /* 
   * ---------------------------
   * Google Maps
   * ---------------------------
   */

  var GoogleMap = function(div) {
    this.map = new GMaps({ div: '#' + div, lat: 0, lng: 0, zoom: 2 });
  };

  GoogleMap.prototype.autozoom = function(collection) {
    var bounds = new google.maps.LatLngBounds();

    collection.each(function(model) {
      if (model.showObject() || model.showRoute()) {
        var points = model.getPoints();
        _.each(points, function(point) {
          bounds.extend(new google.maps.LatLng(point.lat, point.lon));
        });
      }
    });

    this.map.fitBounds(bounds);
  };

  GoogleMap.prototype.addMarker = function(data) {
    return new GoogleMapMarker(this, data);
  };

  GoogleMap.prototype.addPolyline = function(data) {
    return new GoogleMapPolyline(this, data);
  };

  var GoogleMapMarker = function(map, data) {
    this.map = map;
    this.marker = this.map.map.addMarker({
          lat: data.lat,
          lng: data.lon,
          title: data.title,
          zIndex: 1,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            strokeColor: data.color,
            strokeWeight: 4,
            strokeOpacity: 1
          }
      });
  };

  GoogleMapMarker.prototype.move = function(lat, lon) {
    this.marker.setPosition(new google.maps.LatLng(lat, lon));
  };

  GoogleMapMarker.prototype.remove = function() {
    this.marker.setMap(null);
  };

  GoogleMapMarker.prototype.highlight = function() {
    // Highlight object
    var animation = {step: 0};
    $(animation).animate(
        { step: 1 },
        {
          duration: 1000,
          easing: 'linear',
          start: function() {
            this.marker.setAnimation(google.maps.Animation.BOUNCE);
            this.marker.setZIndex(1001);
          }.bind(this),
          complete: function() {
            this.marker.setAnimation(null);
            this.marker.setZIndex(1);
          }.bind(this)
        });
  };

  var GoogleMapPolyline = function(map, data) {
    this.map = map;
    this.polyline = this.map.map.drawPolyline({
      path: data.path,
      strokeColor: data.color,
      strokeOpacity: 0.6,
      strokeWeight: 4
    });
  };

  GoogleMapPolyline.prototype.remove = function() {
    this.polyline.setMap(null);
  };

  GoogleMapPolyline.prototype.removePoint = function(index) {
    this.polyline.getPath().removeAt(index);
  };

  GoogleMapPolyline.prototype.addPoint = function(lat, lon) {
    this.polyline.getPath().push(new google.maps.LatLng(lat, lon));
  };

  GoogleMapPolyline.prototype.highlight = function() {
    // Highlight object
      var animation = {step: 0};
      $(animation).animate(
          { step: 2 },
          {
            duration: 1000,
            easing: 'linear',
            start: function() {
              this.polyline.setOptions({ zIndex: 100 });
            }.bind(this),
            progress: function() {
              if (this.polyline) {
                var step = (animation.step - Math.floor(animation.step));
                if (step === 1 || step === 5) {
                  step *= 0.4;
                } else {
                  step *= 0.8;
                }
                if (step % 2 !== 0) {
                  step = 1 - step;
                }
                this.polyline.setOptions({strokeOpacity:step});
              }
            }.bind(this),
            complete: function() {
              this.polyline.setOptions({ zIndex: 1 , strokeOpacity:0.6 });
            }.bind(this)
          });
  };

  GoogleMapPolyline.prototype.zoomTo = function() {
    var bounds = new google.maps.LatLngBounds();
    _.each(this.polyline.getPath().getArray(), bounds.extend, bounds);
    this.map.map.fitBounds(bounds);
  };

  return GoogleMap;
}
);