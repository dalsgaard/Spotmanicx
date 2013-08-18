var _ = require('underscore');
var request = require('browser-request');
var mustache = require('mustache');

var spotTemplate = mustache.compile("<li><div>{{name}}</div><ul class='forecast'><li>Loading...</li></ul></li>");
var forecastTemplate = mustache.compile("<li>{{speed}}</li>");

function withinDirections(direction, directions) {
	var interval = directions[0];
	var from = interval[0];
	var to = interval[1];
	console.log(direction + ': ' + from + '->' + to);
	if (from < to) {
		return direction >= from && direction <= to;
	} else {
		return direction >= from || direction <= to;
	}
}

function color(forecast, minSpeed, directions) {
	var within = withinDirections(forecast.direction, directions);
	console.log(within);
	var speed = forecast.speed;
	if (speed < minSpeed) {
		var i = Math.round(speed / minSpeed * 255);
		if (within) {
			return 'rgba(0, ' + i + ', 255, 1)';
		} else {
			return 'rgba(' + i + ', 0, 255, 1)';
		}
	} else {
		if (within) {
			return 'rgba(0, 255, 0, 1)';
		} else {
			return 'rgba(255, 0, 0, 1)';
		}
	}
}

function Forecast() {
	this.container = $('#forecast');
}

Forecast.prototype.update = function(spots) {
	var that = this;
	this.container.empty();
	_.each(spots, function(spot) {
		var li = $(spotTemplate(spot));
		var ul = li.find('ul');
		that.container.append(li);
		var url = spot.forecast.url;
		request({method: 'GET', url: url, json: true}, function (err, response, body) {
			console.dir(body);
			ul.empty();
			_.each(body.forecast, function(e) {
				var li = $(forecastTemplate(e));
				li.css('background-color', color(e, 6.1, spot.directions));
				ul.append(li);
			});
		});
	});
};

exports.Forecast = Forecast;