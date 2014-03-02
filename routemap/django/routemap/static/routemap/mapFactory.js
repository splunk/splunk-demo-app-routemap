define(
['./openStreetMap', './googleMap'], 
function(OpenStreetMap, GoogleMap) {
  'use strict';

  return function(div, type) {
    if (type === 'googlemap') {
      return new GoogleMap(div);
    } else if (type === 'openstreetmap') {
      return new OpenStreetMap(div);
    } else {
      throw new Error('Unsupported type');
    }
  };
});