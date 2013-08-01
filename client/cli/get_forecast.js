#!/usr/bin/env node
var argv = require('optimist').argv;

var redis = require("redis").createClient();
redis.on("error", function (err) {
  console.log("Error " + err);
});

var Forecast = require('../../lib/forecast').Forecast;
var forecast = new Forecast(redis);

forecast.forecast(argv.id, function(error, doc) {
	if (error) {
		console.log(error);
	} else {
		console.log(JSON.stringify(doc));
	}
	redis.quit();	
});