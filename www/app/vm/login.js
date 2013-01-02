define(["server", "localStore"], function(server, local) {

	var viewModel = function() {

		var username = ko.observable();
		var password = ko.observable();

		var login = function() {
			//all I want to do for now is 1) look up the username in the server, 2) store the user data in local storage
			//for now, no actual password checks

			//look up username in server
			server.Login(username(), password()).done(function(user) {
				//store user data in local storage
				local.SaveObject("user", user);

				var router = require("router");
				router.GoToView.Home();
			}).fail(function(err) {
				console.log(err);
				alert(err);
			});
		};

		return {
			Username : username,
			Password : password,
			Login : login
		};
	};

	return viewModel;
});
