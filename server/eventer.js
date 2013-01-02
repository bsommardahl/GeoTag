// var events = require('events');
// var emitter = new events.EventEmitter();
// 
// exports.OnTag = function(tag) {
	// emitter.emit("tag", tag);
// };
// 
// exports.OnLocationChange = function(newPlayerLocation) {
	// emitter.emit("locationChange", newPlayerLocation);
// };
// 
// exports.On = function(type, callback) {
	// emitter.on(type, callback);
// };
// 

// emitter.js
var EventEmitter = require('events').EventEmitter;
module.exports = new EventEmitter;
