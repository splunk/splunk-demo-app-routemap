define(
  'mapObjectsPageController', 
  [
    'underscore',
    'mapObjectsView',
    'splunkjs/mvc/searchbarview',
    'splunkjs/mvc/searchcontrolsview',
    'splunkjs/mvc/searchmanager'
  ], 
  function(
    _, 
    MapObjectsView,
    SearchBarView,
    SearchControlsView,
    SearchManager) {

  'use strict'

  var PageController = function() {

    this.mapObjectsView = new MapObjectsView();

    this.searchManager = new SearchManager({
      id: 'appSearchManager',
      app: 'routemap',
      preview: true,
      required_field_list: '*',
      status_buckets: 300,
      search: 'source=firebase | `normalize(ts=ts, lat=lat, lon=lon, field1=routeTag, field2=id)`'
    });

    this.searchPanel = $('#searchPanel');

    // Instantiate the views and search manager
    this.searchBarView = new SearchBarView({
      managerid: this.searchManager.id,
      el: this.searchPanel.append('div')
    }).render();

    // Update the search manager when the query in the searchbar changes
    this.searchBarView.on('change', function() {
      this.searchManager.set('search', this.searchBarView.val());
    }.bind(this));

    // Update the search manager when the timerange in the searchbar changes
    this.searchBarView.timerange.on('change', function(timerange) {
      this.mapObjectsView.viewModel.realtime(timerange.latest_time === 'rt');
      this.searchManager.search.set(this.searchBarView.timerange.val());
    }.bind(this));

    this.view = new SearchControlsView({
      managerid: this.searchManager.id,
      el: this.searchPanel.append('div')
    }).render();

    this.pageProgress = $('#routes-map-progress');
    this.pageProgress.hide();

    this.searchManager.on('search:progress', function() {
      this.pageProgress.toggle();
    }.bind(this));

    this.searchManager.on('search:start', function() {
      this.mapObjectsView.viewModel.pause();
      this.mapObjectsView.viewModel.removeAllObjects();
    }.bind(this));

    // Connect to search
    var routesData = this.searchManager.data('results', {count: 0, output_mode: 'json'});
    routesData.on('data', function() {
      if (!routesData.hasData()) {
        return;
      }

      this.pageProgress.show();
      
      var results = routesData.data().results;
      for (var rIndex = 0; rIndex < results.length; rIndex++) {
        var result = results[rIndex];

        if (result.data) {
          var data = result.data.split(';');
          var point = { ts: parseFloat(data[0]), lat: parseFloat(data[1]), lon: parseFloat(data[2]) };
          delete result['data'];
          this.mapObjectsView.viewModel.addData(result, point);
        }
      }
      
      this.mapObjectsView.viewModel.autoZoom();
      this.mapObjectsView.viewModel.play();

      this.pageProgress.hide();
    }.bind(this));
  };

  return PageController;

});