define(
function(require, exports, module) {
'use strict';

  /*
   * Generate title string from object's fields. 
   * @param obj - object.
   * 
   * For example if your obj is { a: '1', b: '2' } this 
   * method will generate P
   */ 
  exports.generateString = function(obj) {
    var title = '';

    if (obj) {  
      for (var field in obj) {
        if (obj.hasOwnProperty(field) && field.indexOf('_') !== 0) {
          if (title !== '') {
            title += ', ';
          }
          title += field + ': ' + obj[field];
        }
      }
    } 

    return title;
  };

});