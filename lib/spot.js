'use strict';

var async = require('async');
var ObjectID = require('mongodb').ObjectID;

function Spot(forecast, db) {
	this.forecast = forecast;
	this.db = db;
}

function addForecast(spot, callback) {
	var coordinates = spot.location.coordinates;
	var longitude = coordinates[0];
	var latitude = coordinates[1];
	this.forecast.findPlace(longitude, latitude, function(error, place) {
		if (error) {
	  	callback(error, null);
		} else {
			if (place) {
				spot.forecast = place;
			}
			callback(null, spot);
		}
	});
}

function saveSpot(spot, callback) {
	var spots = this.db.collection('spots');
	spots.insert(spot, function(error, docs) {
		if (error) {
	  	callback(error, null);
		} else {
			callback(null, docs[0])
		}
	});	
}

Spot.prototype.create = async.compose(addForecast, saveSpot);

Spot.prototype.get = function(id, callback) {
	var spots = this.db.collection('spots');
	spots.findOne({_id: new ObjectID(id)}, function(error, doc) {
		callback(error, doc);
	});
};

Spot.prototype.all = function(callback) {
	var spots = this.db.collection('spots');
	spots.find().toArray(function(error, docs) {
		callback(error, docs);
	});
};

exports.Spot = Spot;
