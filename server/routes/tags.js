var q = require('q');
var moment = require('moment');
var ee = require("../eventer");
var players = require("./players");
var dc = require("../dataContext");
var linq = require("../linq");
var socketStore = require("../socketStore");

var insertNewTag = function(newTag) {
	var def = q.defer();
	dc.Collection.Tags().then(function(coll) {
		coll.insert(newTag, {
			safe : true
		}, function(err, newDoc) {
			if (err) {
				console.log("###### ERROR: " + err);
			} else {
				console.log("### INSERTED TAG");
				var players = require("./players");
				players.Get(newTag.TaggerId).then(function(tagger) {
					player.Get(newTag.TaggedId).then(function(tagged) {
						console.log("### GOT TAGGER PLAYER");
						console.log(tagger);
						console.log("### EMITTING DOMAIN EVENT tagged");
						ee.emit("tagged", {
							PlayerId : newTag.TaggedId,
							TaggedBy : tagger,
							LostPoints : 50
						});
						console.log("### EMITTING DOMAIN EVENT takeawaypoints");
						ee.emit("takeawaypoints", {
							PlayerId : newTag.TaggedId,
							Points : 50,
							Reason : newTag
						});
						ee.emit("givepoints", {
							PlayerId : newTag.TaggerId,
							Points : 50,
							Reason : newTag
						});
						ee.emit("startFrozenPeriod", {
							PlayerId : newTag.TaggedId,
							Seconds : 60,
							PointsLostIfHeMoves : 200,
							Location : tagged.LastLocation
						});
						def.resolve(newTag);
						console.log("### DONE.");
					});

				});
			}
		});
	});
	return def.promise;
};

var create = function(newTag) {

	var def = q.defer();

	//first need to make sure it's okay to tag this person.
	//the two players have to be within X meters of each other to be able to tag or be tagged
	//the X meters is the "TagZone".

	players.Get(newTag.TaggerId).then(function(player) {
		players.GetPlayersInTagZone(player._id, player.LastLocation[0], player.LastLocation[1]).then(function(players) {
			//is the tagged player, in fact, in the tagZone?
			if (linq.Any(players, function(p) {
				return p._id.toString() == newTag.TaggedId;
			})) {
				//cool, we this player can be tagged
				newTag.Created = moment()._d;
				newTag.TaggerId = dc.GetId(newTag.TaggerId.toString());

				insertNewTag(newTag).then(function(createdTag) {
					console.log("### TAG CREATED.");
					def.resolve(newTag);
				});
			} else {
				//not in tagZone
				def.reject("Tagged player is not in the tagZone.");
			}
		});
	});
	return def.promise;
};

exports.NotifyPlayerThatHeWasTagged = function(tagReport) {
	console.log("### RESPONDING TO DOMAINEVENT tagged");
	console.log(tagReport);
	var taggedSockets = socketStore.Get(function(s) {
		return s.PlayerId == tagReport.PlayerId;
	});
	console.log("### EMITTING tagged EVENT to " + taggedSockets.length + " players.");
	linq.Each(taggedSockets, function(playerSocket) {
		console.log("### EMITTING tagged EVENT to: " + JSON.stringify(tagReport.TaggedBy.Name));
		playerSocket.Socket.emit("tagged", tagReport);
		console.log("### DONE.");
	});
};

ee.on("playerMovedWhenHeWasFrozen", function(frozen) {
	//take points away
	ee.emit("takeawaypoints", {
		PlayerId : frozen.PlayerId,
		Points : frozen.PointsLostIfHeMoves,
	});
	//notify the player
	ee.emit("penaltyBecasueYouMovedWhenFrozen", {
		PlayerId : frozen.PlayerId,
		LostPoints : frozen.PointsLostIfHeMoves
	});
});

var notifyThePlayerOfTheFrozenMovementPenaly = function(frozen) {
	console.log("### RESPONDING TO DOMAINEVENT penaltyBecasueYouMovedWhenFrozen");
	console.log(frozen);
	var sockets = socketStore.Get(function(s) {
		return s.PlayerId == frozen.PlayerId;
	});
	console.log("### EMITTING penaltyBecasueYouMovedWhenFrozen EVENT to " + sockets.length + " players.");
	linq.Each(sockets, function(playerSocket) {
		console.log("### EMITTING penaltyBecasueYouMovedWhenFrozen EVENT to: " + JSON.stringify(frozen.PlayerId));
		playerSocket.Socket.emit("penaltyBecasueYouMovedWhenFrozen", frozen);
		console.log("### DONE.");
	});
};

ee.on("penaltyBecasueYouMovedWhenFrozen", function(frozen) {
	notifyThePlayerOfTheFrozenMovementPenaly(frozen);
});

ee.on("startFrozenPeriod", function(frozen) {

	function lineDistance(point1, point2) {
		var xs = 0;
		var ys = 0;

		xs = point2.x - point1.x;
		xs = xs * xs;

		ys = point2.y - point1.y;
		ys = ys * ys;

		return Math.sqrt(xs + ys);
	}

	//start watching for movement
	var fn = function(player) {

		//if the change is more than X meters, then take away points and notify user

		//calculate distance between froen location and player location
		var distance = lineDistance({
			x : player.LastLocation[0],
			y : player.LastLocation[1]
		}, {
			x : frozen.Location[0],
			y : frozen.Location[1]
		});
		var radiusOfEarth = 6378100;

		if ((distance * radiusOfEarth) > 10) {
			ee.emit("playerMovedWhenHeWasFrozen", frozen);
		}
	};

	ee.on("playerLocationChanged", fn);

	//set a timeout to stop watching after X seconds
	setTimeout(function() {
		ee.removeListener("playerLocationChanged", fn);
	}, frozen.Seconds * 1000);

});

exports.Init = function(socket, getSockets) {
	getPlayerSockets = getSockets;

	socket.on('tag', function(newTag) {
		console.log("### TAG: " + JSON.stringify(newTag));
		console.log(newTag);
		create(newTag).then(function() {
			//tag created
		}).fail(function(reason) {
			socket.emit("illegalTag", reason);
		});
	});
};
