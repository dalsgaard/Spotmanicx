var request = require('request');

var yrjson = require('./yr_json');
var gnjson = require('./geonames_json');

function Forecast(db) {
  this.db = db;
}

Forecast.prototype.findForecast = function(url, callback) {
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var doc = yrjson.parse(body);
      callback(null, doc);
    } else {
      var e = error ? error : response.statusCode;
      callback(e);
    }
  });
}

Forecast.prototype.forecast = function(id, callback) {
  var that = this;
  if (this.db) {
    this.db.get(id, function(error, reply) {
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
            that.db.set(id, JSON.stringify(doc), function(error, reply) {
              if (error) {
                callback(null, doc);
              } else {
                console.log("Forecast %s stored in cache", id);
                var sec = 3600; //TODO: Calculate seconds to expiration
                that.db.expire(id, sec, function(error, reply) {
                  if (error) {
                    console.log("Could not expire forecast %s\n(%s)!", id, error);
                    //TODO: Do something smart
                    callback(null, doc);
                  } else {
                    console.log("Forecast %s will expire in %d seconds", id, sec);
                    callback(null, doc);
                  }
                });
              }
            });
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

Forecast.prototype.findPlace = function(longitude, latitude, callback) {
  var that = this;
  gnjson.find(longitude, latitude, function(err, place) {
    if (err) {
      callback(err, null, null);
    } else if (place) {
      var id = yrjson.makeId(place);
      place.id = id;
      that.forecast(id, function(error, forecast) {
        callback(error, place, forecast);
      });
    } else {
      callback(null, null, null);
    }
  });
}

exports.Forecast = Forecast;