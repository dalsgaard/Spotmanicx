'use strict';

var _ = require('underscore');
var async = require('async');
var ObjectID = require('mongodb').ObjectID;

var geoUtils = require('./geo_utils');
var errorUtils = require('./error_utils')
var error = new errorUtils.ErrorUtils('Spot');

function Spot(forecast, db) {
	this.forecast = forecast;
	this.db = db;
}

Spot.prototype.addForecast = function(spot, callback) {
	this.forecast.findPlace(spot.location.coordinates, function(err, place) {
		if (err) {
			callback(err, null);
		} else {
			if (place) {
				spot.forecast = place;
			}
			callback(null, spot);
		}
	});
};

Spot.prototype.saveSpot = function(spot, callback) {
	var spots = this.db.collection('spots');
	spots.insert(spot, function(err, docs) {
		if (err) {
			if (err.code === 11000) {
				callback(error.createValidationError(['Name has to be unique']), null);
			} else {
				callback(error.createError(), null);
			}
		} else {
			callback(null, docs[0]);
		}
	});	
};

Spot.prototype.create = async.compose(Spot.prototype.saveSpot, Spot.prototype.addForecast);

Spot.prototype.get = function(id, callback) {
	var that = this;
	var spots = this.db.collection('spots');
	spots.findOne({_id: new ObjectID(id)}, function(err, doc) {
		that.addForecastUrl(doc);
		callback(err, doc);
	});
};

Spot.prototype.all = function(callback) {
	var that = this;
	var spots = this.db.collection('spots');
	spots.find().toArray(function(err, docs) {
		that.addForecastUrls(docs);
		callback(err, docs);
	});
};

Spot.prototype.box = function(box, callback) {
	var that = this;
	var spots = this.db.collection('spots');
	var polygon = geoUtils.createPolygonFromBox(box);
	spots.find({
		location: {
			$geoWithin: {
				$geometry: polygon
			}
		}
	}).toArray(function(err, docs) {
		that.addForecastUrls(docs);
		callback(err, docs);
	});
};

Spot.prototype.updateName = function(id, name, callback) {
	var spots = this.db.collection('spots');
	spots.update({_id: new ObjectID(id)}, {$set: {name: name}}, {safe: true}, function(err, result) {
		callback(err, result);
	});	
};

Spot.prototype.updateDirections = function(id, directions, callback) {
	var spots = this.db.collection('spots');
	spots.update({_id: new ObjectID(id)}, {$set: {directions: directions}}, {safe: true}, function(err, result) {
		callback(err, result);
	});	
};

Spot.prototype.addForecastUrls = function(spots) {
	_.each(spots, function(spot) {
		spot.forecast.url = '/forecasts/' + spot.forecast.id
	});
};

Spot.prototype.addForecastUrl = function(spot) {
	spot.forecast.url = '/forecasts/' + spot.forecast.id
};

exports.Spot = Spot;
