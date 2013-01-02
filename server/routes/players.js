var mongo = require('mongodb');
var q = require('q');
var moment = require('moment');
var ee = require("../eventer");

var Server = mongo.Server, Db = mongo.Db, BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {
	auto_reconnect : true
});
db = new Db('GeoTag', server, {
	safe : false
});

db.open(function(err, db) {
	if (!err) {
		db.collection('players', {
			safe : true
		}, function(err, collection) {
			if (err) {//collection does not yet exist.
				// console.log("Seeding players.");
				// collection.insert([{
				// Name : "Byron"
				// }, {
				// Name : "Colin"
				// }], {
				// safe : true
				// }, function() {
				// });
			}
		});
	}
});

var updateThisPlayersPoints = function(playerId, newPoints) {
	console.log("0");
	var def = q.defer();
	db.collection('players', function(err, coll) {

		var playerIdObj = new BSON.ObjectID(playerId.toString());

		coll.update({
			_id : playerIdObj
		}, {
			$set : {
				Points : newPoints,
				PointsUpdated : moment()._d
			}
		}, {
			safe : true
		}, function(err, newDoc) {
			console.log("2");

			if (!err) {
				var players = require("./players");
				players.Get(playerId).then(function(player) {
					console.log("### UPDATED PLAYER");
					console.log(player);
					def.resolve(player);
				});
			}
		});
	});
	return def.promise;
};

var get = function(playerId) {
	var def = q.defer();
	playerId = new BSON.ObjectID(playerId.toString());
	db.collection('players', function(err, coll) {
		coll.findOne({
			'_id' : playerId
		}, function(err, doc) {
			def.resolve(doc);
		});
	});
	return def.promise;
};

exports.GetByCreds = function(username, password) {
	console.log("### GETTING USER by creds: " + username + " " + password);
	var def = q.defer();
	db.collection('players', function(err, coll) {
		coll.findOne({
			'Name' : username,
			//'password' : password
		}, function(err, doc) {
			if(doc){
			console.log("### FOUND USER: ");
			console.log(doc);
			def.resolve(doc);
			}
			else{
				def.reject("User not found.");
			}
		});
	});
	return def.promise;
};

exports.GivePoints =function(pointIncrease) {
	console.log("### GETTING PLAYER");
	console.log(pointIncrease);
	//get player
	get(pointIncrease.PlayerId).then(function(player) {
		console.log("### GOT PLAYER");
		console.log(player);
		//update points
		var newPoints = parseInt(player.Points || 0) + parseInt(pointIncrease.Points);
		console.log("### UPDATING PLAYER POINTS to " + newPoints);
		updateThisPlayersPoints(player._id, newPoints).then(function(updatedPlayer) {
			console.log("### PLAYER POINTS UPDATED");
			//emit event
			ee.emit("pointsincreased", {
				PlayerId : updatedPlayer._id,
				OldPoints : updatedPlayer.Points,
				NewPoints : newPoints
			});
		});
	});
};

exports.TakeAwayPoints = function(pointReduction) {
	console.log("### GETTING PLAYER");
	console.log(pointReduction);
	//get player
	get(pointReduction.PlayerId).then(function(player) {
		console.log("### GOT PLAYER");
		console.log(player);
		//update points
		var newPoints = parseInt(player.Points || 0) - parseInt(pointReduction.Points);
		console.log("### UPDATING PLAYER POINTS to " + newPoints);
		updateThisPlayersPoints(player._id, newPoints).then(function(updatedPlayer) {
			console.log("### PLAYER POINTS UPDATED");
			//emit event
			ee.emit("pointsreduced", {
				PlayerId : updatedPlayer._id,
				OldPoints : updatedPlayer.Points,
				NewPoints : newPoints
			});
		});
	});
};

exports.Get = get;

exports.GetNearbyPlayers = function(playerId, x, y) {

	var def = q.defer();
	//query that filters this device's locations and only gives the most recent location
	//also that only returns the locations that are within X mile radius
	//also that only returns recently updated locations

	var distance = 1 / 3963.192;
	//10 miles

	var query = {
		// LastLocationUpdated : {
		// $gt : moment().subtract("minutes", 10)._d
		// },
		_id : {
			$ne : new BSON.ObjectID(playerId.toString())
		},
		// LastLocation : {
		// $near : [newLocation.X, newLocation.Y],
		// $maxDistance : 2
		// },
		LastLocation : {
			$within : {
				$centerSphere : [[x, y], distance]
			}
		}
	};

	db.collection('players', function(err, coll) {
		coll.ensureIndex({
			LastLocation : "2d"
		}, function(err, indexName) {
			coll.find(query, function(err, cursor) {
				cursor.sort({
					Created : 1
				}).toArray(function(err, items) {
					//console.log("### Got " + items.length + " nearby players.");
					def.resolve(items);
				});
			});

		});

	});
	return def.promise;
};

