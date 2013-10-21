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
    this.searchBarView.timerange.on('change', function() {
        this.searchManager.search.set(this.searchBarView.timerange.val());
    });

    this.view = new SearchControlsView({
        managerid: this.searchManager.id,
        el: this.searchPanel.append('div')
    }).render();

    this.mapObjectsView = new MapObjectsView();

    // Connect to search
    var routesData = this.searchManager.data('results', {count: 0, output_mode: 'json'});
    routesData.on('data', function() {
        console.log('got new data');

        if (!routesData.hasData()) {
            return;
        }

        if (this.mapObjectsView) {
            this.mapObjectsView.viewModel.pause();
            this.mapObjectsView.viewModel.removeAllObjects();
        } 
        
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
    }.bind(this));
  };

  return PageController;

});