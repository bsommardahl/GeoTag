var q = require('q');

var all = function(list, query) {
	var items = [];
	for (var i = 0; i < list.length; i++) {
		if (query(list[i]))
			items.push(list[i]);
	}
	return items;
};

var any = function(list, query) {
	return all(list, query).length > 0;
};

var all = function(list, query) {
	var items = [];
	for (var i = 0; i < list.length; i++) {
		if (query(list[i]))
			items.push(list[i]);
	}
	return items;
};

var each = function(list, action) {
	var def = q.defer();
	var results = [];
	for (var index = 0; index < list.length; index++) {
		var currentItem = list[index];
		results.push(action(currentItem, index));
	}
	def.resolve(results);
	return def.promise;
};

module.exports = {
	All: all,
	Any: any,
	Each: each
};
