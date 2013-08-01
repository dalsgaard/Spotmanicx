'use strict';

var cheerio = require('cheerio');

function addLocation(root, doc) {
  var loc = root.find("> location");
  var geo = loc.find("> location");
  doc.location = {
    name: loc.find("> name").text(),
    latitude: geo.attr('latitude'),
    longitude: geo.attr('longitude')
  };
}

function addMeta(root, doc) {
  var meta = root.find("> meta")
  doc.meta = {
    lastUpdate: meta.find("> lastupdate").text(),
    nextUpdate: meta.find("> nextupdate").text()
  }
}

function addForecast(root, doc, xml) {
  var forecast = [];
  doc.forecast = forecast;
  var times = root.find("> forecast > tabular > time");
  times.each(function() {
    var element = xml(this);
    var time = {
      from: element.attr('from'),
      to: element.attr('to'),
      direction: parseFloat(element.find("> windDirection").attr('deg')),
      speed: parseFloat(element.find("> windSpeed").attr('mps'))
    };
    forecast.push(time);
  });
}

function parse(text) {
  var doc = {};
  var xml = cheerio.load(text, {
    ignoreWhitespace: true,
    xmlMode: true
  });
  var root = xml("weatherdata");
  addLocation(root, doc);
  addMeta(root, doc);
  addForecast(root, doc, xml);
  return doc;
}

function makeId(place) {
  var id = place.country.replace(/\s/g, '_') + "/";
  id = id + place.admin.replace(/\s/g, '_') + "/";
  id = id + place.name.replace(/\s/g, '_');
  return id;
}

function makeUrl(id) {
  var url = "http://www.yr.no/place/";
  url = url + id;
  url = url + "/forecast_hour_by_hour.xml";
  return url;
}

exports.makeId = makeId;
exports.makeUrl = makeUrl;
exports.parse = parse;
