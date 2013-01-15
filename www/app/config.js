define(function() {

	console.log("### REQUIRE: Loading config.js...");

	var viewPath = "/views/";
	if (window.device) {
		viewPath = "views/";
	}

	console.log("### REQUIRE: Loaded config.js");

	return {
		SocketServerUrl : 'http://localhost:3001',
		//SocketServerUrl : 'http://geotag.aws.af.cm:80',

		ViewPath : viewPath,
		ContentContainer : $("#content"),
		TagZoneRadius : 50 //meters
		//TagZoneRadius : .1*1609.34 //miles

	};
});
