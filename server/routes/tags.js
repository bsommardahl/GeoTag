var mongo = require('mongodb');
var q = require('q');
var moment = require('moment');
var ee = require("../eventer");

var Server = mongo.Server, Db = mongo.Db, BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {
	auto_reconnect : true
});
db = new Db('GeoTag', server, {
	safe : false
});

db.open(function(err, db) {
	if (!err) {
		db.collection('tags', {
			safe : true
		}, function(err, collection) {
			if (err) {//collection does not yet exist.
				//populate();
			}
		});
	}
});

var insertNewTag = function(newTag) {
	var def = q.defer();
	db.collection('tags', function(err, coll) {
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
						PlayerId: newTag.TaggedId,
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

exports.Create = function(newTag) {
	newTag.Created = moment()._d;
	console.log("### Creating Tag...")

	//clean up the json obj
	newTag.TaggerId = new BSON.ObjectID(newTag.TaggerId.toString());
	newTag.TaggedId = new BSON.ObjectID(newTag.TaggedId.toString());

	insertNewTag(newTag).then(function(createdTag) {
		console.log("### TAG CREATED.");

		// var data = {
		// Status : "Ok",
		// Tag : createdTag
		// };
		// console.log("### Returning response:");
		// console.log(data);
		//
		// res.writeHead(200, {
		// "Content-Type" : "application/json",
		// "Access-Control-Allow-Origin" : "*"
		// });
		//
		// res.end(JSON.stringify(data));
	});
};
