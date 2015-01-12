var fs = require('fs');
var firebaseCollection = require('./firebaseCollection');

var enventHandler = function(e) {
  // Write output to console
  console.log(JSON.stringify(e));
};

firebaseCollection
  .createObserver('https://publicdata-transit.firebaseio.com', 'sf-muni/vehicles')
  .listen(enventHandler);
