'use strict';

function createPoint(longitude, latitude) {
	return {
		type: 'Point',
		coordinates : [ longitude, latitude ]
	};
}

function createPolygonFromBox(box) {
	return {
		type: 'Polygon',
		coordinates : [[
			[box[0], box[1]],
			[box[2], box[1]],
			[box[2], box[3]],
			[box[0], box[3]],			
			[box[0], box[1]]
		]]
	};
}

exports.createPoint = createPoint;
exports.createPolygonFromBox = createPolygonFromBox;
