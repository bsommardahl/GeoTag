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
					def.resolve(newTag);
					console.log("### DONE.");
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
