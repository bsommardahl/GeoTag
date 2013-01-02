/**
 * Module dependencies.
 */

var express = require('express'), http = require('http'), path = require('path');

var locations = require('./routes/locations');
var tags = require('./routes/tags');
var players = require('./routes/players');
var eventer = require("./eventer");
var q = require('q');

//var app = express();

//var allowCrossDomain = function(req, res, next) {
//
// res.header("Content-Type", "application/json");
// res.header('Access-Control-Allow-Origin', "*");
// res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
// res.header('Access-Control-Allow-Headers', 'Content-Type');
//
// next();
// }
//
// app.configure(function() {
// app.set('port', process.env.PORT || 3001);
// app.use(express.logger('dev'));
// app.use(express.bodyParser());
// app.use(express.methodOverride());
// app.use(allowCrossDomain);
// app.use(app.router);
// });
//
// app.configure('development', function() {
// app.use(express.errorHandler());
// });
//
// app.post("/locations", function(req, res) {
// locations.Create(req, res);
// });
// app.post("/tags", function(req, res) {
// tags.Create(req, res);
// });

// http.createServer(app).listen(app.get('port'), function() {
// console.log("GeoTag Dev Testing Server listening on port " + app.get('port'));
// });

var io = require('socket.io').listen(3001);

var allSockets = [];

var all = function(list, query) {
	var items = [];
	for (var i = 0; i < list.length; i++) {
		var currentItem = list[i];
		if (query(currentItem)) {
			items.push(currentItem);
		}
	}
	return items;
};
var each = function(list, action) {
	var def = q.defer();
	var results = [];
	for (var index = 0; index < list.length; index++) {
		var currentItem = list[index];
		results.push(action(currentItem, index));
	}
	def.resolve(results);
	return def.promise;
};

io.sockets.on('connection', function(socket) {

	socket.on('disconnect', function() {
		var disconnectedSockets = all(allSockets, function(s) {
			return s.SocketId == socket.id;
		});
		each(disconnectedSockets, function(s, i) {
			allSockets.splice(i, 1);
			console.log("### DISCONNECT: Socket for player " + s.PlayerId + " disconnected. Now, there are " + allSockets.length + " sockets connected.");
		})
	});

	socket.on("auth", function(username, password) {
		var player = players.GetByCreds(username, password).then(function(player) {
			socket.emit("authGood", player);
		}).fail(function(err) {
			socket.emit("authBad", err);
		});
	});

	socket.on("hello", function(playerId) {

		var player = players.Get(playerId).then(function(player) {
			console.log("### HELLO " + player.Name);
			allSockets.push({
				PlayerId : player._id.toString(),
				Socket : socket
			});
			console.log("### PLAYER SOCKET PUSHED. Now with " + allSockets.length + " sockets.");

			socket.emit("welcome", player);
		});
	});

	socket.on('updateLocation', function(newLocation) {
		//console.log("### UPDATING LOCATION: " + JSON.stringify(newLocation));
		locations.Create(newLocation);
	});

	socket.on('tag', function(newTag) {
		console.log("### TAG: " + JSON.stringify(newTag));
		console.log(newTag);
		tags.Create(newTag);
	});

	socket.on('getNearbyPlayers', function(playerId) {
		players.Get(playerId).then(function(player) {
			players.GetNearbyPlayers(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(nearbyPlayers) {
				socket.emit("nearbyPlayers", nearbyPlayers);
			});
		});

	});
});

eventer.on("tagged", function(tagReport) {
	console.log("### RESPONDING TO DOMAINEVENT tagged");
	console.log(tagReport);
	var taggedSockets = all(allSockets, function(s) {
		console.log(s.PlayerId + " " + tagReport.PlayerId);
		return s.PlayerId == tagReport.PlayerId;
	});
	console.log("### EMITTING tagged EVENT to " + taggedSockets.length + " players.");
	each(taggedSockets, function(playerSocket) {
		console.log("### EMITTING tagged EVENT to: " + JSON.stringify(tagReport.TaggedBy.Name));
		playerSocket.Socket.emit("tagged", tagReport);
		console.log("### DONE.");
	});
});

eventer.on("takeawaypoints", function(pointReduction) {
	console.log("### RESPONDING TO DOMAINEVENT takeawaypoints");
	players.TakeAwayPoints(pointReduction);
});

eventer.on("givepoints", function(pointIncrease) {
	console.log("### RESPONDING TO DOMAINEVENT givepoints");
	players.GivePoints(pointIncrease);
});

eventer.on("pointsreduced", function(pointChange) {
	console.log("### RESPONDING TO DOMAINEVENT pointsreduced");
	console.log(pointChange);
	var playerSockets = all(allSockets, function(s) {
		return s.PlayerId == pointChange.PlayerId;
	});
	console.log("### EMITTING pointsreduced EVENT to " + playerSockets.length + " players.");
	each(playerSockets, function(playerSocket) {
		console.log("### EMITTING pointsreduced EVENT to: " + JSON.stringify(pointChange.PlayerId));
		playerSocket.Socket.emit("pointsreduced", pointChange);
		console.log("### DONE.");
	});
});

eventer.on("pointsincreased", function(pointChange) {
	console.log("### RESPONDING TO DOMAINEVENT pointsincreased");
	console.log(pointChange);
	var playerSockets = all(allSockets, function(s) {
		return s.PlayerId == pointChange.PlayerId;
	});
	console.log("### EMITTING pointsincreased EVENT to " + playerSockets.length + " players.");
	each(playerSockets, function(playerSocket) {
		console.log("### EMITTING pointsincreased EVENT to: " + JSON.stringify(pointChange.PlayerId));
		playerSocket.Socket.emit("pointsincreased", pointChange);
		console.log("### DONE.");
	});
});

eventer.on("playerLocationChanged", function(player) {
	//console.log("### RESPONDING TO DOMAIN EVENT playerLocationChanged.");
	//get list of nearby players
	players.GetNearbyPlayers(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(nearbyPlayers) {
		//for each nearby player, find a socket
		//console.log("### EMITTING EVENTS to " + nearbyPlayers.length + " players.");

		each(nearbyPlayers, function(playerReceivingNotification) {
			//console.log("### EMITTING EVENT to player: " + JSON.stringify(player));
			var playerSockets = all(allSockets, function(s) {
				return s.PlayerId == playerReceivingNotification._id;
			})
			//for each socket, emit
			each(playerSockets, function(playerSocket) {
				playerSocket.Socket.emit("playerLocationChanged", player);
			});
		});
	});
});

