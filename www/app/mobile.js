define(function() {

	console.log("### REQUIRE: Loading mobile.js...");

	var currentPosition;

	var watchId;
	var startWatchingGPS = function(positionChangeCallback) {
		if (watchId) {
			//should we be disposing of the watch somehow?
		}

		watchId = navigator.geolocation.watchPosition(function(position) {
			console.log("### GPS: position changed");
			currentPosition = {
				X : position.coords.longitude,
				Y : position.coords.latitude
			};
			currentPosition = position;
			if (positionChangeCallback)
				positionChangeCallback(position);
		}, function(error) {
			console.log('gps error - code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
		}, {
			frequency : 3000 //3 seconds
		});
	};

	var start = function(whenReady) {
		if (!window.device) {
			whenReady();
		} else {
			document.addEventListener('deviceready', function() {
				whenReady();
				startWatchingGPS();
			}, false);
		}
		console.log("### MOBILE: Started.");

	};

	console.log("### REQUIRE: Loaded mobile.js");

	return {
		Start : start,
		WatchPosition : function(cb) {
			startWatchingGPS(cb);
		},
		GetCurrentPosition : currentPosition
	};
});
