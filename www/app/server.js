define(["localStore"], function(local) {
	var server = function() {

		var socket = io.connect('http://localhost:3001');

		var pointsReduced;
		socket.on('pointsreduced', function(change){
			console.log("### EVENT pointsreduced");
			pointsReduced(change);
		});

		var pointsIncreased;
		socket.on('pointsincreased', function(change) {
			console.log("### EVENT pointsincreased");
			pointsIncreased(change);
		});

		var playerPositionChanged;
		socket.on("playerpositionchanged", playerPositionChanged);

		var tagged;
		socket.on('tagged', tagged);

		var currentPlayer = local.GetObject("user");

		return {
			Login : function(username, password) {
				socket.emit("auth", username, password);

				var def = $.Deferred();
				socket.on("authGood", function(player) {
					currentPlayer = player;
					def.resolve(player);
				});
				socket.on("authBad", function() {
					def.reject("Invalid creds.");
				});

				return def;
			},
			Hello : function() {
				var def = $.Deferred();
				if (currentPlayer) {
					socket.emit("hello", currentPlayer._id);

					socket.on("welcome", function(player) {
						currentPlayer = player;
						def.resolve(player);
					});
				} else {
					def.reject("Not logged in.");
				}
				return def;
			},
			UpdatePosition : function(x, y) {
				socket.emit('updateLocation', {
					PlayerId : currentPlayer._id,
					X : x,
					Y : y
				});
				var def = $.Deferred();
				return def;
			},
			GetNearbyPlayers : function() {
				socket.emit('getNearbyPlayers', currentPlayer._id);
				var def = $.Deferred();
				socket.on("nearbyPlayers", function(nearbyPlayers) {
					def.resolve(nearbyPlayers);
				});
				return def;
			},
			Actions : {
				Tag : function(targetPlayerId) {
					socket.emit('tag', {
						TaggerId : currentPlayer._id,
						TaggedId : targetPlayerId,
					});
					var def = $.Deferred();
					return def;
				}
			},
			Events : {
				SetPointsReduced : function(cb) {
					pointsReduced = cb;
				},
				SetPointsIncreased : function(cb) {
					pointsIncreased = cb;
				},
				SetTagged : function(cb) {
					tagged = cb;
				},
				SetPlayerPositionChanged : function(cb) {
					playerPositionChanged = cb;
				}
			}
		};
	};
	return new server();
});
