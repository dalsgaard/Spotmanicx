var argv = require('optimist').argv;
var restify = require('restify');

var geoUtils = require('../../lib/geo_utils');

var location = geoUtils.createPoint(argv.lon, argv.lat);
var doc = {
	name: argv.name,
	location: location,
	directions: [200, 340]
};

var client = restify.createJsonClient({
  url: 'http://0.0.0.0:8080',
  version: '*'
});

client.post('/spots', doc, function(err, req, res, obj) {
  if (err) {
  	console.log(err);
  } else {
	  console.log('%d -> %j', res.statusCode, res.headers);
  	console.log('%j', obj);
  }
  client.close();
});