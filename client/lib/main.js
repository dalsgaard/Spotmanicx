var spotMap = require('./map');
var Forecast = require('./forecast').Forecast;

$(function() {

	var map = new spotMap.SpotMap();
	var forecast = new Forecast();

	$('#buttons li.center').click(function() {
		map.centerMarker();
	});

	map.onSpotsUpdated = function(spots) {
		console.dir(spots);
		forecast.update(spots);
	};

});
