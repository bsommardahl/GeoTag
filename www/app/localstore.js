define(function() {

	var store = window.localStorage, debugMode = false;

	return {
		SaveObject : function(key, value) {
			store.setItem(key, JSON.stringify(value));
		},
		GetObject : function(key) {
			return JSON.parse(store.getItem(key));
		}
	};
});
