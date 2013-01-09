var q = require('q');
var mongo = require("mongodb");
var Server = mongo.Server, Db = mongo.Db, BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {
	auto_reconnect : true
});
db = new Db('GeoTag', server, {
	safe : false
});

db.open(function(err, db) {
});

var getCollection = function(name) {
	var def = q.defer();
	db.collection(name, {
		safe : true
	}, function(err, collection) {
		if (err) {
			def.reject(err);
		} else {
			def.resolve(collection);
		}
	});
	return def.promise;
};

module.exports = {
	Collection : {
		Players : function() {
			return getCollection("players");
		},
		Locations : function() {
			return getCollection("locations");
		},
		Tags : function() {
			return getCollection("tags");
		},
	},
	GetId: function(id){
		return new BSON.ObjectID(id);
	}
};

