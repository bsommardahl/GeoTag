var q = require('q');
var moment = require('moment');
var eventer = require("../eventer");
var dc = require("../dataContext");
var socketStore = require("../socketStore");
var linq = require("../linq");

exports.GetPlayersInRadius = function(playerId, x, y, radius, unitOfMeasurement) {

	var def = q.defer();

	//query that filters this device's locations and only gives the most recent location
	//also that only returns the locations that are within X mile radius
	//also that only returns recently updated locations

	var radiusOfEarth = 6378100;
	if (unitOfMeasurement && unitOfMeasurement == "miles") {
		radiusOfEarth = 3963.1676;
	}
	var convertedRadius = parseFloat(radius) / radiusOfEarth;

	var query = {

		// LastLocationUpdated : {
		// $gt : moment().subtract("minutes", 1)._d
		// },

		_id : {
			$ne : dc.GetId(playerId.toString())
		},

		LastLocation : {
			$within : {
				$centerSphere : [[x, y], convertedRadius]
			}
		}
	}; 
	
	dc.Collection.Players().then(function(coll) {
		coll.ensureIndex({
			LastLocation : "2d"
		}, function(err, indexName) {
			coll.find(query, function(err, cursor) {
				if (err)
					console.log("!!! ERROR: " + err);
				cursor.sort({
					Created : 1
				}).toArray(function(err, items) {
					def.resolve(items);
				});
			});
		});
	});
	return def.promise;
};