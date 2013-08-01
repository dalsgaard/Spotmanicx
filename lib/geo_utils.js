'use strict';

function createPoint(longitude, latitude) {
	return {
		type: 'Point',
		coordinates : [ longitude, latitude ]
	};
}

exports.createPoint = createPoint;