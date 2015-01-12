define(
function(require, exports, module) {
'use strict';

var _ = require("underscore");
var mvc = require("splunkjs/mvc");
var SimpleSplunkView = require("splunkjs/mvc/simplesplunkview");
var MapObjectsView = require('./mapObjectsView');

/*
* Extract seconds from strings, like 'rtnow-30m'.
*/
var parseTimeWindow = function(searchProperty) {
    var matches = (/rt-(\d+)(m|h|d|w|mon|q|y)?/).exec(searchProperty);
    if (matches.length === 3) {
      var n = parseInt(matches[1]);
      
      var daysMultiplier;
      switch(matches[2]) {
        case 'y': // year
          daysMultiplier = 356;
          break;
        case 'q': // quarter 
          daysMultiplier = (356/4);
          break;
        case 'mon': // month
          daysMultiplier = 31;
          break;
        case 'w': // week
          daysMultiplier = 7;
          break;
      }

      switch(matches[2]) {
        case 'y': // year
        case 'q': // quarter 
        case 'mon': // month
        case 'w': // week
          n *= daysMultiplier;
          /* falls through */
        case 'd': // day
          n *= 24;
          /* falls through */
        case 'h': // hour
          n *= 60;
          /* falls through */
        case 'm': // minute
          n *= 60;
          /* falls through */
        default: // second (undefined)
          break;
      }

      return n;
    }

    return null;
};

var RouteMapView = SimpleSplunkView.extend({
    className: "view_name",

    // Set options for the visualization
    options: {
    },

    output_mode: 'json',

    initialize: function(options) {
        SimpleSplunkView.prototype.initialize.apply(this, arguments);

        this.on('managerid', this._onManagerIdChanged);
        this._onManagerIdChanged(options.managerid);
    },

    // Override this method to configure the view
    createView: function() {
        if (this.mapObjectsView) {
            this.mapObjectsView.viewModel.pause();
            this.mapObjectsView.viewModel.removeAllObjects();
            this.mapObjectsView.off();
            this.mapObjectsView = null;
        }

        this.mapObjectsView = new MapObjectsView({
            el: this.el,
            view_template_id: this.options.view_template_id,
            view_list_item_template_id: this.options.view_list_item_template_id,
            map_type: this.options.map_type
        }).render();

        var earliest_time = this.settings.get('earliest_time') || this.manager.get('earliest_time');
        var latest_time = this.settings.get('latest_time') || this.manager.get('latest_time');

        this.mapObjectsView.viewModel.realtime((/^rt(now)?$/).test(latest_time));
        if (this.mapObjectsView.viewModel.realtime()) {
            var timeWindow = parseTimeWindow(earliest_time);
            // In case of real-time we use Search time range as a time window 
            // for how long we want to keep data on client. But we always ask 
            // server only for new events with range -30 seconds.
            this.mapObjectsView.viewModel.timeWindow(timeWindow);
        } else {
            this.mapObjectsView.viewModel.timeWindow(null);
        }

        return this.mapObjectsView.$el;
    },

    // Override this method to format the data for the view
    formatData: function(data) {
        var dataPoints = [];

        for (var rIndex = 0; rIndex < data.length; rIndex++) {
            var result = data[rIndex];

            var point = { 
              ts: parseFloat(result.point__ts__), 
              lat: parseFloat(result.point__lat__), 
              lon: parseFloat(result.point__lon__),
            };
            delete result.point__ts__;
            delete result.point__lat__;
            delete result.point__lon__;

            var obj = {};

            _(result).keys().forEach(function(key) {
              if (key.indexOf('group__') === 0) {
                obj[key.substring('group__'.length)] = result[key];
                delete result[key];
              }
            });

            point.raw = result;

            dataPoints.push({
              obj: obj, 
              point: point
            });
        }

        return dataPoints;
    },

    // Override this method to put the formatted Splunk data into the view
    updateView: function(viz, data) {
        this.mapObjectsView.renderPoints(data);
    },

    _onManagerIdChanged: function(managerid, oldmanagerid) {
        this.stopListening(mvc.Components, null, this._onManagerChanged);
        if (managerid) {
            this.listenTo(mvc.Components, 'change:' + managerid, this._onManagerChanged);
            var manager = mvc.Components.get(managerid);
            if (manager) {
                this._onManagerChanged(manager);
            }
        }
    },

    _onManagerChanged: function(manager) {
        this.manager = manager;
    }
});

return RouteMapView;
});