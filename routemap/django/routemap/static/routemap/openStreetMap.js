define(
['jquery', 'underscore', 'leaflet', 'leaflet.label'], 
function($, _, L) {
  'use strict';

  /* 
   * ---------------------------
   * Open Street Maps
   * ---------------------------
   */

  var OpenStreetMap = function(div) {
    this.map = L.map(div).setView([0, 0], 2);
    this.tiles = L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Tiles courtesy of <a href="http://hot.openstreetmap.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'
    }).addTo(this.map);
  };

  OpenStreetMap.prototype.autozoom = function(collection) {
    var bounds = null;

    collection.each(function(model) {
      if (model.showObject() || model.showRoute()) {
        var points = model.getPoints();
        _.each(points, function(point) {
          if (bounds) {
            bounds.extend(L.latLng(point.lat, point.lon));
          } else {
            bounds = L.latLngBounds(L.latLng(point.lat, point.lon), L.latLng(point.lat, point.lon));
          }
        });
      }
    });

    if (bounds) {
      this.map.fitBounds(bounds);
    }
  };

  OpenStreetMap.prototype.addMarker = function(data) {
    return new OpenStreetMapMarker(this, data);
  };

  OpenStreetMap.prototype.addPolyline = function(data) {
    return new OpenStreetMapPolyline(this, data);
  };

  var OpenStreetMapMarker = function(map, data) {
    this.map = map;
    this.marker = L.circleMarker(L.latLng(data.lat, data.lon), 
      {
        color: data.color,
        label: data.title,
        radius: 4
      }).bindLabel(data.title);
    this.marker.addTo(this.map.map);
  };

  OpenStreetMapMarker.prototype.move = function(lat, lon) {
    this.marker.setLatLng(L.latLng(lat, lon));
  };

  OpenStreetMapMarker.prototype.remove = function() {
    this.map.map.removeLayer(this.marker);
  };

  OpenStreetMapMarker.prototype.highlight = function() {
    // Highlight object
    var animation = {step: 0};
    $(animation).animate(
        { step: 1 },
        {
          duration: 1000,
          easing: 'linear',
          start: function() {
            this.marker.setRadius(4);
          }.bind(this),
          progress: function() {
            var step = (animation.step - Math.floor(animation.step));
            if (step === 1 || step === 5) {
              step *= 0.4;
            } else {
              step *= 0.8;
            }
            if (step % 2 !== 0) {
              step = 1 - step;
            }
            this.marker.setRadius(4 + (30 * step));
          }.bind(this),
          complete: function() {
            this.marker.setRadius(4);
          }.bind(this)
        });
  };

  var OpenStreetMapPolyline = function(map, data) {
    this.map = map;
    this.polyline = L.polyline(data.path, {
      color: data.color,
      opacity: 0.6,
      weight: 3
    });
    this.polyline.addTo(this.map.map);
  };

  OpenStreetMapPolyline.prototype.remove = function() {
    this.map.map.removeLayer(this.polyline);
  };

  OpenStreetMapPolyline.prototype.removePoint = function(index) {
    this.polyline.getLatLngs().removeAt(index);
  };

  OpenStreetMapPolyline.prototype.addPoint = function(lat, lon) {
    this.polyline.addLatLng(L.latLng(lat, lon));
  };

  OpenStreetMapPolyline.prototype.highlight = function() {
    // Highlight object
      var animation = {step: 0};
      $(animation).animate(
          { step: 2 },
          {
            duration: 1000,
            easing: 'linear',
            start: function() {
              this.polyline.setStyle({ opacity: 0.6 });
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
                this.polyline.setStyle({opacity:step});
              }
            }.bind(this),
            complete: function() {
              this.polyline.setStyle({ opacity:0.6 });
            }.bind(this)
          });
  };

  OpenStreetMapPolyline.prototype.zoomTo = function() {
    this.map.map.fitBounds(this.polyline.getBounds());
  };

  return OpenStreetMap;
}
);