require(["localStore", "mobile", "server", "router"], function(local, mobile, server, router) {

	// console.log = function(text) {
	// $("#console").append("<p>" + JSON.stringify(text) + "</p>");
	// };

	// var byron = {
	// "Name" : "Byron",
	// "_id" : "50e1fd721b56b65046000001"
	// };
	//
	// var colin = {
	// "Name" : "Colin",
	// "_id" : "50e1fd721b56b65046000002"
	// };
	//
	// var y = 35.898698, x = -86.397171;
	// var y2 = 35.89842, x2 = -86.39715;

	var user = local.GetObject("user");
	console.log(user);
	if (user) {
		router.GoToView.Home();
	} else {
		router.GoToView.Login();
	}

	// socket.on("welcome", function(player) {
	// console.log("Received welcome:");
	// console.log(player);
	//
	// console.log("Getting nearby players...");
	//
	// $("#tag-byron").click(function() {
	// socket.emit('tag', {
	// TaggerId : colin._id,
	// TaggedId : byron._id,
	// });
	// });
	//
	// $("#colin").click(function() {
	// socket.emit('updateLocation', {
	// PlayerId : colin._id,
	// X : x,
	// Y : y
	// });
	// });
	//
	// $("#tag-colin").click(function() {
	// socket.emit('tag', {
	// TaggerId : byron._id,
	// TaggedId : colin._id,
	// });
	// });
	//
	// socket.on('playerLocationChanged', function(newLocation) {
	// console.log("playerLocationChanged");
	// console.log(newLocation);
	// });
	//
	// socket.on('tagged', function(tagReport) {
	// console.log("You were tagged by " + tagReport.TaggedBy.Name + "!");
	// console.log(tagReport);
	// });

	//}); Ï
});
