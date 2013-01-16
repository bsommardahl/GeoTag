var q = require('q');
var moment = require('moment');
var eventer = require("../eventer");
var dc = require("../dataContext");
var socketStore = require("../socketStore");
var linq = require("../linq");
var range = require("./range");
var players = require("./players");

var getPlayersInVisionRange = function(playerId, x, y) {
	//should get player here and read out his vision range value
	var rangeInMeters = 2000;
	return range.GetPlayersInRadius(playerId, x, y, rangeInMeters, "meters");
};

exports.GetPlayersInVisionRange = getPlayersInVisionRange;

exports.Init = function(socket) {
	socket.on('getNearbyPlayers', function(playerId) {
		players.Get(playerId).then(function(player) {
			getPlayersInVisionRange(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(nearbyPlayers) {
				socket.emit("nearbyPlayers", nearbyPlayers);
			});
		});
	});
};

var notifyThatPlayerLeftRange = function(change) {
	console.log(change);
	var affectedSockets = socketStore.Get(function(s) {
		return s.PlayerId == change.PlayerId;
	});
	console.log("### EMITTING playerLeftRange EVENT to " + affectedSockets.length + " players.");
	linq.Each(affectedSockets, function(playerSocket) {
		console.log("### EMITTING playerLeftRange EVENT to: " + JSON.stringify(change.PlayerId));
		playerSocket.Socket.emit("playerLeftRange", change);
		console.log("### DONE.");
	});
};

var notifyThatPlayerIsInRange = function(change) {
	console.log(change);
	var affectedSockets = socketStore.Get(function(s) {
		return s.PlayerId == change.PlayerId;
	});
	console.log("### EMITTING newPlayerInRange EVENT to " + affectedSockets.length + " players.");
	linq.Each(affectedSockets, function(playerSocket) {
		console.log("### EMITTING newPlayerInRange EVENT to: " + JSON.stringify(change.PlayerId));
		playerSocket.Socket.emit("newPlayerInRange", change);
		console.log("### DONE.");
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

			for (var playerId in oldIds) {
				if (!newIds[playerId]) {
					//player exists in old, but not in new. player left old circle. notify
					notifyThatPlayerLeftRange({
						PlayerId : playerId,
						PlayerThatLeftRange : player
					});
				}
			}
		});
	});
};

eventer.on("notifyPlayerLeavingRange", function(action) {
	sayGoodbyeToPlayersOutOfRange(action.Player, action.NewLocation, action.OldLocation);
});

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

			for (var playerId in newIds) {
				if (!oldIds[playerId]) {
					//player exists in new, but not in old. player joined new circle. notify
					notifyThatPlayerIsInRange({
						PlayerId : playerId,
						PlayerThatCameIntoRange : player,
						NewPosition : newLoc
					});
				}
			}
		});
	});
};

eventer.on("notifyPlayerEnteringRange", function(action) {
	sayHelloToPlayersNowInRange(action.Player, action.NewLocation, action.OldLocation);
});
