define(function() {

	console.log("### REQUIRE: Loading localStore.js...");

	var local = function() {

		var store = window.localStorage;

		return {
			SaveObject : function(key, value) {
				try {
					store.setItem(key, JSON.stringify(value));
				} catch(err) {
					console.log("### ERROR: Could not save " + key + ". " + err);
				}
			},
			GetObject : function(key) {
				return JSON.parse(store.getItem(key));
			},
			Kill : function(key) {
				store.removeItem(key);
			}
		};
	};

	var l = new local();
	console.log("### REQUIRE: Loaded localStore.js");

	return l;
});
