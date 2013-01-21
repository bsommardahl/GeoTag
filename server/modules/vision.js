var q = require('q');
var moment = require('moment');
var eventer = require("../eventer");
var dc = require("../dataContext");
var socketStore = require("../socketStore");
var linq = require("../linq");
var range = require("./range");
var players = require("./players");
var locations = require("./locations");

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

var notifyThatPlayerAlreadyInRangeMoved = function(change){
	var affectedSockets = socketStore.Get(function(s) {
		return s.PlayerId == change.PlayerId;
	});
	console.log("### EMITTING playerAlreadyInRangeChangedPosition EVENT to " + affectedSockets.length + " players.");
	linq.Each(affectedSockets, function(playerSocket) {
		console.log("### EMITTING playerAlreadyInRangeChangedPosition EVENT to: " + JSON.stringify(change.PlayerId));
		playerSocket.Socket.emit("playerAlreadyInRangeChangedPosition", change);
		console.log("### DONE.");
	});
};

var notifyThatPlayerIsInRange = function(change) {
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

var sayGoodbyeToPlayersOutOfRange = function(playerThatMoved, newLoc, oldLoc) {
	//got both old and new. need to compare them
	getPlayersInVisionRange(playerThatMoved._id, oldLoc.X, oldLoc.Y).then(function(oldCircle) {

		//console.log("### GOT NEARBY PLAYERS for old locations - " + oldCircle.length);

		getPlayersInVisionRange(playerThatMoved._id, newLoc.X, newLoc.Y).then(function(newCircle) {

			// console.log("### GOT NEARBY PLAYERS for new locations - " + newCircle.length);

			var oldIds = {};
			linq.Each(oldCircle, function(p) {
				oldIds[p._id.toString()] = p;
			});

			var newIds = {};
			linq.Each(newCircle, function(p) {
				newIds[p._id.toString()] = p;
			});

			for (var otherPlayerId in oldIds) {
				if (!newIds[otherPlayerId]) {
					//player exists in old, but not in new. player left old circle. notify
					notifyThatPlayerLeftRange({
						PlayerId : otherPlayerId,
						PlayerThatLeftRange : playerThatMoved
					});

					//now need to notify the player that moved that he lost sight of someone
					var otherPlayer = oldIds[otherPlayerId];
					notifyThatPlayerLeftRange({
						PlayerId : playerThatMoved._id,
						PlayerThatLeftRange : otherPlayer
					});
				}
			}
		});
	});
};

eventer.on("notifyPlayerLeavingRange", function(action) {
	sayGoodbyeToPlayersOutOfRange(action.Player, action.NewLocation, action.OldLocation);
});

var sayHelloToPlayersNowInRange = function(playerThatMoved, newLoc, oldLoc) {

	//got both old and new. need to compare them
	getPlayersInVisionRange(playerThatMoved._id, oldLoc.X, oldLoc.Y).then(function(oldCircle) {

		//console.log("### GOT NEARBY PLAYERS for old locations - " + oldCircle.length);
		getPlayersInVisionRange(playerThatMoved._id, newLoc.X, newLoc.Y).then(function(newCircle) {

			// console.log("### GOT NEARBY PLAYERS for new locations - " + newCircle.length);

			var oldIds = {};
			linq.Each(oldCircle, function(p) {
				oldIds[p._id.toString()] = p;
			});

			var newIds = {};
			linq.Each(newCircle, function(p) {
				newIds[p._id.toString()] = p;
			});

			for (var otherPlayerId in newIds) {
				if (!oldIds[otherPlayerId]) {
					//player exists in new, but not in old. player joined new circle. notify
					notifyThatPlayerIsInRange({
						PlayerId : otherPlayerId,
						PlayerThatCameIntoRange : playerThatMoved,
						NewPosition : newLoc
					});

					//also need to notify the player that moved that he has a new friend
					var otherPlayer = newIds[otherPlayerId];
					var loc = locations.Location;
					var newPosition = new loc(otherPlayer._id, otherPlayer.LastLocation[0], otherPlayer.LastLocation[1]);
					notifyThatPlayerIsInRange({
						PlayerId : playerThatMoved._id,
						PlayerThatCameIntoRange : otherPlayer,
						NewPosition : newPosition,
					});
				}
			}
		});
	});
};

var sayHeyToPlayersAlreadyInRange = function(playerThatMoved, newLoc, oldLoc) {

	//got both old and new. need to compare them
	getPlayersInVisionRange(playerThatMoved._id, oldLoc.X, oldLoc.Y).then(function(oldCircle) {

		//console.log("### GOT NEARBY PLAYERS for old locations - " + oldCircle.length);
		getPlayersInVisionRange(playerThatMoved._id, newLoc.X, newLoc.Y).then(function(newCircle) {

			// console.log("### GOT NEARBY PLAYERS for new locations - " + newCircle.length);

			var oldIds = {};
			linq.Each(oldCircle, function(p) {
				oldIds[p._id.toString()] = p;
			});

			var newIds = {};
			linq.Each(newCircle, function(p) {
				newIds[p._id.toString()] = p;
			});

			for (var otherPlayerId in newIds) {
				if (oldIds[otherPlayerId]) {
					//player exists in new and in old. player already in circle moved. notify
					notifyThatPlayerAlreadyInRangeMoved({
						PlayerId : otherPlayerId,
						PlayerThatMoved : playerThatMoved,
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

eventer.on("notifyPlayerAlreadyInRangeChangedPosition", function(action){
	sayHeyToPlayersAlreadyInRange(action.Player, action.NewLocation, action.OldLocation);
});

eventer.on("newListener", function(name) {
	console.log("### NEW LISTENER REGISTERED - " + name);
});
