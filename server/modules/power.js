var q = require('q');
var moment = require('moment');
var eventer = require("../eventer");
var dc = require("../dataContext");
var socketStore = require("../socketStore");
var linq = require("../linq");
var range = require("./range");

exports.GetPlayersInPowerRange = function(playerId, x, y) {
	//should get player here and read out his power range value
	var rangeInMeters = 50; 
	return range.GetPlayersInRadius(playerId, x, y, rangeInMeters, "meters");
}; 

exports.Init = function(socket) {
	
};