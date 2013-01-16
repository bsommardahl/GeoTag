define(["config", "localstore"], function(config, local) {

	console.log("### REQUIRE: Loading server.js...");

	var server = function() {

		var onLog = function() {
		};
		var log = function(message) {
			message = "### SERVER - " + message;
			onLog(message);
			console.log(message);
		};

		var socket;

		var connect = function(onConnected) {

			socket = io.connect(config.SocketServerUrl, [{
				transports : ['xhr-polling', 'jsonp-polling']
			}, {
				"connectTimeout" : 5000
			}]);

			socket.on("connecting", function(transport_type) {
				log("connecting to " + config.SocketServerUrl + " with " + transport_type);
			});

			socket.on("connect_failed", function() {
				log("connection failed");
			});

			socket.on('connect', function() {
				log("Connected");
				onConnected();
			});
		};

		var currentPlayer = local.GetObject("user");

		return {
			Connect : connect,
			SetOnLog : function(cb) {
				onLog = cb;
			},
			Login : function(username, password) {
				socket.emit("auth", username, password);

				var def = $.Deferred();
				socket.on("authGood", function(player) {
					log("### SUCCESSFUL LOGIN");
					currentPlayer = player;
					def.resolve(player);
				});
				socket.on("authBad", function() {
					def.reject("Invalid creds.");
				});

				return def;
			},
			Register : function(newPlayer) {
				socket.emit("register", newPlayer);

				var def = $.Deferred();
				socket.on("welcome", function(player) {
					log("### SUCCESSFUL REGISTRATION");
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
					log("HELLO - waiting for welcome");
					socket.emit("hello", currentPlayer._id);

					socket.on("authBad", function() {
						def.reject("Player nolonger exists or invalid creds.");
					});

					socket.on("welcome", function(player) {
						log("WELCOME")
						currentPlayer = player;
						def.resolve(player);
					});
				} else {
					def.reject("Not logged in.");
				}
				return def;
			},
			UpdatePosition : function(x, y) {
				log("UPDATING SERVER with new position");
				socket.emit('updateLocation', {
					PlayerId : currentPlayer._id,
					X : x,
					Y : y
				});
				var def = $.Deferred();
				return def;
			},
			GetNearbyPlayers : function() {
				log("getNearbyPlayers");
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
				SetPenalty : function(cb) {
					socket.on("penaltyBecasueYouMovedWhenFrozen", function(frozen) {
						log("EVENT penaltyBecasueYouMovedWhenFrozen");
						cb(frozen);
					});
				},
				SetAddState : function(cb) {
					//addState is a message from the server that the player has entered some state of being. 
					//Ex: for freezetag, a state might be "frozen" after someone tagged him
					socket.on('addState', function(payload) {
						log("EVENT addState");
						cb(payload);
					});
				},
				SetRemoveState : function(cb) {
					//addState is a message from the server that the player has entered some state of being. 
					//Ex: for freezetag, a state might be "frozen" after someone tagged him
					socket.on('removeState', function(payload) {
						log("EVENT removeState");
						cb(payload);
					});
				},
				SetPointsReduced : function(cb) {
					socket.on('pointsreduced', function(change) {
						log("EVENT pointsreduced");
						cb(change);
					});
				},
				SetPointsIncreased : function(cb) {
					socket.on('pointsincreased', function(change) {
						log("EVENT pointsincreased");
						cb(change);
					});
				},
				SetTagged : function(cb) {
					socket.on('tagged', function(tagReport) {
						log("EVENT tagged");
						cb(tagReport);
					});
				},
				SetPlayerPositionChanged : function(cb) {
					socket.on("playerpositionchanged", function(player) {
						log("EVENT playerpositionchanged");
						cb(player);
					});

				},
				SetNewPlayerInRange : function(cb) {
					socket.on("newPlayerInRange", function(change) {
						log("EVENT newPlayerInRange");
						cb(change);
					});
				},
				SetPlayerLeftRange : function(cb) {
					socket.on("playerLeftRange", function(change) {
						log("EVENT playerLeftRange");
						cb(change);
					});
				},
				SetNearbyPlayers : function(cb) {
					socket.on("nearbyPlayers", function(players) {
						log("EVENT nearbyPlayers");
						cb(players);
					});
				},
				SetIllegalTag : function(cb) {
					socket.on('illegalTag', function(reason) {
						cb(reason);
					});
				},
				SetAuthBad : function(cb) {
					onAuthBad = cb;
				},
				SetOnPlayerAlreadyExists : function(cb) {
					socket.on("userAlreadyExists", function(registration) {
						log("EVENT userAlreadyExists");
						cb(registration);
					});
				},
				SetOnYourPositionChanged : function(cb) {
					socket.on("yourPositionChanged", function(player) {
						log("EVENT yourPositionChanged");
						cb(player);
					});
				}
			}
		};
	};

	try {
		var s = new server();

		console.log("### REQUIRE: Loaded server.js");
		return s;
	} catch(err) {
		console.log("### SERVER ERROR: " + err);
	}

});
