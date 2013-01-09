var q = require('q');
var moment = require('moment');
var players = require("./players");
var eventer = require("../eventer");
var dc = require("../dataContext");
var linq = require("../linq");

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
	var def = q.defer();
	dc.Collection.Players().then(function(coll) {
		var playerIdObj = dc.GetId(newLocation.PlayerId);
		
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
			console.log("### PLAYER LAST LOCATION UPDATED");
			if (!err) {
				players.Get(newLocation.PlayerId).then(function(player) {
					console.log("### EMITTING DOMAIN EVENT yourPositionChanged.");
					eventer.emit("yourPositionChanged", player);
					def.resolve(player);
				});
			}
		});
	});
	return def.promise;
};

var notifyOtherPlayersIfAffected = function(newLocation) {
	var def = q.defer();
	players.Get(newLocation.PlayerId).then(function(player) {
		console.log("### NOTIFYING other players of the position change");

		if (!player.LastLocation) {
			console.log("-- skipping notification of other players because the player doesn't have a 'last location'.");
			def.resolve(newLocation);
		} else {
			//got both old and new. need to compare them					
			players.GetNearbyPlayers(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(oldCircle) {
				players.GetNearbyPlayers(player._id, newLocation.X, newLocation.Y).then(function(newCircle) {
					console.log("### GOT NEARBY for old locations and new - (" + oldCircle.length + ", " + newCircle.length + ")");
					var oldIds = {};
					linq.Each(oldCircle, function(p) {
						oldIds[p._id.toString()] = p._id.toString();
					});

					var newIds = {};
					linq.Each(newCircle, function(p) {
						newIds[p._id.toString()] = p._id.toString();
					});

					var notifyThatPlayerIsntNearby = [];
					for (var i in oldIds) {
						if (!newIds[i]) {
							//player exists in old, but not in new. player left old circle. notify
							notifyThatPlayerIsntNearby.push(i);
						}
					}

					var notifyThatThereIsANewPlayerNearby = [];
					for (var i in newIds) {
						if (!oldIds[i]) {
							//player exists in new, but not in old. player joined new circle. notify
							notifyThatThereIsANewPlayerNearby.push(i);
						}
					}

					linq.Each(notifyThatPlayerIsntNearby, function(playerId) {
						console.log("### NOTIFYING playerLeftRange")
						eventer.emit("playerLeftRange", {
							PlayerId : playerId,
							PlayerThatLeftRange : player
						});
					});

					linq.Each(notifyThatThereIsANewPlayerNearby, function(playerId) {
						console.log("### NOTIFYING newPlayerInRange")
						eventer.emit("newPlayerInRange", {
							PlayerId : playerId,
							PlayerThatCameIntoRange : player
						});
					});
				});
			});
			def.resolve(newLocation);
		}
	});
	return def.promise;
};

var create = function(newLocation) {
	var newItem = newLocation;
	newItem.Created = moment()._d;

	//clean up the json obj
	newItem.X = parseFloat(newItem.X);
	newItem.Y = parseFloat(newItem.Y);

	//insert a logging record for the position change
	return insertNewLocation(newItem)
	//should check for nearby players and notify them if I have left their radius after the position change
	.then(notifyOtherPlayersIfAffected)
	//then, update the players last location
	.then(updateThisPlayersLastLocation);
};

exports.Init = function(socket, allSockets) {
	socket.on('updateLocation', function(newLocation) {
		console.log("### UPDATING LOCATION: " + JSON.stringify(newLocation));
		create(newLocation);
	});
};
