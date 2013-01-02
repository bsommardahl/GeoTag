define(["localStore", "server", "mobile"], function(local, server, mobile) {

	var viewModel = function() {

		var user = local.GetObject("user");

		var name = ko.observable(user.Name);
		var points = ko.observable(user.Points);

		//user can select a marker to tag

		var nearby = ko.observableArray();

		var refreshNearbyPlayers = function() {
			server.GetNearbyPlayers().done(function(nearbyPlayers) {
				nearby.removeAll();
				$.each(nearbyPlayers, function() {
					nearby.push(this);
				});
			});
		};
		refreshNearbyPlayers();

		server.Events.SetPlayerPositionChanged(function(position) {
			refreshNearbyPlayers();
		});

		mobile.OnPositionChange = function(position) {
			server.UpdatePosition(position.coords.longitude, position.coords.latitude)
		};

		server.Hello().done(function(player) {
			name(player.Name);
			points(player.Points);
		});

		server.Events.SetPointsReduced(function(change) {
			points(change.NewPoints);
		});

		server.Events.SetTagged(function(tagReport) {
			console.log("### Tagged by " + tagReport.TaggedBy.Name);
		});

		server.Events.SetPointsIncreased(function(change) {
			points(change.NewPoints);
		});

		return {
			NearbyPlayers : nearby,
			Name : name,
			Points : points,
			Tag : function(player) {
				server.Actions.Tag(player._id);
			}
		};
	};

	return viewModel;
});
