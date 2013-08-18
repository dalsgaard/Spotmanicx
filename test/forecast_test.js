var should = require('chai');
var sinon = require('sinon');
var proxyquire = require('proxyquire');

describe('Forecast', function() {

  describe('findForecast()', function() {

    it("should set an error if it gets an error from the http call", function(done) {
        var stub = sinon.stub();
        stub.yieldsAsync('Foo!');
    	var forecast = proxyquire('../lib/forecast', { 'request': stub });
        var f = new forecast.Forecast();
    	f.findForecast('/forecast', function(err, doc) {
    		err.code.should.equal(0);
    		done();
    	});
    });

  });

});
