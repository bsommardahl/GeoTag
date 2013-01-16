var locations = require('./modules/locations'), tags = require('./modules/tags'), players = require('./modules/players');
var power = require("./modules/power"), vision = require("./modules/vision"), vulnerability = require("./modules/vulnerability")
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
	vision.Init(socket);
	vulnerability.Init(socket);
	power.Init(socket);

	socket.on('disconnect', function() {
		socketStore.Remove(function(s) {
			return s.SocketId == socket.id;
		});
	});
}); 