var q = require('q');
var moment = require('moment');
var players = require("./players");
var eventer = require("../eventer");
var dc = require("../dataContext");
var socketStore = require("../socketStore");
var linq = require("../linq");
var vision = require("./vision");

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

var create = function(location) {

	return players.Get(location.PlayerId).then(function(player) {

		//insert a logging record for the position change
		insertNewLocation(location);

		var newLocation = location;

		var oldLocation;
		if (player.LastLocation) {
			oldLocation = new Location(player._id, player.LastLocation[0], player.LastLocation[1]);
		} else {
			oldLocation = new Location(player._id, 0, 0);
		}

		updateThisPlayersLastLocation(newLocation).then(function() {

			var payload = {
				Player : player,
				NewLocation : newLocation,
				OldLocation : oldLocation
			};
			eventer.emit("notifyPlayerLeavingRange", payload);
			eventer.emit("notifyPlayerEnteringRange", payload);

		});

	});
};

exports.Init = function(socket, allSockets) {
	socket.on('updateLocation', function(newLocation) {
		create(new Location(newLocation.PlayerId, newLocation.X, newLocation.Y));
	});
};

eventer.on("yourPositionChanged", function(player) {
	console.log("### RESPONDING TO DOMAIN EVENT yourPositionChanged.");
	var notifyPlayerThatHisPositionChanged = function(player) {
		//first, notify this user of the location change
		var playerSockets = socketStore.Get(function(s) {
			return s.PlayerId == player._id;
		});
		console.log("### EMITTING yourPositionChanged EVENT to " + playerSockets.length + " players. (id " + player._id + ")");
		linq.Each(playerSockets, function(playerSocket) {
			console.log("### EMITTING yourPositionChanged EVENT to: " + JSON.stringify(player.Name));
			playerSocket.Socket.emit("yourPositionChanged", player);
			console.log("### DONE.");
		});

	};
	notifyPlayerThatHisPositionChanged(player);
});

eventer.on("playerLocationChanged", function(player) {
	console.log("### RESPONDING TO DOMAIN EVENT playerLocationChanged.");
	var notifyAllOfPlayerPositionChange = function(player) {

		getNearbyPlayers(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(nearbyPlayers) {

			//notify the nearby players that the player's location changed
			linq.Each(nearbyPlayers, function(nearbyPlayer) {
				//get the socket for this player
				var socks = socketStore.Get(function(s) {
					return s.PlayerId == nearbyPlayer._id.toString();
				});
				console.log("### EMITTING playerpositionchanged EVENT to " + socks.length + " players.");

				linq.Each(socks, function(sock) {
					console.log("### EMITTING playerpositionchanged EVENT to: " + JSON.stringify(nearbyPlayer._id));
					sock.Socket.emit("playerpositionchanged", player);
					console.log("### DONE.");
				});

			});
		});
	};
	notifyAllOfPlayerPositionChange(player);
});

