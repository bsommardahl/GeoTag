var q = require('q');
var moment = require('moment');
var players = require("./players");
var eventer = require("../eventer");
var dc = require("../dataContext");
var linq = require("../linq");

var Location = function(playerId, x, y) {

	var created = moment()._d;

	x = parseFloat(x);
	y = parseFloat(y);
	playerId = dc.GetId(playerId.toString());

	console.log("@@ Created Location object for " + playerId + " at " + x + ", " + y);

	return {
		PlayerId : playerId,
		Coords : [x, y],
		X : x,
		Y : y,
		Created : created
	};
};

var insertNewLocation = function(newLocation) {
	var def = q.defer();
	dc.Collection.Locations().then(function(coll) {
		coll.insert(newLocation, {
			safe : true
		}, function(err, newDoc) {
			console.log("### LOCATION INSERTED: " + JSON.stringify(newDoc));
			def.resolve(newDoc[0]);
		});
	});
	return def.promise;
};

var updateThisPlayersLastLocation = function(newLocation) {

	console.log("### UPDATING PLAYER LOCATION, last location, that is.");
	console.log("newLocation:" + JSON.stringify(newLocation));

	var def = q.defer();
	dc.Collection.Players().then(function(coll) {

		coll.update({
			_id : newLocation.PlayerId
		}, {
			$set : {
				LastLocation : newLocation.Coords,
				LastLocationUpdated : newLocation.Created
			}
		}, {
			safe : true
		}, function(err, newDoc) {
			if (err) {
				console.log("!!! ERROR in updateThisPlayersLastLocation(): " + err);
			}
			console.log("### PLAYER LAST LOCATION UPDATED");
			if (!err) {
				players.Get(newLocation.PlayerId).then(function(player) {
					console.log("### EMITTING DOMAIN EVENT yourPositionChanged.");
					eventer.emit("yourPositionChanged", player);
					eventer.emit("playerLocationChanged", player);
					def.resolve();
				});
			}
		});
	});
	return def.promise;
};

var sayHelloToPlayersNowInRange = function(player, newLoc, oldLoc) {

	//got both old and new. need to compare them
	players.GetNearbyPlayers(player._id, oldLoc.X, oldLoc.Y).then(function(oldCircle) {

		//console.log("### GOT NEARBY PLAYERS for old locations - " + oldCircle.length);

		players.GetNearbyPlayers(player._id, newLoc.X, newLoc.Y).then(function(newCircle) {

			// console.log("### GOT NEARBY PLAYERS for new locations - " + newCircle.length);

			var oldIds = {};
			linq.Each(oldCircle, function(p) {
				oldIds[p._id.toString()] = p._id.toString();
			});			

			var newIds = {};
			linq.Each(newCircle, function(p) {
				newIds[p._id.toString()] = p._id.toString();
			});

			var playerCameInToRange = function(playerId) {				
				eventer.emit("newPlayerInRange", {
					PlayerId : playerId,
					PlayerThatCameIntoRange : player,
					NewPosition : newLoc
				});
			};

			for (var playerId in newIds) {
				if (!oldIds[playerId]) {
					//player exists in new, but not in old. player joined new circle. notify
					playerCameInToRange(playerId);
				}
			}
		});
	});
};
var sayGoodbyeToPlayersOutOfRange = function(player, newLoc, oldLoc) {
	//got both old and new. need to compare them
		players.GetNearbyPlayers(player._id, oldLoc.X, oldLoc.Y).then(function(oldCircle) {

		//console.log("### GOT NEARBY PLAYERS for old locations - " + oldCircle.length);

		players.GetNearbyPlayers(player._id, newLoc.X, newLoc.Y).then(function(newCircle) {

			// console.log("### GOT NEARBY PLAYERS for new locations - " + newCircle.length);

			var oldIds = {};
			linq.Each(oldCircle, function(p) {
				oldIds[p._id.toString()] = p._id.toString();
			});

			var newIds = {};
			linq.Each(newCircle, function(p) {
				newIds[p._id.toString()] = p._id.toString();
			});

			var playerLeftRange = function(playerId) {
				console.log("### NOTIFYING playerLeftRange")
				eventer.emit("playerLeftRange", {
					PlayerId : playerId,
					PlayerThatLeftRange : player
				});
			};

			for (var playerId in oldIds) {
				if (!newIds[playerId]) {
					//player exists in old, but not in new. player left old circle. notify
					playerLeftRange(playerId);
				}
			}
		});
	});
};

var notifyPlayersWherePlayerIsEnteringRange = function(player, newLocation, oldLocation) {
	var def = q.defer();
	console.log("### notifyPlayersWherePlayerIsEnteringRange");
	console.log("oldLocation:" + JSON.stringify(oldLocation));

	if (!player.LastLocation) {
		console.log("-- skipping notification of other players because the player doesn't have a 'last location'.");
		def.resolve(newLocation);
	} else {
		sayHelloToPlayersNowInRange(player, newLocation, oldLocation);
		def.resolve();
	}
	return def.promise;
};

var notifyPlayersWherePlayerIsLeavingRange = function(player, newLocation, oldLocation) {
	var def = q.defer();
	console.log("### notifyPlayersWherePlayerIsLeavingRange");

	if (!player.LastLocation) {
		console.log("-- skipping notification of other players because the player doesn't have a 'last location'.");
		def.resolve(newLocation);
	} else {
		sayGoodbyeToPlayersOutOfRange(player, newLocation, oldLocation);
		console.log("lastLocation: " + JSON.stringify(oldLocation));
		def.resolve();
	}
	return def.promise;
};

var create = function(location) {

	return players.Get(location.PlayerId).then(function(player) {

		//insert a logging record for the position change
		insertNewLocation(location);

		var newLocation = location;
		var oldLocation = new Location(player._id, player.LastLocation[0], player.LastLocation[1]);

		//should check for nearby players and notify them if I have left their radius after the position change
		notifyPlayersWherePlayerIsLeavingRange(player, newLocation, oldLocation)
		//then, update the players last location
		.then(function() {
			//console.log("### 2");
			return updateThisPlayersLastLocation(newLocation);
		})
		//then, check for nearby players and notify them if I have entered their radius after the position change
		.then(function() {
			//console.log("### 3");
			return notifyPlayersWherePlayerIsEnteringRange(player, newLocation, oldLocation);
		});

	});

};

exports.Init = function(socket, allSockets) {
	socket.on('updateLocation', function(newLocation) {
		create(new Location(newLocation.PlayerId, newLocation.X, newLocation.Y));
	});
};
