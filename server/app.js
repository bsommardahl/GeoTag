var locations = require('./routes/locations'), tags = require('./routes/tags'), players = require('./routes/players');
var eventer = require("./eventer");
var socketStore = require("./socketStore");
var q = require('q');

var thePort = parseInt(process.env.VCAP_APP_PORT || 3001);

var io = require('socket.io').listen(thePort);

io.set('transports', ['xhr-polling', 'jsonp-polling']);

console.log("GeoTag server running on port " + thePort);

io.sockets.on('connection', function(socket) {
	console.log("### NEW SOCKET " + socket.id + " connected.");

	//initialize socket responders (routes)
	players.Init(socket);
	locations.Init(socket);
	tags.Init(socket);

	socket.on('disconnect', function() {
		socketStore.Remove(function(s) {
			return s.SocketId == socket.id;
		});
	});
});

//events that probably don't need to be events.

eventer.on("tagged", tags.NotifyPlayerThatHeWasTagged);

eventer.on("takeawaypoints", function(pointReduction) {
	console.log("### RESPONDING TO DOMAINEVENT takeawaypoints");
	players.TakeAwayPoints(pointReduction);
});

eventer.on("givepoints", function(pointChange) {
	console.log("### RESPONDING TO DOMAINEVENT givepoints");
	players.GivePoints(pointChange);
});

eventer.on("pointsreduced", function(pointChange) {
	console.log("### RESPONDING TO DOMAINEVENT pointsreduced");
	players.NotifyPlayerOfPointsReduced(pointChange);
});

eventer.on("pointsincreased", function(pointChange) {
	console.log("### RESPONDING TO DOMAINEVENT pointsincreased");
	players.NotifyPlayerOfPointsIncreased(pointChange);
});

eventer.on("playerLocationChanged", function(player) {
	console.log("### RESPONDING TO DOMAIN EVENT playerLocationChanged.");
	players.NotifyAllOfPlayerPositionChange(player);
});

eventer.on("playerLeftRange", function(change) {
	console.log("### RESPONDING TO DOMAINEVENT playerLeftRange");
	players.NotifyThatPlayerLeftRange(change);
});

eventer.on("newPlayerInRange", function(change) {
	console.log("### RESPONDING TO DOMAINEVENT newPlayerInRange");
	players.NotifyThatPlayerIsInRange(change);
});

