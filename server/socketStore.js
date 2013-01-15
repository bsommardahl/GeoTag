var linq = require("./linq");
var q = require('q');

var allSockets = [];

module.exports = {

	Add : function(socket, player) {
		var def = q.defer();
		try {
			allSockets.push({
				PlayerId : player._id.toString(),
				Socket : socket
			});
			def.resolve();

		} catch(err) {
			def.fail(err);
		}
		return def.promise;
	},

	Get : function(query) {
		return linq.All(allSockets, query);
	},

	Remove : function(query) {
		var def = q.defer();
		try {
			var disconnectedSockets = linq.All(allSockets, query);
			linq.Each(disconnectedSockets, function(s, i) {
				allSockets.splice(i, 1);
			});
		} catch(err) {
			def.fail(err);
		}
		return def.promise;
	},
	Count : allSockets.length
};
