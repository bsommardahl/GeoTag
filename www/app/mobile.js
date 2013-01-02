define(function() {

	var deviceReady;
	var positionChange;

	var startWatchingGPS = function() {
		var watchID = navigator.geolocation.watchPosition(positionChange, function(error) {
			console.log('gps error - code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
		}, {
			frequency : 3000 //3 seconds
		});
	};

	var app = {
		initialize : function() {
			this.bindEvents();
		},
		bindEvents : function() {
			document.addEventListener('deviceready', this.onDeviceReady, false);
		},
		onDeviceReady : function() {
			deviceReady();
			startWatchingGPS();			
		}
	};
	app.initialize();

	return {
		OnDeviceReady : deviceReady,
		OnPositionChange : positionChange
	};
});
