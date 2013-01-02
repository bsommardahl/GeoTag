require(["localStore", "mobile", "server", "router"], function(local, mobile, server, router) {

	var user = local.GetObject("user");
	if (user) {		
		router.GoToView.Home();		
	} else {
		router.GoToView.Login();
	}
});
