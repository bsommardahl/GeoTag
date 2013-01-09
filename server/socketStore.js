var linq = require("./linq");

var allSockets = [];

module.exports = {
	
	Add : function(socket, player) {
		allSockets.push({
			PlayerId : player._id.toString(),
			Socket : socket
		});
	},
	
	Get : function(query) {
		return linq.All(allSockets, query);
	},
	
	Remove : function(query) {
		var disconnectedSockets = linq.All(allSockets, query);
		linq.Each(disconnectedSockets, function(s, i) {
			allSockets.splice(i, 1);
		});
	},
	Count: allSockets.length
};
