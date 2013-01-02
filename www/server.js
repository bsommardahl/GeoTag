var express = require('express');

var app = express();

console.log(__dirname);

app.configure(function() {	
	app.use('/images', express.static(__dirname + '/images'));
	app.use('/', express.static(__dirname + '/'));
	app.use('/css', express.static(__dirname + '/css'));
	app.use('/js', express.static(__dirname + '/js'));
	app.use('/app', express.static(__dirname + '/app'));
	app.use('/views', express.static(__dirname + '/views'));
	app.set('port', process.env.PORT || 3000);
	app.set('view engine', 'html');
	app.engine('html', require('hbs').__express);
	app.use(express.logger('dev'));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(app.router);		
});

app.configure('development', function() {
	app.use(express.errorHandler());
});

app.get('/', function(req, res){
    res.render(__dirname + '/index.html');
});

var http = require('http');
http.createServer(app).listen(app.get('port'), function() {
	console.log("GeoTag Front-End listening on port " + app.get('port'));
});
