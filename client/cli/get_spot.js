#!/usr/bin/env node
var argv = require('optimist').argv;
var mongo = require('mongodb');

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

	var spot = new Spot(forecast, db);
	
	if (argv.all) {
		spot.all(function(error, docs) {
			if (error) {
				console.log(error);
			} else {
				console.log(JSON.stringify(docs));
			}
			db.close();
			redis.quit();
		});
	} else {
		spot.get(argv.id, function(error, doc) {
			if (error) {
				console.log(error);
			} else {
				console.log(JSON.stringify(doc));
			}
			db.close();
			redis.quit();
		});
	}

});
