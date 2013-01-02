define(["config", "vm/login", "vm/home"], function(config, login, home) {

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

	return {
		GoToView : {
			Login : function() {
				displayView("login", new login());
			},
			Home : function() {
				displayView("home", new home());
			}
		}
	};
});
