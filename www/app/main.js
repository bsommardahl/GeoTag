require(["mobile", "server", "localstore","router"], function(mobile, server, local, router) {

	console.log("### REQUIRE: Loading main.js...");

	//need to display a loading screen here

	console.log("### STARTING DEVICE");
	mobile.Start(function() {
		console.log("### DEVICE READY");

		server.Connect(function() {
			console.log("### CONNECTED TO SERVER");

			//here is where we can remove the loading screen (i.e. replace with other screen)

			//router.SetOnLog(function(message) {
			//$("#log").append("<p>" + message + "</p>");
			// });
			// server.SetOnLog(function(message) {
			//$("#log").append("<p>" + message + "</p>");
			//});

			var user = local.GetObject("user");
			if (user) {
				router.GoToView.Home();
			} else {
				router.GoToView.Login();
			}

		});

	});

	console.log("### REQUIRE: Loaded main.js");

});
