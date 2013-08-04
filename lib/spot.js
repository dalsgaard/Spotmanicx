'use strict';

var async = require('async');
var ObjectID = require('mongodb').ObjectID;
var geoUtils = require('./geo_utils');

function Spot(forecast, db) {
	this.forecast = forecast;
	this.db = db;
}

function addForecast(spot, callback) {
	this.forecast.findPlace(spot.location.coordinates, function(error, place) {
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

Spot.prototype.create = async.compose(saveSpot, addForecast);

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

Spot.prototype.box = function(box, callback) {
	var spots = this.db.collection('spots');
	var polygon = geoUtils.createPolygonFromBox(box);
	spots.find({
		location: {
			$geoWithin: {
				$geometry: polygon
			}
		}
	}).toArray(function(error, docs) {
		callback(error, docs);
	});
};

exports.Spot = Spot;
