var q = require('q');
var moment = require('moment');
var eventer = require("../eventer");
var dc = require("../dataContext");
var socketStore = require("../socketStore");
var linq = require("../linq");

var insertNewPlayer = function(newPlayer) {
	var player = {
		Name : newPlayer.Name,
		Username : newPlayer.Username,
		Password : newPlayer.Password,
		Created : moment()._d
	};

	var def = q.defer();
	//first check to make sure the user doesn't already exist
	getQuery({
		Username : player.Username
	}).then(function() {
		//user already exists, need to reject
		def.reject("Player with username '" + player.Username + "' already exists.");
	}).fail(function() {
		//user doesn't exist, go for it!
		dc.Collection.Players().then(function(coll) {
			coll.insert(player, {
				safe : true
			}, function(err, newDoc) {
				console.log("### PLAYER INSERTED: " + JSON.stringify(newDoc));
				def.resolve(newDoc[0]);
			});
		});
	});
	return def.promise;
};

var updateThisPlayersPoints = function(playerId, newPoints) {
	var def = q.defer();
	dc.Collection.Players().then(function(coll) {

		var playerIdObj = dc.GetId(playerId.toString());

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

			if (!err) {
				get(playerId).then(function(player) {
					def.resolve(player);
				});
			}
		});
	});
	return def.promise;
};

var getQuery = function(query) {
	console.log("### GET player by " + JSON.stringify(query));
	var def = q.defer();
	try {
		dc.Collection.Players().then(function(coll) {
			coll.findOne(query, function(err, doc) {
				if (doc) {
					def.resolve(doc);
				} else {
					console.log("### REJECTING")
					def.reject("Couldn't find player by " + JSON.stringify(query) + ".");
				}
			});
		});
	} catch(err) {
		def.reject("Unexpected error when getting a player by id " + JSON.stringify(query) + ".");
	}
	return def.promise;
};

var get = function(playerId) {
	playerId = dc.GetId(playerId.toString());
	console.log(playerId);
	return getQuery({
		'_id' : playerId
	});
};

var getByCreds = function(username, password) {
	console.log("### GETTING USER by creds: " + username + " " + password);
	var def = q.defer();
	dc.Collection.Players().then(function(coll) {
		coll.findOne({
			'Username' : username,
			'Password' : password
		}, function(err, doc) {
			if (doc) {
				console.log("### FOUND USER: ");
				console.log(doc);
				def.resolve(doc);
			} else {
				def.reject("User not found.");
			}
		});
	});
	return def.promise;
};

var givePoints = function(pointIncrease) {
	console.log("### GETTING PLAYER");
	console.log(pointIncrease);
	//get player
	get(pointIncrease.PlayerId).then(function(player) {
		var oldPoints = parseInt(player.Points || 0);
		var newPoints = oldPoints + parseInt(pointIncrease.Points);
		console.log("### INCREASING PLAYER POINTS from " + oldPoints + " to " + newPoints);
		updateThisPlayersPoints(player._id, newPoints).then(function(updatedPlayer) {

			notifyPlayerOfPointsIncreased({
				PlayerId : updatedPlayer._id,
				OldPoints : oldPoints,
				NewPoints : newPoints,
				Change : pointIncrease.Points
			});

		});
	});
};

var takeAwayPoints = function(pointReduction) {
	console.log("### GETTING PLAYER");
	console.log(pointReduction);
	//get player
	get(pointReduction.PlayerId).then(function(player) {
		var oldPoints = parseInt(player.Points || 0);
		var newPoints = oldPoints - parseInt(pointReduction.Points);
		console.log("### REDUCING PLAYER POINTS from " + oldPoints + " to " + newPoints);
		updateThisPlayersPoints(player._id, newPoints).then(function(updatedPlayer) {
			notifyPlayerOfPointsReduced({
				PlayerId : updatedPlayer._id,
				OldPoints : oldPoints,
				NewPoints : newPoints,
				Change : pointIncrease.Points
			});
		});
	});
};

exports.Get = get;

