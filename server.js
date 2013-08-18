var restify = require('restify');
var mongo = require('mongodb');
var _ = require('underscore');

var redis = require('redis').createClient();
redis.on('error', function (err) {
  console.log("Error " + err);
});

var Forecast = require('./lib/forecast').Forecast;
var forecast = new Forecast(redis);

var Spot = require('./lib/spot').Spot;

var server = restify.createServer();
server.use(restify.bodyParser({ mapParams: false }));

server.get(/^\/site\/?.*/, restify.serveStatic({
  directory: './public'
}));

function getForecast(req, res, next) {
	var id = req.params[0];
	forecast.get(id, function(error, doc) {
		if (error) {
			console.log(error);
			if (error == 404) {
				res.send(404);
			} else {
				res.send(500);
			}
		} else {
			res.send(200, doc);
		}
	});
}
server.get(/^\/forecasts\/(.+)$/, getForecast);

mongo.MongoClient.connect('mongodb://localhost:27017/spot', function(error, db) {
  if(error) throw error;
  console.log('Connected to the database');

	var spot = new Spot(forecast, db);

	function createSpot(req, res, next) {
		spot.create(req.body, function(error, doc) {
			if (error) {
				console.log(error);
				res.send(500);
			} else {
				res.send(201, doc);
			}
		});
	}
	server.post('/spots', createSpot);

	function allSpots(req, res, next) {
		spot.all(function(error, docs) {
			if (error) {
				console.log(error);
				res.send(500);
			} else {
				res.send(200, docs);
			}
		});
	}
	server.get('/spots', allSpots);

	function spotsInBox(req, res, next) {
		var box = _.map(req.params[0].split(','), function(e) {
			return parseFloat(e);
		});
		spot.box(box, function(error, docs) {
			if (error) {
				console.log(error);
				res.send(500);
			} else {
				res.send(200, docs);
			}
		});
	}
	server.get(/^\/spots\/box\/(.+)$/, spotsInBox);

	function getSpot(req, res, next) {
		spot.get(req.params.id, function(error, doc) {
			if (error) {
				console.log(error);
				res.send(500);
			} else {
				res.send(200, doc);
			}
		});
	}
	server.get('/spots/:id', getSpot);

	function updateName(req, res, next) {
		spot.updateName(req.params.id, req.body, function(error, doc) {
			if (error) {
				console.log(error);
				res.send(500);
			} else {
				res.send(200, doc);
			}
		});
	}
	server.put('/spots/:id/name', updateName);

	function updateDirections(req, res, next) {
		spot.updateDirections(req.params.id, req.body, function(error, doc) {
			if (error) {
				console.log(error);
				res.send(500);
			} else {
				res.send(200, doc);
			}
		});
	}
	server.put('/spots/:id/directions', updateDirections);

});

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});