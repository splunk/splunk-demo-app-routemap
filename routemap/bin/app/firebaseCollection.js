var firebase = require('firebase');

/*
* Firebase collection observer.
*/
var CollectionObserver = function(path) {

  // Fields

  this.collection = new firebase(path);
  this.listeners = {};
  this.handler = null;

  // Private methods

  /*
  * Element value change handler.
  */
  var valueChangeHandler = function(snapshot) {
    if (this.handler) {
      var data = snapshot.val();
      if (data) {
        this.handler(data);
      }
    }
  }.bind(this);

  /*
  * Turn off handler for element.
  */
  var turnOffValueListener = function (elementName){
    if (this.listeners[elementName]) {
      this.collection.child(elementName).off('value', valueChangeHandler);
      delete this.listeners[elementName];
    }
  }.bind(this);

  /*
  * New element added to collection.
  */
  var childAdded = function(snapshot) {
    var elementName = snapshot.name();
    this.listeners[elementName] = elementName;
    this.collection.child(elementName).on('value', valueChangeHandler);
  }.bind(this);

  /*
  * Element removed from collection.
  */
  var childRemoved = function(snapshot) {
    turnOffValueListener(snapshot.name());
  }.bind(this);

  // Public methods

  /*
  * Turn off all listeners.
  */
  this.shutdown = function() {
    for (var listener in this.listeners) {
      if (this.listeners.hasOwnProperty(listener)) {
        turnOffValueListener(listener);
      }
    }

    this.collection.off('child_added', childAdded);
    this.collection.off('child_removed', childRemoved);
  }.bind(this);

  this.listen = function(handler) {
    this.handler = handler;
    this.collection.on('child_added', childAdded);
    this.collection.on('child_removed', childRemoved);
  }.bind(this);
};

// Exports

exports.createObserver = function(path) {
  return new CollectionObserver(path);
};



