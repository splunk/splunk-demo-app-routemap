define(
  ['underscore', 'backbone', './mapObjectsViewModel', './mapFactory', './utils'], 
  function(_, Backbone, MapObjectsViewModel, mapFactory, utils) {

  'use strict';

  /*
  * Routes map view
  */
  var MapObjectsView = Backbone.View.extend({
    events: {
      'change *[name=input-speed-value]': 'userChangeSpeed',
      'change *[name=input-refreshRate-value]': 'userChangeRefreshRate',
      'change *[name=input-time]': 'userChangeTime',
      'click *[name=button-play]': 'userPlay',
      'click *[name=button-pause]': 'userPause',
      'click *[name=button-autozoom]': 'userAutoZoom',
      'click *[name=map-objects-header] input[name=checkbox-all-objects]': 'userToggleAllObjects',
      'click *[name=map-objects-header] input[name=checkbox-all-routes]': 'userToggleAllRoutes',
      'click *[name=map-objects-header] input[name=checkbox-autohide]': 'userToggleAutoHide'
    },

    initialize: function(options) {
      this.options = _.extend(this.options || {}, options);
      Backbone.View.prototype.initialize.apply(this, arguments);
    },

    render: function() {

      if (!this.template) {
        this.template = _.template($(this.options.view_template_id).html())
      }

      this.$el.html(this.template(this));

      var mapElementId = _.uniqueId('routemap_map_');
      this.$('*[name=map]').attr('id', mapElementId);

      this.viewModel = new MapObjectsViewModel({
        map: mapFactory(mapElementId, this.options.map_type || 'googlemap')
      });

      this.buttonPlay = this.$('*[name=button-play]');
      this.buttonPause = this.$('*[name=button-pause]');
      this.spanSpeedValue = this.$('*[name=span-speed-value]');
      this.inputSpeedValue = this.$('*[name=input-speed-value]');
      this.spanRefreshRateValue = this.$('*[name=span-refreshRate-value]');
      this.inputRefreshRateValue = this.$('*[name=input-refreshRate-value]');
      this.labelBeginTime = this.$('*[name=bar-time-ranges] div:first-child > span');
      this.labelCurrentTime = this.$('span[name=routes-currenttime]');
      this.labelEndTime = this.$('*[name=bar-time-ranges] div:last-child > span');
      this.inputTime = this.$('*[name=input-time]');
      this.objectsListView = this.$('*[name=map-objects-list]');
      this.checkboxAllObjects = this.$('*[name=map-objects-header] input[name=checkbox-all-objects]');
      this.checkboxAllRoutes = this.$('*[name=map-objects-header] input[name=checkbox-all-routes]');
      this.autoHideRoutes = this.$('*[name=map-objects-header] input[name=checkbox-autohide]');

      this.objectsList = {};

      // Connect view to view-model
      this.viewModel
        .on('change:currentTime', function() {
          this.labelCurrentTime.text(
            this.viewModel.has('currentTime') ? (new Date(this.viewModel.currentTime() * 1000)).toLocaleString() : '');
          this.inputTime.prop('disabled', !this.viewModel.has('currentTime') || this.viewModel.realtime());
          this.inputTime.val(this.viewModel.currentTime());
        }.bind(this))
        .on('change:beginTime', function() {
          if (this.viewModel.has('beginTime')) {
            this.inputTime.prop('min', this.viewModel.get('beginTime'));
            this.labelBeginTime.text((new Date(this.viewModel.beginTime() * 1000)).toLocaleString());
          } else {
            this.labelBeginTime.text('');
          }
        }.bind(this))
        .on('change:endTime', function() {
          if (this.viewModel.has('endTime')) {
            this.inputTime.prop('max', this.viewModel.endTime());
            this.labelEndTime.text((new Date(this.viewModel.endTime() * 1000)).toLocaleString());
          } else {
            this.labelEndTime.text('');
          }
        }.bind(this))
        .on('change:speed', function() {
          if (this.viewModel.has('speed')) {
            var currentSpeed = this.viewModel.speed();
            this.spanSpeedValue.text(currentSpeed);
            this.inputSpeedValue.val(currentSpeed);
            this.inputSpeedValue.prop('disabled', false);
          } else {
            this.spanSpeedValue.text('');
            this.inputSpeedValue.prop('disabled', true);
          }
        }.bind(this))
        .on('change:refreshRate', function() {
          if (this.viewModel.has('refreshRate')) {
            var currentRefreshRate = this.viewModel.refreshRate();
            this.spanRefreshRateValue.text(currentRefreshRate);
            this.inputRefreshRateValue.val(currentRefreshRate);
            this.inputRefreshRateValue.prop('disabled', false);
          } else {
            this.spanRefreshRateValue.text('');
            this.inputRefreshRateValue.prop('disabled', true);
          }
        }.bind(this))
        .on('change:playInterval change:currentTime change:realtime', function() {
          var isPlaying = this.viewModel.has('playInterval');
          var realtime = this.viewModel.realtime();
          this.buttonPlay.prop('disabled', (!this.viewModel.has('currentTime') || isPlaying) || realtime);
          this.buttonPause.prop('disabled', (!isPlaying) || realtime);
        }.bind(this))
        .on('change:realtime', function() {
          var realtime = this.viewModel.realtime();
          
          if (realtime) {
            this.inputSpeedValue.parent().hide();
            this.inputRefreshRateValue.parent().hide();
          } else {
            this.inputSpeedValue.parent().show();
            this.inputRefreshRateValue.parent().show();
          }

          this.buttonPlay.prop('disabled', realtime);
          this.buttonPause.prop('disabled', realtime);
          this.inputTime.prop('disabled', realtime);
        }.bind(this))
        .trigger('change:currentTime change:beginTime change:endTime change:speed change:refreshRate change:playInterval change:realtime');

        this.listenTo(this.viewModel.collection, 'add', function(model) {
          var lvItem = this.objectsList[model.modelId()] = new MapObjectListViewItem({ 
            model: model,
            view_list_item_template_id: this.options.view_list_item_template_id
          });
          this.objectsListView.append(lvItem.render().el);
        }.bind(this));

        this.listenTo(this.viewModel.collection, 'reset', function() {
          this.objectsListView.empty();
          this.objectsList = {};
        }.bind(this));

        this.listenTo(this.viewModel.collection, 'remove', function(model) {
          var id = model.modelId();
          var lvItem = this.objectsList[id];
          if (lvItem) {
            lvItem.$el.remove();
            delete this.objectsList[id];
          }
        }.bind(this));

        this.viewModel.collection
          .on('change:showAllObjects', function(model, showAllObjects) {
            this.checkboxAllObjects.prop('checked', showAllObjects);
          }.bind(this))
          .on('change:showAllRoutes', function(model, showAllRoutes) {
            this.checkboxAllRoutes.prop('checked', showAllRoutes);
          }.bind(this));

      return this;
    },

    // Event handlers
    userChangeSpeed: function() {
      var isPlaying = this.viewModel.playbackMode();
      if (isPlaying) this.viewModel.pause();
      this.viewModel.speed(parseFloat(this.inputSpeedValue.val()));
      if (isPlaying) this.viewModel.play();
    },

    userChangeRefreshRate: function() {
      var isPlaying = this.viewModel.playbackMode();
      if (isPlaying) this.viewModel.pause();
      this.viewModel.refreshRate(parseFloat(this.inputRefreshRateValue.val()));
      if (isPlaying) this.viewModel.play();
    },

    userChangeTime: function() {
      this.viewModel.pause();
      this.viewModel.currentTime(parseFloat(this.inputTime.val()));
    },

    userPlay: function() {
      this.viewModel.play();
    },

    userPause: function() {
      this.viewModel.pause();
    },

    userAutoZoom: function() {
      this.viewModel.autoZoom();
    },

    userToggleAllRoutes: function() {
      var value = this.checkboxAllRoutes.prop('checked');
      this.viewModel.collection.showAllRoutes(value);
    },

    userToggleAllObjects: function() {
      this.viewModel.pause();
      var value = this.checkboxAllObjects.prop('checked');
      this.viewModel.collection.showAllObjects(value);
    },

    userToggleAutoHide: function() {
      this.viewModel.pause();
      var value = this.autoHideRoutes.prop('checked');
      this.viewModel.collection.autoHideRoutes(value);
    },

    renderPoints: function(dataPoints) {
      var hasData = this.viewModel.has('currentTime');
      if (!hasData) {
        if (!this.viewModel.collection.showAllObjects()) {
          this.checkboxAllObjects.prop('checked', true);
          this.viewModel.collection.showAllObjects(true);
        }
        if (!this.viewModel.collection.showAllRoutes()) {
          this.checkboxAllRoutes.prop('checked', true);
          this.viewModel.collection.showAllRoutes(true);
        }
      }

      this.viewModel.addDataPoints(dataPoints);
      
      if (!hasData) {
        this.viewModel.autoZoom();
      }

      this._sortObjectsList();

      this.viewModel.play();
    },

    _sortObjectsList: function() {
        // Get all list view items
        var lvItems = _.values(this.objectsList);
        // Detach all ui elements from list
        _.each(lvItems, function(lvItem){
          lvItem.$el.detach();
        });
        // Sort them by title
        lvItems = _.sortBy(lvItems, function(lvItem) {
          return lvItem.model.get('title');
        });
        // Append items again
        _.each(lvItems, function(lvItem) {
          this.objectsListView.append(lvItem.el);
        }.bind(this));
      }
  });

  var MapObjectListViewItem = Backbone.View.extend({
    
    tagName: 'li',

    events: {
      'click input[type=checkbox]:first': 'toggleShowObject',
      'click input[type=checkbox]:last': 'toggleShowRoute',
      'click a.colorBlock': 'highlightObject'
    },

    initialize: function(options) {
      this.options = _.extend(this.options || {}, options);

      this.model
        .on('change:showRoute', function(model, showRoute) {
            this.$('input[type=checkbox]:last').prop('checked', showRoute);
          }.bind(this))
        .on('change:showObject', function(model, showObject) {
            this.$('input[type=checkbox]:first').prop('checked', showObject);
          }.bind(this))
        .on('change:raw', function(model, raw) {
            var raw_text = raw ? utils.generateString(raw) : 'Not visible';
            this.$('*[name=panel-raw-data]').html(raw_text);
        }.bind(this)).trigger('change:raw');

      Backbone.View.prototype.initialize.apply(this, arguments);
    },

    render: function() {
      if (!this.template) {
        this.template = _.template($(this.options.view_list_item_template_id).html())
      }

      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    toggleShowObject: function() {
      this.model.toggleShowObject();
    },

    toggleShowRoute: function() {
      this.model.toggleShowRoute();
    },

    highlightObject: function() {
      this.model.highlightObject();
    }
  });

  // Require export (create new travel system)
  return MapObjectsView;
});

