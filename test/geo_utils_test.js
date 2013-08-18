var should = require('should');

var geoUtils = require('../lib/geo_utils');

describe('Geo Utils', function() {
  describe('#createPoint()', function() {
    it("should set the 'type' property to 'Point'", function() {
    	var p = geoUtils.createPoint(5, 5);
      p.type.should.equal('Point');
    });
  });
});