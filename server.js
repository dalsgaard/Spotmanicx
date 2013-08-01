var restify = require('restify');

var redis = require('redis').createClient();
redis.on('error', function (err) {
  console.log("Error " + err);
});

var Forecast = require('./lib/forecast').Forecast;
var forecast = new Forecast(redis);


function respond(req, res, next) {
  res.send('hello ' + req.params.name);
}

function createSpot(req, res, next) {
	console.log(req.body.foo);
	res.send(201);
}

function getForecast(req, res, next) {

}

var server = restify.createServer();
server.use(restify.bodyParser());

server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

server.post('/spot', createSpot);

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});