'use strict';

var request = require('request');
var cheerio = require('cheerio');

var geoUtils = require('./geo_utils');

function parse(text) {
  var xml = cheerio.load(text, {
    ignoreWhitespace: true,
    xmlMode: true
  });
  var root = xml("geonames > geoname");
  if (root.length == 0) {
    return null;
  } else {
    var longitude = root.find('lng').text();
    var latitude = root.find('lat').text();
    var location = geoUtils.createPoint(longitude, latitude);
    var doc = {
      name: root.find('name').text(),
      country: root.find('countryName').text(),
      admin: root.find('adminName1').text(),
      location: location
    };
    return doc;
  }
}

function find(longitude, latitude, callback) {
  var opts = {
    url: "http://api.geonames.org/findNearby",
    qs: {
      lat: latitude,
      lng: longitude,
      featureCode: 'PPL',
      style: 'FULL',
      maxRows: 1,
      username: "dalsgaard"
    }
  }
  request(opts, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var doc = parse(body);
      callback(null, doc);
    } else {
      var e = error ? error : response.statusCode;
      callback(e, null);
    }
  });
}

exports.parse = parse;
exports.find = find;