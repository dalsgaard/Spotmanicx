var request = require('request');

var yrjson = require('./yr_json');
var gnjson = require('./geonames_json');
var errorUtils = require('./error_utils')
var error = new errorUtils.ErrorUtils('Forecast');

function Forecast(db) {
  this.db = db;
}

Forecast.prototype.findForecast = function(url, callback) {
  request(url, function (err, response, body) {
    if (err) {
      callback(error.createError(), null);
    } else {
      if (response.statusCode == 200) {
        var doc = yrjson.parse(body);
        callback(null, doc);
      } else {
        callback(error.createError(), null);
      }
    }
  });
}

Forecast.prototype.setForecast = function(key, doc, callback) {
  var that = this;
  var sec = 3600; //TODO: Calculate seconds to expiration
  this.db.setex(key, sec, JSON.stringify(doc), function(error, reply) {
    if (error) {
      callback(null, doc);
    } else {
      console.log("Forecast %s stored in cache", key);
      callback(null, doc);
    }
  });
};

Forecast.prototype.get = function(id, callback) {
  var that = this;
  if (this.db) {
    var key = 'forecast:' + id;
    this.db.get(key, function(error, reply) {
      if (!error && reply) {
        var doc = JSON.parse(reply);
        console.log("Forecast %s found in cache", id);
        callback(null, doc);
      } else {
        var url = yrjson.makeUrl(id);
        that.findForecast(url, function(error, doc) {
          if (error) {
            callback(error, null);
          } else {
            that.setForecast(key, doc, callback);
          }
        });
      }
    });
  } else {
    this.findForecast(url, function(error, doc) {
      if (error) {
        callback(e);
      } else {
        place.url = url;
        callback(null, doc);
      }
    });
  }
}

Forecast.prototype.findPlace = function(coordinates, callback) {
  var that = this;
  gnjson.find(coordinates, function(err, place) {
    if (err) {
      callback(err, null, null);
    } else if (place) {
      var id = yrjson.makeId(place);
      place.id = id;
      that.get(id, function(error, forecast) {
        callback(error, place, forecast);
      });
    } else {
      callback(null, null, null);
    }
  });
}

exports.Forecast = Forecast;
