define(["config", "localstore", "server", "mobile"], function(config, local, server, mobile) {

	console.log("### REQUIRE: Loading home.js...");

	var all = function(list, query) {
		var items = [];
		if (list) {
			for (var i = 0; i < list.length; i++) {
				if (query(list[i]))
					items.push(list[i]);
			}
		}
		return items;

	};

	var any = function(list, query) {
		return all(list, query).length > 0;
	};

	var viewModel = function() {

		var map;
		var onLog = function() {
		};
		var log = function(message) {
			message = "### HOME: " + message;
			onLog(message);
			console.log(message);
		};

		var user = local.GetObject("user");

		var name = ko.observable(user.Name);
		var points = ko.observable(user.Points);

		var x = ko.observable();
		var y = ko.observable();

		var activityLog = ko.observable();

		var nearby = ko.observableArray();

		var mapMarker;

		var removePlayer = function(playerId) {
			var playerToRemove = ko.utils.arrayFirst(nearby(), function(p) {
				return p._id == playerId;
			});
			if (playerToRemove) {
				playerToRemove.marker.setMap(null);
				nearby.remove(playerToRemove);
				log("Removed player from map: " + playerToRemove.Name);
			}
		};

		var addPlayer = function(player) {
			if (!map)
				alert("No map.");

			var latitude = player.LastLocation[1];
			var longitude = player.LastLocation[0];

			var marker = new google.maps.Marker({
				position : new google.maps.LatLng(latitude, longitude),
				map : map,
				title : player.Name
			});
			player.marker = marker;
			nearby.push(player);

			google.maps.event.addListener(marker, 'click', function() {
				server.Actions.Tag(player._id);
			});
			log("Added player to map: " + player.Name);
		};

		var updatePlayer = function(player) {
			var playerWithMarker = ko.utils.arrayFirst(nearby(), function(p) {
				return p._id == player._id;
			});
			if (playerWithMarker) {
				playerWithMarker.marker.setPosition(new google.maps.LatLng(player.LastLocation[1], player.LastLocation[0]));

				//set other props
				playerWithMarker.LastLocation = player.LastLocation;
				playerWithMarker.LastLocationUpdate = player.LastLocationUpdate;
			} else {
				addPlayer(player);
			}
		};

		var setMarkerForThisPlayer = function(longitude, latitude) {

			if (!map) {
				alert("Map not yet available!");
			}

			var centerPoint = new google.maps.LatLng(latitude, longitude);
			map.setCenter(centerPoint);

			//re-center marker
			if (mapMarker) {
				mapMarker.marker.setPosition(centerPoint);
				mapMarker.x = longitude;
				mapMarker.y = latitude;
			}
			//or create a new marker
			else {
				mapMarker = {
					marker : new google.maps.Marker({
						position : centerPoint,
						map : map,
						title : name()
					}),
					x : longitude,
					y : latitude
				};

				// Add a Circle overlay to the map.
				var circle = new google.maps.Circle({
					map : map,
					center : centerPoint,
					fillColor : "#00FF00",
					fillOpacity : 0.2,
					strokeColor : "#00FF00",
					strokeOpacity : 0.4,
					strokeWeight : 2
				});
				circle.setRadius(config.TagZoneRadius);
				circle.bindTo('center', mapMarker.marker, 'position');
			}

		};

		var refreshPlayerMarkers = function(nearbyPlayers) {

			if (!nearbyPlayers)
				alert("nearbyPlayers was not provided.");

			log("Refreshing player markers...");

			//remove nearby players that are not in the new list of nearby players
			$.each(nearby() || [], function() {
				var oldPlayer = this;
				//if this player is not in the new list, remove the player and marker
				if (!any(nearbyPlayers, function(p) {
					return p._id == oldPlayer._id;
				})) {
					removePlayer(oldPlayer._id);
				}
			});

			//add nearby players that are in the new list, but not in the old
			$.each(nearbyPlayers || [], function() {
				var newPlayer = this;

				//if this player is not in the old list, add it
				if (!any(nearby() || [], function(p) {
					return p._id == newPlayer._id
				})) {
					addPlayer(newPlayer);
				}
			});
		};

		var refreshNearbyPlayers = function() {
			//sends a command to the server which eventually results in a list of nearby players
			return server.GetNearbyPlayers();
		};

		server.Events.SetPlayerPositionChanged(function(player) {
			updatePlayer(player);
		});

		var updateViewModelWithNewLocation = function(longitude, latitude) {
			x(longitude);
			y(latitude);

			var u = local.GetObject("user");
			u.X = longitude;
			u.Y = latitude;
			local.SaveObject("user", user);
		};

		var mapInitialized = false;

		var initializeMap = function(longitude, latitude) {

			var centerPoint = new google.maps.LatLng(latitude, longitude);

			//user can still double tap a place on the map and the center moves

			var mapOptions = {
				center : centerPoint,
				zoom : 17,
				zoomControl : true,
				streetViewControl : false,
				scaleControl : false,
				draggable : false,
				keyboardShortcuts : false,
				mapTypeControl : false,
				mapTypeId : google.maps.MapTypeId.ROADMAP
			};
			map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);

			mapInitialized = true;
		};

		mobile.WatchPosition(function(newPosition) {
			//this only sends the signal to the server that the position has changed. we will wait from a response
			//from the server to actually update the viewModel (see server.SetOnYourPositionChanged)
			server.UpdatePosition(newPosition.coords.longitude, newPosition.coords.latitude);
		});

		server.Events.SetOnYourPositionChanged(function(player) {

			log("Updating current player's position in viewModel");

			var latitude = player.LastLocation[1];
			var longitude = player.LastLocation[0];

			updateViewModelWithNewLocation(longitude, latitude);

			if (!mapInitialized) {
				log("Initializing map...");
				initializeMap(longitude, latitude);
				log("Getting initial nearby players...");
				refreshNearbyPlayers();
			}

			setMarkerForThisPlayer(longitude, latitude)
		});

		//I want to wait on the home page until we have had the chance to connect to the server
		//and get back the player.. nothing should happen before that.

		//server.Events.SetOnConnect(function() {
		log("Saying 'Hello'...");
		server.Hello().done(function(player) {
			name(player.Name);
			points(player.Points);

			//on viewModel load, try to get location from current position
			//the mobile location should be considered the most authoritative
			//except that we don't need to set it here... it should be done when we get
			//a response from the server saying that the location has been updated.

			//so I'm commenting all this out...

			// if (mobile.CurrentPosition) {
			// initializeMap(mobile.CurrentPosition.X, mobile.CurrentPosition.Y);
			// }
			// //or from localStore
			// else if (user.X && user.Y) {
			// initializeMap(user.X, user.Y);
			// }
			// //or from last reported location
			// else if (player.LastLocation) {
			// initializeMap(player.LastLocation[0], player.LastLocation[1]);
			// }

		}).fail(function(error) {
			log(error);
			var router = require("router");
			router.GoToView.Login();
		});
		//});

		server.Events.SetPointsReduced(function(change) {
			points(change.NewPoints);
		});

		server.Events.SetTagged(function(tagReport) {
			log(tagReport);
			toastr.warning("You were tagged by " + tagReport.TaggedBy.Name + ". You lost " + tagReport.LostPoints + " points!");
		});

		server.Events.SetIllegalTag(function(reason) {
			toastr.error(reason);
		});

		server.Events.SetPointsIncreased(function(change) {
			points(change.NewPoints);
		});

		server.Events.SetNewPlayerInRange(function(change) {
			var player = change.PlayerThatCameIntoRange;
			player.LastLocation = change.NewPosition.Coords;
			addPlayer(player);
			console.log(change);
		});

		server.Events.SetPlayerLeftRange(function(change) {
			removePlayer(change.PlayerThatLeftRange._id);
		});

		server.Events.SetNearbyPlayers(refreshPlayerMarkers);

		var showLocation = ko.observable();

		return {
			NearbyPlayers : nearby,
			Name : name,
			Points : points,
			Tag : function(player) {
				server.Actions.Tag(player._id);
			},
			X : x,
			Y : y,
			SetLocation : function() {
				server.UpdatePosition(x(), y()).done(function() {
					refreshNearbyPlayers();
				});
			},
			SetLog : function(cb) {
				onLog = cb;
			},
			Logout : function() {
				local.Kill("user");
				require("router").GoToView.Login();
			},
			ToggleShowLocation : function() {
				if (showLocation()) {
					showLocation(false);
				} else {
					showLocation(true);
				}
			},
			ShowLocation : showLocation
		};
	};

	console.log("### REQUIRE: Loaded home.js");

	return viewModel;
});