var getPlayersInRadius = function(playerId, x, y, radius, unitOfMeasurement) {

	// console.log("playerId:" + playerId);
	// console.log("x:" + x);
	// console.log("y:" + y);
	// console.log("radius:" + radius);
	// console.log("unitOfMeasurement:" + unitOfMeasurement);

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

var getNearbyPlayers = function(playerId, x, y) {
	return getPlayersInRadius(playerId, x, y, 1, "miles");
};

exports.GetNearbyPlayers = getNearbyPlayers;

exports.GetPlayersInTagZone = function(playerId, x, y) {
	return getPlayersInRadius(playerId, x, y, 50, "meters");
};

var notifyPlayerOfPointsReduced = function(pointChange) {
	var playerSockets = socketStore.Get(function(s) {
		return s.PlayerId == pointChange.PlayerId;
	});
	console.log("### EMITTING pointsreduced EVENT to " + playerSockets.length + " players.");
	linq.Each(playerSockets, function(playerSocket) {
		console.log("### EMITTING pointsreduced EVENT to: " + JSON.stringify(pointChange.PlayerId));
		playerSocket.Socket.emit("pointsreduced", pointChange);
		console.log("### DONE.");
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

var notifyAllOfPlayerPositionChange = function(player) {

	getNearbyPlayers(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(nearbyPlayers) {

		//notify the player that changed location of his new nearby players
		//Not sure this is needed anymore. -Byron
		// var playerSockets = socketStore.Get(function(s) {
		// return s.PlayerId == player._id.toString();
		// });
		// console.log("### EMITTING nearbyPlayers EVENT to " + playerSockets.length + " players.");
		// linq.Each(playerSockets, function(playerSocket) {
		// console.log("### EMITTING nearbyPlayers EVENT to: " + JSON.stringify(player._id));
		// playerSocket.Socket.emit("nearbyPlayers", nearbyPlayers);
		// console.log("### DONE.");
		// });

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

var notifyPlayerOfPointsIncreased = function(change) {
	console.log("------------------------------------------------ NotifyPlayerOfPointsIncreased()");
	console.log(change);
	var playerSockets = socketStore.Get(function(s) {
		return s.PlayerId == change.PlayerId;
	});
	console.log("### EMITTING pointsincreased EVENT to " + playerSockets.length + " players.");
	linq.Each(playerSockets, function(playerSocket) {
		console.log("### EMITTING pointsincreased EVENT to: " + JSON.stringify(change.PlayerId));
		playerSocket.Socket.emit("pointsincreased", change);
		console.log("### DONE.");
	});
};

exports.Init = function(socket) {

	socket.on("auth", function(username, password) {
		var player = getByCreds(username, password).then(function(player) {
			socket.emit("authGood", player);
		}).fail(function(err) {
			socket.emit("authBad", err);
		});
	});

	socket.on("hello", function(playerId) {

		get(playerId).then(function(player) {
			console.log(player);
			console.log("### HELLO " + player.Name);

			socketStore.Add(socket, player).then(function() {
				console.log("### PLAYER SOCKET PUSHED. Now with " + socketStore.Count.length + " sockets.");
				socket.emit("welcome", player);
			});

		}).fail(function(err) {
			console.log("ERR ON HELLO: " + err);
			socket.emit("authBad", "PlayerId does not exist!");
		});
	});

	socket.on("register", function(newPlayer) {
		console.log("### CREATING PLAYER: " + JSON.stringify(newPlayer));
		insertNewPlayer(newPlayer).then(function(player) {
			console.log("### CREATED PLAYER, sending welcome");
			socket.emit("welcome", player);
		}).fail(function() {
			socket.emit("userAlreadyExists", newPlayer);
		});
	});

	socket.on('getNearbyPlayers', function(playerId) {
		get(playerId).then(function(player) {
			getNearbyPlayers(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(nearbyPlayers) {
				socket.emit("nearbyPlayers", nearbyPlayers);
			});
		});
	});
};

eventer.on("yourPositionChanged", function(player) {
	console.log("### RESPONDING TO DOMAIN EVENT yourPositionChanged.");
	notifyPlayerThatHisPositionChanged(player);
});

eventer.on("playerLocationChanged", function(player) {
	console.log("### RESPONDING TO DOMAIN EVENT playerLocationChanged.");
	notifyAllOfPlayerPositionChange(player);
});

eventer.on("playerLeftRange", function(change) {
	console.log("### RESPONDING TO DOMAINEVENT playerLeftRange");
	notifyThatPlayerLeftRange(change);
});

eventer.on("newPlayerInRange", function(change) {
	console.log("### RESPONDING TO DOMAINEVENT newPlayerInRange");
	notifyThatPlayerIsInRange(change);
});

eventer.on("takeawaypoints", function(pointReduction) {
	console.log("### RESPONDING TO DOMAINEVENT takeawaypoints");
	takeAwayPoints(pointReduction);
});

eventer.on("givepoints", function(pointChange) {
	console.log("### RESPONDING TO DOMAINEVENT givepoints");
	givePoints(pointChange);
});

