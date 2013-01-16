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

};

eventer.on("takeawaypoints", function(pointReduction) {
	console.log("### RESPONDING TO DOMAINEVENT takeawaypoints");
	takeAwayPoints(pointReduction);
});

eventer.on("givepoints", function(pointChange) {
	console.log("### RESPONDING TO DOMAINEVENT givepoints");
	givePoints(pointChange);
});

