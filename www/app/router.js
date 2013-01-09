define(["config", "vm/login", "vm/home", "vm/register"], function(config, login, home, register) {

	console.log("### REQUIRE: Loading router.js...");

	var onLog = function() {
	};
	var log = function(message) {
		message = "### ROUTER: " + message;
		console.log(message);
		onLog(message);
	};

	var history = function(viewName, viewModel, showTitleBar) {
		return {
			ViewName : viewName,
			ViewModel : viewModel,
			ShowTitleBar : showTitleBar,
		};
	};

	var last = [];

	var displayView = function(viewName, viewModel, showTitleBar, container) {
		var viewPath = config.ViewPath + viewName + ".html";
		log("displaying " + viewPath);
		var contentContainer = container || config.ContentContainer;
		var div = $("<div>");
		$(contentContainer).empty().append(div);
		$(div).load(viewPath, function() {
			last.push(new history(viewName, viewModel, showTitleBar));

			if (viewModel) {
				ko.applyBindings(viewModel, $(div)[0]);
			};

			// if (showTitleBar) {
			// titleBar.Show();
			// } else {
			// titleBar.Hide();
			// }
			//
			// if(session.GetStatus().IsLoggedIn){
			// navBar.Show();
			// }else{
			// navBar.Hide();
			// }
		});
	};

	var loginVm = function() {
		var vm = new login();
		vm.SetOnLog(function(message) {
			onLog(message);
		});
		displayView("login", vm);
	};

	var homeVm = function() {
		displayView("home", new home());
	};

	var registerVm = function() {
		displayView("register", new register());
	};

	console.log("### REQUIRE: Loaded router.js");

	return {
		GoToView : {
			Login : loginVm,
			Home : homeVm,
			Register : registerVm,
		},
		SetOnLog : function(cb) {
			onLog = cb;
		}
	};
});
