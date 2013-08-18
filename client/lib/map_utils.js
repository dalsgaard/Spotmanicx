var leaflet = require('leaflet');

function pointToMarker(point) {
	var coord = point.coordinates;
	return leaflet.marker([coord[1], coord[0]]);
}

exports.pointToMarker = pointToMarker;