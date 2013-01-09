define(["server", "localstore"], function(server, local) {

	console.log("### REQUIRE: Loading register.js...");

	var viewModel = function() {

		var name = ko.observable();
		var username = ko.observable();
		var password = ko.observable();
		var confirmation = ko.observable();

		server.Events.SetOnPlayerAlreadyExists(function(registration){
			toastr.error("There is already a player with that username. Please try another username or login.");				
		});
		
		var register = function() {
			if (password() == confirmation()) {
				var user = {
					Name : name(),
					Password : password(),
					Username : username()
				};
				server.Register(user).done(function(player) {
					//store user data in local storage
					local.SaveObject("user", player);

					var router = require("router");
					router.GoToView.Home();
				}).fail(function(err) {
					alert(err);
				});
			} else {
				alert("Passwords don't match.");
			}
		};

		return {
			Name : name,
			Username : username,
			Password : password,
			PasswordConfirmation : confirmation,

			Register : register,
			GoToLogin : function() {
				require("router").GoToView.Login();
			}
		};
	};

	console.log("### REQUIRE: Loaded register.js...");

	return viewModel;
});
