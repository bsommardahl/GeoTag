define(function() {
	var viewPath = "/views/";
	if (window.device) {
		viewPath = "views/";
	}

	return {
		ApiUrl : "http://localhost:3001",
		ViewPath : viewPath,
		ContentContainer : $("#content")
	};
});
