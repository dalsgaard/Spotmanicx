#!/usr/bin/env node
var argv = require('optimist').argv;
var mongo = require('mongodb');

var geoUtils = require('../../lib/geo_utils');

var redis = require("redis").createClient();
redis.on("error", function (err) {
  console.log("Error " + err);
});

var Forecast = require('../../lib/forecast').Forecast;
var forecast = new Forecast(redis);

var Spot = require('../../lib/spot').Spot;

//console.log(argv);

var client = mongo.MongoClient;
client.connect('mongodb://localhost:27017/spot', function(error, db) {
  if(error) throw error;
  console.log('Connected to the database');

	var spot = new Spot(forecast, db);
	
	var location = geoUtils.createPoint(argv.lon, argv.lat);
	var doc = {
		name: argv.name,
		location: location,
		directions: [[200, 340]]
	};
	spot.create(doc, function(error, doc) {
		if (error) {
			console.log(error);
		} else {
			console.log(JSON.stringify(doc));
		}
		db.close();
		redis.quit();
	});

});
