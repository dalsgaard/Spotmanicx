var _ = require('underscore');
var request = require('browser-request');
var leaflet = require('leaflet');
leaflet.Icon.Default.imagePath = './images';

var mapUtils = require('./map_utils');

function SpotMap() {
	this.map = leaflet.map('map').setView([56, 8.5], 10);
	leaflet.tileLayer('http://{s}.tile.cloudmade.com/40272a6f04864a119ac95f9c01199fe4/997/256/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
	}).addTo(this.map);

	this.marker = leaflet.marker([56, 8.5], {draggable: true});
	this.marker.addTo(this.map);

	var that = this;
	this.marker.on('dragend', function(e) {
		console.log(this.getLatLng().toString());
	});
	this.map.on('moveend', function(e) {
  	console.log(that.map.getBounds().toBBoxString());
  	that.updateSpots();
	});

	this.spotMarkers = [];
}

SpotMap.prototype.centerMarker = function() {
	this.marker.setLatLng(this.map.getCenter());
};

SpotMap.prototype.updateSpots = function(bbox) {
	var that = this;
	var url = '/spots/box/' + this.map.getBounds().toBBoxString()
	request({method: 'GET', url: url, json: true}, function (err, response, body) {
		_.each(that.spotMarkers, function(marker) {
			that.map.removeLayer(marker);
		});
		that.spotMarkers = [];
		_.each(body, function(spot) {
			var coord = spot.location.coordinates
			console.log(coord);
			var marker = mapUtils.pointToMarker(spot.location).addTo(that.map);
			that.spotMarkers.push(marker);
		});
		if (that.onSpotsUpdated) {
			that.onSpotsUpdated(body);
		}
	});
};

exports.SpotMap = SpotMap;
