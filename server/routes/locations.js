var mongo = require('mongodb');
var q = require('q');
var moment = require('moment');

var Server = mongo.Server, Db = mongo.Db, BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {
	auto_reconnect : true
});
db = new Db('GeoTag', server, {
	safe : false
});

db.open(function(err, db) {
	if (!err) {
		db.collection('locations', {
			safe : true
		}, function(err, collection) {
			if (err) {//collection does not yet exist.
				//populate();
			}
		});
	}
});

var insertNewLocation = function(newLocation) {
	var def = q.defer();
	db.collection('locations', function(err, coll) {
		coll.insert(newLocation, {
			safe : true
		}, function(err, newDoc) {
			//console.log("### LOCATION INSERTED: " + JSON.stringify(newDoc));
			def.resolve(newDoc[0]);
		});
	});
	return def.promise;
};

var updateThisPlayersLastLocation = function(newLocation) {
	var def = q.defer();
	db.collection('players', function(err, coll) {

		var playerIdObj = new BSON.ObjectID(newLocation.PlayerId);

		coll.update({
			_id : playerIdObj
		}, {
			$set : {
				LastLocation : [newLocation.X, newLocation.Y],
				LastLocationUpdated : moment()._d
			}
		}, {
			safe : true
		}, function(err, newDoc) {
			if (!err) {
				var players = require("./players");
				players.Get(newLocation.PlayerId).then(function(player) {
					def.resolve(player);
					var ee = require("../eventer");
					//console.log("### EMITTING DOMAIN EVENT playerLocationChanged.");										
					ee.emit("playerLocationChanged", player);
				});
			}
		});
	});
	return def.promise;
};

exports.Create = function(newLocation) {
	var newItem = newLocation;
	newItem.Created = moment()._d;
	
	//clean up the json obj
	newItem.X = parseFloat(newItem.X);
	newItem.Y = parseFloat(newItem.Y);

	insertNewLocation(newItem).then(updateThisPlayersLastLocation).then(function(playerLocations) {
		// var data = {
		// Status : "Ok",
		// Players : playerLocations
		// };
		// console.log("### Returning response:");
		// console.log(data);
		//
		// res.writeHead(200, {
		// "Content-Type" : "application/json",
		// "Access-Control-Allow-Origin" : "*"
		// });
		//
		// res.end(JSON.stringify(data));

	});
};
