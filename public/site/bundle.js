;(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
var _ = require('underscore');
var request = require('browser-request');
var mustache = require('mustache');

var spotTemplate = mustache.compile("<li><div>{{name}}</div><ul class='forecast'><li>Loading...</li></ul></li>");
var forecastTemplate = mustache.compile("<li>{{speed}}</li>");

function withinDirections(direction, directions) {
	var interval = directions[0];
	var from = interval[0];
	var to = interval[1];
	console.log(direction + ': ' + from + '->' + to);
	if (from < to) {
		return direction >= from && direction <= to;
	} else {
		return direction >= from || direction <= to;
	}
}

function color(forecast, minSpeed, directions) {
	var within = withinDirections(forecast.direction, directions);
	console.log(within);
	var speed = forecast.speed;
	if (speed < minSpeed) {
		var i = Math.round(speed / minSpeed * 255);
		if (within) {
			return 'rgba(0, ' + i + ', 255, 1)';
		} else {
			return 'rgba(' + i + ', 0, 255, 1)';
		}
	} else {
		if (within) {
			return 'rgba(0, 255, 0, 1)';
		} else {
			return 'rgba(255, 0, 0, 1)';
		}
	}
}

function Forecast() {
	this.container = $('#forecast');
}

Forecast.prototype.update = function(spots) {
	var that = this;
	this.container.empty();
	_.each(spots, function(spot) {
		var li = $(spotTemplate(spot));
		var ul = li.find('ul');
		that.container.append(li);
		var url = spot.forecast.url;
		request({method: 'GET', url: url, json: true}, function (err, response, body) {
			console.dir(body);
			ul.empty();
			_.each(body.forecast, function(e) {
				var li = $(forecastTemplate(e));
				li.css('background-color', color(e, 6.1, spot.directions));
				ul.append(li);
			});
		});
	});
};

exports.Forecast = Forecast;
},{"browser-request":5,"mustache":8,"underscore":9}],2:[function(require,module,exports){
var spotMap = require('./map');
var Forecast = require('./forecast').Forecast;

$(function() {

	var map = new spotMap.SpotMap();
	var forecast = new Forecast();

	$('#buttons li.center').click(function() {
		map.centerMarker();
	});

	map.onSpotsUpdated = function(spots) {
		console.dir(spots);
		forecast.update(spots);
	};

});

},{"./forecast":1,"./map":3}],3:[function(require,module,exports){
var _ = require('underscore');
var request = require('browser-request');
var leaflet = require('leaflet');
leaflet.Icon.Default.imagePath = './images';

var mapUtils = require('./map_utils');

function SpotMap() {
	this.map = leaflet.map('map').setView([56, 8.5], 10);
	leaflet.tileLayer('http://{s}.tile.cloudmade.com/40272a6f04864a119ac95f9c01199fe4/997/256/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
	}).addTo(this.map);

	this.marker = leaflet.marker([56, 8.5], {draggable: true});
	this.marker.addTo(this.map);

	var that = this;
	this.marker.on('dragend', function(e) {
		console.log(this.getLatLng().toString());
	});
	this.map.on('moveend', function(e) {
  	console.log(that.map.getBounds().toBBoxString());
  	that.updateSpots();
	});

	this.spotMarkers = [];
}

SpotMap.prototype.centerMarker = function() {
	this.marker.setLatLng(this.map.getCenter());
};

SpotMap.prototype.updateSpots = function(bbox) {
	var that = this;
	var url = '/spots/box/' + this.map.getBounds().toBBoxString()
	request({method: 'GET', url: url, json: true}, function (err, response, body) {
		_.each(that.spotMarkers, function(marker) {
			that.map.removeLayer(marker);
		});
		that.spotMarkers = [];
		_.each(body, function(spot) {
			var coord = spot.location.coordinates
			console.log(coord);
			var marker = mapUtils.pointToMarker(spot.location).addTo(that.map);
			that.spotMarkers.push(marker);
		});
		if (that.onSpotsUpdated) {
			that.onSpotsUpdated(body);
		}
	});
};

exports.SpotMap = SpotMap;

},{"./map_utils":4,"browser-request":5,"leaflet":7,"underscore":9}],4:[function(require,module,exports){
var leaflet = require('leaflet');

function pointToMarker(point) {
	var coord = point.coordinates;
	return leaflet.marker([coord[1], coord[0]]);
}

exports.pointToMarker = pointToMarker;
},{"leaflet":7}],5:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var xmlhttprequest = require('./xmlhttprequest')
if(!xmlhttprequest || typeof xmlhttprequest !== 'object')
  throw new Error('Could not find ./xmlhttprequest')

var XHR = xmlhttprequest.XMLHttpRequest
if(!XHR)
  throw new Error('Bad xmlhttprequest.XMLHttpRequest')
if(! ('_object' in (new XHR)))
  throw new Error('This is not portable XMLHttpRequest')

module.exports = request
request.XMLHttpRequest = XHR
request.log = getLogger()

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr._object)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr._object.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}

},{"./xmlhttprequest":6}],6:[function(require,module,exports){


!function(window) {
  if(typeof exports === 'undefined')
    throw new Error('Cannot find global "exports" object. Is this really CommonJS?')
  if(typeof module === 'undefined')
    throw new Error('Cannot find global "module" object. Is this really CommonJS?')
  if(!module.exports)
    throw new Error('Cannot find global "module.exports" object. Is this really CommonJS?')

  // Define globals to simulate a browser environment.
  window = window || {}

  var document = window.document || {}
  if(!window.document)
    window.document = document

  var navigator = window.navigator || {}
  if(!window.navigator)
    window.navigator = navigator

  if(!navigator.userAgent)
    navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_2) AppleWebKit/534.51.22 (KHTML, like Gecko) Version/5.1.1 Safari/534.51.22';

  // Remember the old values in window. If the inner code changes anything, export that as a module and restore the old window value.
  var win = {}
    , key

  for (key in window)
    if(window.hasOwnProperty(key))
      win[key] = window[key]

  run_code()

  for (key in window)
    if(window.hasOwnProperty(key))
      if(window[key] !== win[key]) {
        exports[key] = window[key]
        window[key] = win[key]
      }

  function run_code() {
    // Begin browser file: XMLHttpRequest.js
/**
* XMLHttpRequest.js Copyright (C) 2011 Sergey Ilinsky (http://www.ilinsky.com)
*
* This work is free software; you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as published by
* the Free Software Foundation; either version 2.1 of the License, or
* (at your option) any later version.
*
* This work is distributed in the hope that it will be useful,
* but without any warranty; without even the implied warranty of
* merchantability or fitness for a particular purpose. See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General Public License
* along with this library; if not, write to the Free Software Foundation, Inc.,
* 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA
*/

(function () {

	// Save reference to earlier defined object implementation (if any)
	var oXMLHttpRequest = window.XMLHttpRequest;

	// Define on browser type
	var bGecko  = !!window.controllers;
	var bIE     = !!window.document.namespaces;
	var bIE7    = bIE && window.navigator.userAgent.match(/MSIE 7.0/);

	// Enables "XMLHttpRequest()" call next to "new XMLHttpRequest()"
	function fXMLHttpRequest() {
		this._object  = oXMLHttpRequest && !bIE7 ? new oXMLHttpRequest : new window.ActiveXObject("Microsoft.XMLHTTP");
		this._listeners = [];
	}

	// Constructor
	function cXMLHttpRequest() {
		return new fXMLHttpRequest;
	}
	cXMLHttpRequest.prototype = fXMLHttpRequest.prototype;

	// BUGFIX: Firefox with Firebug installed would break pages if not executed
	if (bGecko && oXMLHttpRequest.wrapped) {
		cXMLHttpRequest.wrapped = oXMLHttpRequest.wrapped;
	}

	// Constants
	cXMLHttpRequest.UNSENT            = 0;
	cXMLHttpRequest.OPENED            = 1;
	cXMLHttpRequest.HEADERS_RECEIVED  = 2;
	cXMLHttpRequest.LOADING           = 3;
	cXMLHttpRequest.DONE              = 4;

	// Interface level constants
	cXMLHttpRequest.prototype.UNSENT            = cXMLHttpRequest.UNSENT;
	cXMLHttpRequest.prototype.OPENED            = cXMLHttpRequest.OPENED;
	cXMLHttpRequest.prototype.HEADERS_RECEIVED  = cXMLHttpRequest.HEADERS_RECEIVED;
	cXMLHttpRequest.prototype.LOADING           = cXMLHttpRequest.LOADING;
	cXMLHttpRequest.prototype.DONE              = cXMLHttpRequest.DONE;

	// Public Properties
	cXMLHttpRequest.prototype.readyState    = cXMLHttpRequest.UNSENT;
	cXMLHttpRequest.prototype.responseText  = '';
	cXMLHttpRequest.prototype.responseXML   = null;
	cXMLHttpRequest.prototype.status        = 0;
	cXMLHttpRequest.prototype.statusText    = '';

	// Priority proposal
	cXMLHttpRequest.prototype.priority    = "NORMAL";

	// Instance-level Events Handlers
	cXMLHttpRequest.prototype.onreadystatechange  = null;

	// Class-level Events Handlers
	cXMLHttpRequest.onreadystatechange  = null;
	cXMLHttpRequest.onopen              = null;
	cXMLHttpRequest.onsend              = null;
	cXMLHttpRequest.onabort             = null;

	// Public Methods
	cXMLHttpRequest.prototype.open  = function(sMethod, sUrl, bAsync, sUser, sPassword) {
		// http://www.w3.org/TR/XMLHttpRequest/#the-open-method
		var sLowerCaseMethod = sMethod.toLowerCase();
		if (sLowerCaseMethod == "connect" || sLowerCaseMethod == "trace" || sLowerCaseMethod == "track") {
			// Using a generic error and an int - not too sure all browsers support correctly
			// http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#securityerror, so, this is safer
			// XXX should do better than that, but this is OT to XHR.
			throw new Error(18);
		}

		// Delete headers, required when object is reused
		delete this._headers;

		// When bAsync parameter value is omitted, use true as default
		if (arguments.length < 3) {
			bAsync  = true;
		}

		// Save async parameter for fixing Gecko bug with missing readystatechange in synchronous requests
		this._async   = bAsync;

		// Set the onreadystatechange handler
		var oRequest  = this;
		var nState    = this.readyState;
		var fOnUnload = null;

		// BUGFIX: IE - memory leak on page unload (inter-page leak)
		if (bIE && bAsync) {
			fOnUnload = function() {
				if (nState != cXMLHttpRequest.DONE) {
					fCleanTransport(oRequest);
					// Safe to abort here since onreadystatechange handler removed
					oRequest.abort();
				}
			};
			window.attachEvent("onunload", fOnUnload);
		}

		// Add method sniffer
		if (cXMLHttpRequest.onopen) {
			cXMLHttpRequest.onopen.apply(this, arguments);
		}

		if (arguments.length > 4) {
			this._object.open(sMethod, sUrl, bAsync, sUser, sPassword);
		} else if (arguments.length > 3) {
			this._object.open(sMethod, sUrl, bAsync, sUser);
		} else {
			this._object.open(sMethod, sUrl, bAsync);
		}

		this.readyState = cXMLHttpRequest.OPENED;
		fReadyStateChange(this);

		this._object.onreadystatechange = function() {
			if (bGecko && !bAsync) {
				return;
			}

			// Synchronize state
			oRequest.readyState   = oRequest._object.readyState;
			fSynchronizeValues(oRequest);

			// BUGFIX: Firefox fires unnecessary DONE when aborting
			if (oRequest._aborted) {
				// Reset readyState to UNSENT
				oRequest.readyState = cXMLHttpRequest.UNSENT;

				// Return now
				return;
			}

			if (oRequest.readyState == cXMLHttpRequest.DONE) {
				// Free up queue
				delete oRequest._data;

				// Uncomment these lines for bAsync
				/**
				 * if (bAsync) {
				 * 	fQueue_remove(oRequest);
				 * }
				 */

				fCleanTransport(oRequest);

				// Uncomment this block if you need a fix for IE cache
				/**
				 * // BUGFIX: IE - cache issue
				 * if (!oRequest._object.getResponseHeader("Date")) {
				 * 	// Save object to cache
				 * 	oRequest._cached  = oRequest._object;
				 *
				 * 	// Instantiate a new transport object
				 * 	cXMLHttpRequest.call(oRequest);
				 *
				 * 	// Re-send request
				 * 	if (sUser) {
				 * 		if (sPassword) {
				 * 			oRequest._object.open(sMethod, sUrl, bAsync, sUser, sPassword);
				 * 		} else {
				 * 			oRequest._object.open(sMethod, sUrl, bAsync);
				 * 		}
				 *
				 * 		oRequest._object.setRequestHeader("If-Modified-Since", oRequest._cached.getResponseHeader("Last-Modified") || new window.Date(0));
				 * 		// Copy headers set
				 * 		if (oRequest._headers) {
				 * 			for (var sHeader in oRequest._headers) {
				 * 				// Some frameworks prototype objects with functions
				 * 				if (typeof oRequest._headers[sHeader] == "string") {
				 * 					oRequest._object.setRequestHeader(sHeader, oRequest._headers[sHeader]);
				 * 				}
				 * 			}
				 * 		}
				 * 		oRequest._object.onreadystatechange = function() {
				 * 			// Synchronize state
				 * 			oRequest.readyState   = oRequest._object.readyState;
				 *
				 * 			if (oRequest._aborted) {
				 * 				//
				 * 				oRequest.readyState = cXMLHttpRequest.UNSENT;
				 *
				 * 				// Return
				 * 				return;
				 * 			}
				 *
				 * 			if (oRequest.readyState == cXMLHttpRequest.DONE) {
				 * 				// Clean Object
				 * 				fCleanTransport(oRequest);
				 *
				 * 				// get cached request
				 * 				if (oRequest.status == 304) {
				 * 					oRequest._object  = oRequest._cached;
				 * 				}
				 *
				 * 				//
				 * 				delete oRequest._cached;
				 *
				 * 				//
				 * 				fSynchronizeValues(oRequest);
				 *
				 * 				//
				 * 				fReadyStateChange(oRequest);
				 *
				 * 				// BUGFIX: IE - memory leak in interrupted
				 * 				if (bIE && bAsync) {
				 * 					window.detachEvent("onunload", fOnUnload);
				 * 				}
				 *
				 * 			}
				 * 		};
				 * 		oRequest._object.send(null);
				 *
				 * 		// Return now - wait until re-sent request is finished
				 * 		return;
				 * 	};
				 */

				// BUGFIX: IE - memory leak in interrupted
				if (bIE && bAsync) {
					window.detachEvent("onunload", fOnUnload);
				}

				// BUGFIX: Some browsers (Internet Explorer, Gecko) fire OPEN readystate twice
				if (nState != oRequest.readyState) {
					fReadyStateChange(oRequest);
				}

				nState  = oRequest.readyState;
			}
		};
	};

	cXMLHttpRequest.prototype.send = function(vData) {
		// Add method sniffer
		if (cXMLHttpRequest.onsend) {
			cXMLHttpRequest.onsend.apply(this, arguments);
		}

		if (!arguments.length) {
			vData = null;
		}

		// BUGFIX: Safari - fails sending documents created/modified dynamically, so an explicit serialization required
		// BUGFIX: IE - rewrites any custom mime-type to "text/xml" in case an XMLNode is sent
		// BUGFIX: Gecko - fails sending Element (this is up to the implementation either to standard)
		if (vData && vData.nodeType) {
			vData = window.XMLSerializer ? new window.XMLSerializer().serializeToString(vData) : vData.xml;
			if (!this._headers["Content-Type"]) {
				this._object.setRequestHeader("Content-Type", "application/xml");
			}
		}

		this._data = vData;

		/**
		 * // Add to queue
		 * if (this._async) {
		 * 	fQueue_add(this);
		 * } else { */
		fXMLHttpRequest_send(this);
		 /**
		 * }
		 */
	};

	cXMLHttpRequest.prototype.abort = function() {
		// Add method sniffer
		if (cXMLHttpRequest.onabort) {
			cXMLHttpRequest.onabort.apply(this, arguments);
		}

		// BUGFIX: Gecko - unnecessary DONE when aborting
		if (this.readyState > cXMLHttpRequest.UNSENT) {
			this._aborted = true;
		}

		this._object.abort();

		// BUGFIX: IE - memory leak
		fCleanTransport(this);

		this.readyState = cXMLHttpRequest.UNSENT;

		delete this._data;

		/* if (this._async) {
	 	* 	fQueue_remove(this);
	 	* }
	 	*/
	};

	cXMLHttpRequest.prototype.getAllResponseHeaders = function() {
		return this._object.getAllResponseHeaders();
	};

	cXMLHttpRequest.prototype.getResponseHeader = function(sName) {
		return this._object.getResponseHeader(sName);
	};

	cXMLHttpRequest.prototype.setRequestHeader  = function(sName, sValue) {
		// BUGFIX: IE - cache issue
		if (!this._headers) {
			this._headers = {};
		}

		this._headers[sName]  = sValue;

		return this._object.setRequestHeader(sName, sValue);
	};

	// EventTarget interface implementation
	cXMLHttpRequest.prototype.addEventListener  = function(sName, fHandler, bUseCapture) {
		for (var nIndex = 0, oListener; oListener = this._listeners[nIndex]; nIndex++) {
			if (oListener[0] == sName && oListener[1] == fHandler && oListener[2] == bUseCapture) {
				return;
			}
		}

		// Add listener
		this._listeners.push([sName, fHandler, bUseCapture]);
	};

	cXMLHttpRequest.prototype.removeEventListener = function(sName, fHandler, bUseCapture) {
		for (var nIndex = 0, oListener; oListener = this._listeners[nIndex]; nIndex++) {
			if (oListener[0] == sName && oListener[1] == fHandler && oListener[2] == bUseCapture) {
				break;
			}
		}

		// Remove listener
		if (oListener) {
			this._listeners.splice(nIndex, 1);
		}
	};

	cXMLHttpRequest.prototype.dispatchEvent = function(oEvent) {
		var oEventPseudo  = {
			'type':             oEvent.type,
			'target':           this,
			'currentTarget':    this,
			'eventPhase':       2,
			'bubbles':          oEvent.bubbles,
			'cancelable':       oEvent.cancelable,
			'timeStamp':        oEvent.timeStamp,
			'stopPropagation':  function() {},  // There is no flow
			'preventDefault':   function() {},  // There is no default action
			'initEvent':        function() {}   // Original event object should be initialized
		};

		// Execute onreadystatechange
		if (oEventPseudo.type == "readystatechange" && this.onreadystatechange) {
			(this.onreadystatechange.handleEvent || this.onreadystatechange).apply(this, [oEventPseudo]);
		}


		// Execute listeners
		for (var nIndex = 0, oListener; oListener = this._listeners[nIndex]; nIndex++) {
			if (oListener[0] == oEventPseudo.type && !oListener[2]) {
				(oListener[1].handleEvent || oListener[1]).apply(this, [oEventPseudo]);
			}
		}

	};

	//
	cXMLHttpRequest.prototype.toString  = function() {
		return '[' + "object" + ' ' + "XMLHttpRequest" + ']';
	};

	cXMLHttpRequest.toString  = function() {
		return '[' + "XMLHttpRequest" + ']';
	};

	/**
	 * // Queue manager
	 * var oQueuePending = {"CRITICAL":[],"HIGH":[],"NORMAL":[],"LOW":[],"LOWEST":[]},
	 * aQueueRunning = [];
	 * function fQueue_add(oRequest) {
	 * 	oQueuePending[oRequest.priority in oQueuePending ? oRequest.priority : "NORMAL"].push(oRequest);
	 * 	//
	 * 	setTimeout(fQueue_process);
	 * };
	 *
	 * function fQueue_remove(oRequest) {
	 * 	for (var nIndex = 0, bFound = false; nIndex < aQueueRunning.length; nIndex++)
	 * 	if (bFound) {
	 * 		aQueueRunning[nIndex - 1] = aQueueRunning[nIndex];
	 * 	} else {
	 * 		if (aQueueRunning[nIndex] == oRequest) {
	 * 			bFound  = true;
	 * 		}
	 * }
	 *
	 * 	if (bFound) {
	 * 		aQueueRunning.length--;
	 * 	}
	 *
	 *
	 * 	//
	 * 	setTimeout(fQueue_process);
	 * };
	 *
	 * function fQueue_process() {
	 * if (aQueueRunning.length < 6) {
	 * for (var sPriority in oQueuePending) {
	 * if (oQueuePending[sPriority].length) {
	 * var oRequest  = oQueuePending[sPriority][0];
	 * oQueuePending[sPriority]  = oQueuePending[sPriority].slice(1);
	 * //
	 * aQueueRunning.push(oRequest);
	 * // Send request
	 * fXMLHttpRequest_send(oRequest);
	 * break;
	 * }
	 * }
	 * }
	 * };
	 */

	// Helper function
	function fXMLHttpRequest_send(oRequest) {
		oRequest._object.send(oRequest._data);

		// BUGFIX: Gecko - missing readystatechange calls in synchronous requests
		if (bGecko && !oRequest._async) {
			oRequest.readyState = cXMLHttpRequest.OPENED;

			// Synchronize state
			fSynchronizeValues(oRequest);

			// Simulate missing states
			while (oRequest.readyState < cXMLHttpRequest.DONE) {
				oRequest.readyState++;
				fReadyStateChange(oRequest);
				// Check if we are aborted
				if (oRequest._aborted) {
					return;
				}
			}
		}
	}

	function fReadyStateChange(oRequest) {
		// Sniffing code
		if (cXMLHttpRequest.onreadystatechange){
			cXMLHttpRequest.onreadystatechange.apply(oRequest);
		}


		// Fake event
		oRequest.dispatchEvent({
			'type':       "readystatechange",
			'bubbles':    false,
			'cancelable': false,
			'timeStamp':  new Date + 0
		});
	}

	function fGetDocument(oRequest) {
		var oDocument = oRequest.responseXML;
		var sResponse = oRequest.responseText;
		// Try parsing responseText
		if (bIE && sResponse && oDocument && !oDocument.documentElement && oRequest.getResponseHeader("Content-Type").match(/[^\/]+\/[^\+]+\+xml/)) {
			oDocument = new window.ActiveXObject("Microsoft.XMLDOM");
			oDocument.async       = false;
			oDocument.validateOnParse = false;
			oDocument.loadXML(sResponse);
		}

		// Check if there is no error in document
		if (oDocument){
			if ((bIE && oDocument.parseError !== 0) || !oDocument.documentElement || (oDocument.documentElement && oDocument.documentElement.tagName == "parsererror")) {
				return null;
			}
		}
		return oDocument;
	}

	function fSynchronizeValues(oRequest) {
		try { oRequest.responseText = oRequest._object.responseText;  } catch (e) {}
		try { oRequest.responseXML  = fGetDocument(oRequest._object); } catch (e) {}
		try { oRequest.status       = oRequest._object.status;        } catch (e) {}
		try { oRequest.statusText   = oRequest._object.statusText;    } catch (e) {}
	}

	function fCleanTransport(oRequest) {
		// BUGFIX: IE - memory leak (on-page leak)
		oRequest._object.onreadystatechange = new window.Function;
	}

	// Internet Explorer 5.0 (missing apply)
	if (!window.Function.prototype.apply) {
		window.Function.prototype.apply = function(oRequest, oArguments) {
			if (!oArguments) {
				oArguments  = [];
			}
			oRequest.__func = this;
			oRequest.__func(oArguments[0], oArguments[1], oArguments[2], oArguments[3], oArguments[4]);
			delete oRequest.__func;
		};
	}

	// Register new object with window
	window.XMLHttpRequest = cXMLHttpRequest;

})();

    // End browser file: XMLHttpRequest.js
  }
}(typeof window !== 'undefined' ? window : {});

},{}],7:[function(require,module,exports){
/*
 Leaflet, a JavaScript library for mobile-friendly interactive maps. http://leafletjs.com
 (c) 2010-2013, Vladimir Agafonkin
 (c) 2010-2011, CloudMade
*/
!function(t,e,i){var n=t.L,o={};o.version="0.6.4","object"==typeof module&&"object"==typeof module.exports?module.exports=o:"function"==typeof define&&define.amd&&define(o),o.noConflict=function(){return t.L=n,this},t.L=o,o.Util={extend:function(t){var e,i,n,o,s=Array.prototype.slice.call(arguments,1);for(i=0,n=s.length;n>i;i++){o=s[i]||{};for(e in o)o.hasOwnProperty(e)&&(t[e]=o[e])}return t},bind:function(t,e){var i=arguments.length>2?Array.prototype.slice.call(arguments,2):null;return function(){return t.apply(e,i||arguments)}},stamp:function(){var t=0,e="_leaflet_id";return function(i){return i[e]=i[e]||++t,i[e]}}(),invokeEach:function(t,e,i){var n,o;if("object"==typeof t){o=Array.prototype.slice.call(arguments,3);for(n in t)e.apply(i,[n,t[n]].concat(o));return!0}return!1},limitExecByInterval:function(t,e,i){var n,o;return function s(){var a=arguments;return n?(o=!0,void 0):(n=!0,setTimeout(function(){n=!1,o&&(s.apply(i,a),o=!1)},e),t.apply(i,a),void 0)}},falseFn:function(){return!1},formatNum:function(t,e){var i=Math.pow(10,e||5);return Math.round(t*i)/i},trim:function(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")},splitWords:function(t){return o.Util.trim(t).split(/\s+/)},setOptions:function(t,e){return t.options=o.extend({},t.options,e),t.options},getParamString:function(t,e,i){var n=[];for(var o in t)n.push(encodeURIComponent(i?o.toUpperCase():o)+"="+encodeURIComponent(t[o]));return(e&&-1!==e.indexOf("?")?"&":"?")+n.join("&")},template:function(t,e){return t.replace(/\{ *([\w_]+) *\}/g,function(t,n){var o=e[n];if(o===i)throw new Error("No value provided for variable "+t);return"function"==typeof o&&(o=o(e)),o})},isArray:function(t){return"[object Array]"===Object.prototype.toString.call(t)},emptyImageUrl:"data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="},function(){function e(e){var i,n,o=["webkit","moz","o","ms"];for(i=0;i<o.length&&!n;i++)n=t[o[i]+e];return n}function i(e){var i=+new Date,o=Math.max(0,16-(i-n));return n=i+o,t.setTimeout(e,o)}var n=0,s=t.requestAnimationFrame||e("RequestAnimationFrame")||i,a=t.cancelAnimationFrame||e("CancelAnimationFrame")||e("CancelRequestAnimationFrame")||function(e){t.clearTimeout(e)};o.Util.requestAnimFrame=function(e,n,a,r){return e=o.bind(e,n),a&&s===i?(e(),void 0):s.call(t,e,r)},o.Util.cancelAnimFrame=function(e){e&&a.call(t,e)}}(),o.extend=o.Util.extend,o.bind=o.Util.bind,o.stamp=o.Util.stamp,o.setOptions=o.Util.setOptions,o.Class=function(){},o.Class.extend=function(t){var e=function(){this.initialize&&this.initialize.apply(this,arguments),this._initHooks&&this.callInitHooks()},i=function(){};i.prototype=this.prototype;var n=new i;n.constructor=e,e.prototype=n;for(var s in this)this.hasOwnProperty(s)&&"prototype"!==s&&(e[s]=this[s]);t.statics&&(o.extend(e,t.statics),delete t.statics),t.includes&&(o.Util.extend.apply(null,[n].concat(t.includes)),delete t.includes),t.options&&n.options&&(t.options=o.extend({},n.options,t.options)),o.extend(n,t),n._initHooks=[];var a=this;return e.__super__=a.prototype,n.callInitHooks=function(){if(!this._initHooksCalled){a.prototype.callInitHooks&&a.prototype.callInitHooks.call(this),this._initHooksCalled=!0;for(var t=0,e=n._initHooks.length;e>t;t++)n._initHooks[t].call(this)}},e},o.Class.include=function(t){o.extend(this.prototype,t)},o.Class.mergeOptions=function(t){o.extend(this.prototype.options,t)},o.Class.addInitHook=function(t){var e=Array.prototype.slice.call(arguments,1),i="function"==typeof t?t:function(){this[t].apply(this,e)};this.prototype._initHooks=this.prototype._initHooks||[],this.prototype._initHooks.push(i)};var s="_leaflet_events";o.Mixin={},o.Mixin.Events={addEventListener:function(t,e,i){if(o.Util.invokeEach(t,this.addEventListener,this,e,i))return this;var n,a,r,h,l,u,c,d=this[s]=this[s]||{},p=i&&o.stamp(i);for(t=o.Util.splitWords(t),n=0,a=t.length;a>n;n++)r={action:e,context:i||this},h=t[n],i?(l=h+"_idx",u=l+"_len",c=d[l]=d[l]||{},c[p]||(c[p]=[],d[u]=(d[u]||0)+1),c[p].push(r)):(d[h]=d[h]||[],d[h].push(r));return this},hasEventListeners:function(t){var e=this[s];return!!e&&(t in e&&e[t].length>0||t+"_idx"in e&&e[t+"_idx_len"]>0)},removeEventListener:function(t,e,i){if(!this[s])return this;if(!t)return this.clearAllEventListeners();if(o.Util.invokeEach(t,this.removeEventListener,this,e,i))return this;var n,a,r,h,l,u,c,d,p,_=this[s],m=i&&o.stamp(i);for(t=o.Util.splitWords(t),n=0,a=t.length;a>n;n++)if(r=t[n],u=r+"_idx",c=u+"_len",d=_[u],e){if(h=i&&d?d[m]:_[r]){for(l=h.length-1;l>=0;l--)h[l].action!==e||i&&h[l].context!==i||(p=h.splice(l,1),p[0].action=o.Util.falseFn);i&&d&&0===h.length&&(delete d[m],_[c]--)}}else delete _[r],delete _[u];return this},clearAllEventListeners:function(){return delete this[s],this},fireEvent:function(t,e){if(!this.hasEventListeners(t))return this;var i,n,a,r,h,l=o.Util.extend({},e,{type:t,target:this}),u=this[s];if(u[t])for(i=u[t].slice(),n=0,a=i.length;a>n;n++)i[n].action.call(i[n].context||this,l);r=u[t+"_idx"];for(h in r)if(i=r[h].slice())for(n=0,a=i.length;a>n;n++)i[n].action.call(i[n].context||this,l);return this},addOneTimeEventListener:function(t,e,i){if(o.Util.invokeEach(t,this.addOneTimeEventListener,this,e,i))return this;var n=o.bind(function(){this.removeEventListener(t,e,i).removeEventListener(t,n,i)},this);return this.addEventListener(t,e,i).addEventListener(t,n,i)}},o.Mixin.Events.on=o.Mixin.Events.addEventListener,o.Mixin.Events.off=o.Mixin.Events.removeEventListener,o.Mixin.Events.once=o.Mixin.Events.addOneTimeEventListener,o.Mixin.Events.fire=o.Mixin.Events.fireEvent,function(){var n=!!t.ActiveXObject,s=n&&!t.XMLHttpRequest,a=n&&!e.querySelector,r=n&&!e.addEventListener,h=navigator.userAgent.toLowerCase(),l=-1!==h.indexOf("webkit"),u=-1!==h.indexOf("chrome"),c=-1!==h.indexOf("phantom"),d=-1!==h.indexOf("android"),p=-1!==h.search("android [23]"),_=typeof orientation!=i+"",m=t.navigator&&t.navigator.msPointerEnabled&&t.navigator.msMaxTouchPoints,f="devicePixelRatio"in t&&t.devicePixelRatio>1||"matchMedia"in t&&t.matchMedia("(min-resolution:144dpi)")&&t.matchMedia("(min-resolution:144dpi)").matches,g=e.documentElement,v=n&&"transition"in g.style,y="WebKitCSSMatrix"in t&&"m11"in new t.WebKitCSSMatrix,L="MozPerspective"in g.style,P="OTransition"in g.style,x=!t.L_DISABLE_3D&&(v||y||L||P)&&!c,w=!t.L_NO_TOUCH&&!c&&function(){var t="ontouchstart";if(m||t in g)return!0;var i=e.createElement("div"),n=!1;return i.setAttribute?(i.setAttribute(t,"return;"),"function"==typeof i[t]&&(n=!0),i.removeAttribute(t),i=null,n):!1}();o.Browser={ie:n,ie6:s,ie7:a,ielt9:r,webkit:l,android:d,android23:p,chrome:u,ie3d:v,webkit3d:y,gecko3d:L,opera3d:P,any3d:x,mobile:_,mobileWebkit:_&&l,mobileWebkit3d:_&&y,mobileOpera:_&&t.opera,touch:w,msTouch:m,retina:f}}(),o.Point=function(t,e,i){this.x=i?Math.round(t):t,this.y=i?Math.round(e):e},o.Point.prototype={clone:function(){return new o.Point(this.x,this.y)},add:function(t){return this.clone()._add(o.point(t))},_add:function(t){return this.x+=t.x,this.y+=t.y,this},subtract:function(t){return this.clone()._subtract(o.point(t))},_subtract:function(t){return this.x-=t.x,this.y-=t.y,this},divideBy:function(t){return this.clone()._divideBy(t)},_divideBy:function(t){return this.x/=t,this.y/=t,this},multiplyBy:function(t){return this.clone()._multiplyBy(t)},_multiplyBy:function(t){return this.x*=t,this.y*=t,this},round:function(){return this.clone()._round()},_round:function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this},floor:function(){return this.clone()._floor()},_floor:function(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this},distanceTo:function(t){t=o.point(t);var e=t.x-this.x,i=t.y-this.y;return Math.sqrt(e*e+i*i)},equals:function(t){return t=o.point(t),t.x===this.x&&t.y===this.y},contains:function(t){return t=o.point(t),Math.abs(t.x)<=Math.abs(this.x)&&Math.abs(t.y)<=Math.abs(this.y)},toString:function(){return"Point("+o.Util.formatNum(this.x)+", "+o.Util.formatNum(this.y)+")"}},o.point=function(t,e,n){return t instanceof o.Point?t:o.Util.isArray(t)?new o.Point(t[0],t[1]):t===i||null===t?t:new o.Point(t,e,n)},o.Bounds=function(t,e){if(t)for(var i=e?[t,e]:t,n=0,o=i.length;o>n;n++)this.extend(i[n])},o.Bounds.prototype={extend:function(t){return t=o.point(t),this.min||this.max?(this.min.x=Math.min(t.x,this.min.x),this.max.x=Math.max(t.x,this.max.x),this.min.y=Math.min(t.y,this.min.y),this.max.y=Math.max(t.y,this.max.y)):(this.min=t.clone(),this.max=t.clone()),this},getCenter:function(t){return new o.Point((this.min.x+this.max.x)/2,(this.min.y+this.max.y)/2,t)},getBottomLeft:function(){return new o.Point(this.min.x,this.max.y)},getTopRight:function(){return new o.Point(this.max.x,this.min.y)},getSize:function(){return this.max.subtract(this.min)},contains:function(t){var e,i;return t="number"==typeof t[0]||t instanceof o.Point?o.point(t):o.bounds(t),t instanceof o.Bounds?(e=t.min,i=t.max):e=i=t,e.x>=this.min.x&&i.x<=this.max.x&&e.y>=this.min.y&&i.y<=this.max.y},intersects:function(t){t=o.bounds(t);var e=this.min,i=this.max,n=t.min,s=t.max,a=s.x>=e.x&&n.x<=i.x,r=s.y>=e.y&&n.y<=i.y;return a&&r},isValid:function(){return!(!this.min||!this.max)}},o.bounds=function(t,e){return!t||t instanceof o.Bounds?t:new o.Bounds(t,e)},o.Transformation=function(t,e,i,n){this._a=t,this._b=e,this._c=i,this._d=n},o.Transformation.prototype={transform:function(t,e){return this._transform(t.clone(),e)},_transform:function(t,e){return e=e||1,t.x=e*(this._a*t.x+this._b),t.y=e*(this._c*t.y+this._d),t},untransform:function(t,e){return e=e||1,new o.Point((t.x/e-this._b)/this._a,(t.y/e-this._d)/this._c)}},o.DomUtil={get:function(t){return"string"==typeof t?e.getElementById(t):t},getStyle:function(t,i){var n=t.style[i];if(!n&&t.currentStyle&&(n=t.currentStyle[i]),(!n||"auto"===n)&&e.defaultView){var o=e.defaultView.getComputedStyle(t,null);n=o?o[i]:null}return"auto"===n?null:n},getViewportOffset:function(t){var i,n=0,s=0,a=t,r=e.body,h=e.documentElement,l=o.Browser.ie7;do{if(n+=a.offsetTop||0,s+=a.offsetLeft||0,n+=parseInt(o.DomUtil.getStyle(a,"borderTopWidth"),10)||0,s+=parseInt(o.DomUtil.getStyle(a,"borderLeftWidth"),10)||0,i=o.DomUtil.getStyle(a,"position"),a.offsetParent===r&&"absolute"===i)break;if("fixed"===i){n+=r.scrollTop||h.scrollTop||0,s+=r.scrollLeft||h.scrollLeft||0;break}if("relative"===i&&!a.offsetLeft){var u=o.DomUtil.getStyle(a,"width"),c=o.DomUtil.getStyle(a,"max-width"),d=a.getBoundingClientRect();("none"!==u||"none"!==c)&&(s+=d.left+a.clientLeft),n+=d.top+(r.scrollTop||h.scrollTop||0);break}a=a.offsetParent}while(a);a=t;do{if(a===r)break;n-=a.scrollTop||0,s-=a.scrollLeft||0,o.DomUtil.documentIsLtr()||!o.Browser.webkit&&!l||(s+=a.scrollWidth-a.clientWidth,l&&"hidden"!==o.DomUtil.getStyle(a,"overflow-y")&&"hidden"!==o.DomUtil.getStyle(a,"overflow")&&(s+=17)),a=a.parentNode}while(a);return new o.Point(s,n)},documentIsLtr:function(){return o.DomUtil._docIsLtrCached||(o.DomUtil._docIsLtrCached=!0,o.DomUtil._docIsLtr="ltr"===o.DomUtil.getStyle(e.body,"direction")),o.DomUtil._docIsLtr},create:function(t,i,n){var o=e.createElement(t);return o.className=i,n&&n.appendChild(o),o},hasClass:function(t,e){return t.className.length>0&&new RegExp("(^|\\s)"+e+"(\\s|$)").test(t.className)},addClass:function(t,e){o.DomUtil.hasClass(t,e)||(t.className+=(t.className?" ":"")+e)},removeClass:function(t,e){t.className=o.Util.trim((" "+t.className+" ").replace(" "+e+" "," "))},setOpacity:function(t,e){if("opacity"in t.style)t.style.opacity=e;else if("filter"in t.style){var i=!1,n="DXImageTransform.Microsoft.Alpha";try{i=t.filters.item(n)}catch(o){if(1===e)return}e=Math.round(100*e),i?(i.Enabled=100!==e,i.Opacity=e):t.style.filter+=" progid:"+n+"(opacity="+e+")"}},testProp:function(t){for(var i=e.documentElement.style,n=0;n<t.length;n++)if(t[n]in i)return t[n];return!1},getTranslateString:function(t){var e=o.Browser.webkit3d,i="translate"+(e?"3d":"")+"(",n=(e?",0":"")+")";return i+t.x+"px,"+t.y+"px"+n},getScaleString:function(t,e){var i=o.DomUtil.getTranslateString(e.add(e.multiplyBy(-1*t))),n=" scale("+t+") ";return i+n},setPosition:function(t,e,i){t._leaflet_pos=e,!i&&o.Browser.any3d?(t.style[o.DomUtil.TRANSFORM]=o.DomUtil.getTranslateString(e),o.Browser.mobileWebkit3d&&(t.style.WebkitBackfaceVisibility="hidden")):(t.style.left=e.x+"px",t.style.top=e.y+"px")},getPosition:function(t){return t._leaflet_pos}},o.DomUtil.TRANSFORM=o.DomUtil.testProp(["transform","WebkitTransform","OTransform","MozTransform","msTransform"]),o.DomUtil.TRANSITION=o.DomUtil.testProp(["webkitTransition","transition","OTransition","MozTransition","msTransition"]),o.DomUtil.TRANSITION_END="webkitTransition"===o.DomUtil.TRANSITION||"OTransition"===o.DomUtil.TRANSITION?o.DomUtil.TRANSITION+"End":"transitionend",function(){var i=o.DomUtil.testProp(["userSelect","WebkitUserSelect","OUserSelect","MozUserSelect","msUserSelect"]);o.extend(o.DomUtil,{disableTextSelection:function(){if(o.DomEvent.on(t,"selectstart",o.DomEvent.preventDefault),i){var n=e.documentElement.style;this._userSelect=n[i],n[i]="none"}},enableTextSelection:function(){o.DomEvent.off(t,"selectstart",o.DomEvent.preventDefault),i&&(e.documentElement.style[i]=this._userSelect,delete this._userSelect)},disableImageDrag:function(){o.DomEvent.on(t,"dragstart",o.DomEvent.preventDefault)},enableImageDrag:function(){o.DomEvent.off(t,"dragstart",o.DomEvent.preventDefault)}})}(),o.LatLng=function(t,e){var i=parseFloat(t),n=parseFloat(e);if(isNaN(i)||isNaN(n))throw new Error("Invalid LatLng object: ("+t+", "+e+")");this.lat=i,this.lng=n},o.extend(o.LatLng,{DEG_TO_RAD:Math.PI/180,RAD_TO_DEG:180/Math.PI,MAX_MARGIN:1e-9}),o.LatLng.prototype={equals:function(t){if(!t)return!1;t=o.latLng(t);var e=Math.max(Math.abs(this.lat-t.lat),Math.abs(this.lng-t.lng));return e<=o.LatLng.MAX_MARGIN},toString:function(t){return"LatLng("+o.Util.formatNum(this.lat,t)+", "+o.Util.formatNum(this.lng,t)+")"},distanceTo:function(t){t=o.latLng(t);var e=6378137,i=o.LatLng.DEG_TO_RAD,n=(t.lat-this.lat)*i,s=(t.lng-this.lng)*i,a=this.lat*i,r=t.lat*i,h=Math.sin(n/2),l=Math.sin(s/2),u=h*h+l*l*Math.cos(a)*Math.cos(r);return 2*e*Math.atan2(Math.sqrt(u),Math.sqrt(1-u))},wrap:function(t,e){var i=this.lng;return t=t||-180,e=e||180,i=(i+e)%(e-t)+(t>i||i===e?e:t),new o.LatLng(this.lat,i)}},o.latLng=function(t,e){return t instanceof o.LatLng?t:o.Util.isArray(t)?new o.LatLng(t[0],t[1]):t===i||null===t?t:"object"==typeof t&&"lat"in t?new o.LatLng(t.lat,"lng"in t?t.lng:t.lon):new o.LatLng(t,e)},o.LatLngBounds=function(t,e){if(t)for(var i=e?[t,e]:t,n=0,o=i.length;o>n;n++)this.extend(i[n])},o.LatLngBounds.prototype={extend:function(t){return t?(t="number"==typeof t[0]||"string"==typeof t[0]||t instanceof o.LatLng?o.latLng(t):o.latLngBounds(t),t instanceof o.LatLng?this._southWest||this._northEast?(this._southWest.lat=Math.min(t.lat,this._southWest.lat),this._southWest.lng=Math.min(t.lng,this._southWest.lng),this._northEast.lat=Math.max(t.lat,this._northEast.lat),this._northEast.lng=Math.max(t.lng,this._northEast.lng)):(this._southWest=new o.LatLng(t.lat,t.lng),this._northEast=new o.LatLng(t.lat,t.lng)):t instanceof o.LatLngBounds&&(this.extend(t._southWest),this.extend(t._northEast)),this):this},pad:function(t){var e=this._southWest,i=this._northEast,n=Math.abs(e.lat-i.lat)*t,s=Math.abs(e.lng-i.lng)*t;return new o.LatLngBounds(new o.LatLng(e.lat-n,e.lng-s),new o.LatLng(i.lat+n,i.lng+s))},getCenter:function(){return new o.LatLng((this._southWest.lat+this._northEast.lat)/2,(this._southWest.lng+this._northEast.lng)/2)},getSouthWest:function(){return this._southWest},getNorthEast:function(){return this._northEast},getNorthWest:function(){return new o.LatLng(this.getNorth(),this.getWest())},getSouthEast:function(){return new o.LatLng(this.getSouth(),this.getEast())},getWest:function(){return this._southWest.lng},getSouth:function(){return this._southWest.lat},getEast:function(){return this._northEast.lng},getNorth:function(){return this._northEast.lat},contains:function(t){t="number"==typeof t[0]||t instanceof o.LatLng?o.latLng(t):o.latLngBounds(t);var e,i,n=this._southWest,s=this._northEast;return t instanceof o.LatLngBounds?(e=t.getSouthWest(),i=t.getNorthEast()):e=i=t,e.lat>=n.lat&&i.lat<=s.lat&&e.lng>=n.lng&&i.lng<=s.lng},intersects:function(t){t=o.latLngBounds(t);var e=this._southWest,i=this._northEast,n=t.getSouthWest(),s=t.getNorthEast(),a=s.lat>=e.lat&&n.lat<=i.lat,r=s.lng>=e.lng&&n.lng<=i.lng;return a&&r},toBBoxString:function(){return[this.getWest(),this.getSouth(),this.getEast(),this.getNorth()].join(",")},equals:function(t){return t?(t=o.latLngBounds(t),this._southWest.equals(t.getSouthWest())&&this._northEast.equals(t.getNorthEast())):!1},isValid:function(){return!(!this._southWest||!this._northEast)}},o.latLngBounds=function(t,e){return!t||t instanceof o.LatLngBounds?t:new o.LatLngBounds(t,e)},o.Projection={},o.Projection.SphericalMercator={MAX_LATITUDE:85.0511287798,project:function(t){var e=o.LatLng.DEG_TO_RAD,i=this.MAX_LATITUDE,n=Math.max(Math.min(i,t.lat),-i),s=t.lng*e,a=n*e;return a=Math.log(Math.tan(Math.PI/4+a/2)),new o.Point(s,a)},unproject:function(t){var e=o.LatLng.RAD_TO_DEG,i=t.x*e,n=(2*Math.atan(Math.exp(t.y))-Math.PI/2)*e;return new o.LatLng(n,i)}},o.Projection.LonLat={project:function(t){return new o.Point(t.lng,t.lat)},unproject:function(t){return new o.LatLng(t.y,t.x)}},o.CRS={latLngToPoint:function(t,e){var i=this.projection.project(t),n=this.scale(e);return this.transformation._transform(i,n)},pointToLatLng:function(t,e){var i=this.scale(e),n=this.transformation.untransform(t,i);return this.projection.unproject(n)},project:function(t){return this.projection.project(t)},scale:function(t){return 256*Math.pow(2,t)}},o.CRS.Simple=o.extend({},o.CRS,{projection:o.Projection.LonLat,transformation:new o.Transformation(1,0,-1,0),scale:function(t){return Math.pow(2,t)}}),o.CRS.EPSG3857=o.extend({},o.CRS,{code:"EPSG:3857",projection:o.Projection.SphericalMercator,transformation:new o.Transformation(.5/Math.PI,.5,-.5/Math.PI,.5),project:function(t){var e=this.projection.project(t),i=6378137;return e.multiplyBy(i)}}),o.CRS.EPSG900913=o.extend({},o.CRS.EPSG3857,{code:"EPSG:900913"}),o.CRS.EPSG4326=o.extend({},o.CRS,{code:"EPSG:4326",projection:o.Projection.LonLat,transformation:new o.Transformation(1/360,.5,-1/360,.5)}),o.Map=o.Class.extend({includes:o.Mixin.Events,options:{crs:o.CRS.EPSG3857,fadeAnimation:o.DomUtil.TRANSITION&&!o.Browser.android23,trackResize:!0,markerZoomAnimation:o.DomUtil.TRANSITION&&o.Browser.any3d},initialize:function(t,e){e=o.setOptions(this,e),this._initContainer(t),this._initLayout(),this._initEvents(),e.maxBounds&&this.setMaxBounds(e.maxBounds),e.center&&e.zoom!==i&&this.setView(o.latLng(e.center),e.zoom,{reset:!0}),this._handlers=[],this._layers={},this._zoomBoundLayers={},this._tileLayersNum=0,this.callInitHooks(),this._addLayers(e.layers)},setView:function(t,e){return this._resetView(o.latLng(t),this._limitZoom(e)),this},setZoom:function(t,e){return this.setView(this.getCenter(),t,{zoom:e})},zoomIn:function(t,e){return this.setZoom(this._zoom+(t||1),e)},zoomOut:function(t,e){return this.setZoom(this._zoom-(t||1),e)},setZoomAround:function(t,e,i){var n=this.getZoomScale(e),s=this.getSize().divideBy(2),a=t instanceof o.Point?t:this.latLngToContainerPoint(t),r=a.subtract(s).multiplyBy(1-1/n),h=this.containerPointToLatLng(s.add(r));return this.setView(h,e,{zoom:i})},fitBounds:function(t,e){e=e||{},t=t.getBounds?t.getBounds():o.latLngBounds(t);var i=o.point(e.paddingTopLeft||e.padding||[0,0]),n=o.point(e.paddingBottomRight||e.padding||[0,0]),s=this.getBoundsZoom(t,!1,i.add(n)),a=n.subtract(i).divideBy(2),r=this.project(t.getSouthWest(),s),h=this.project(t.getNorthEast(),s),l=this.unproject(r.add(h).divideBy(2).add(a),s);return this.setView(l,s,e)},fitWorld:function(t){return this.fitBounds([[-90,-180],[90,180]],t)},panTo:function(t,e){return this.setView(t,this._zoom,{pan:e})},panBy:function(t){return this.fire("movestart"),this._rawPanBy(o.point(t)),this.fire("move"),this.fire("moveend")},setMaxBounds:function(t,e){if(t=o.latLngBounds(t),this.options.maxBounds=t,!t)return this._boundsMinZoom=null,this.off("moveend",this._panInsideMaxBounds,this),this;var i=this.getBoundsZoom(t,!0);return this._boundsMinZoom=i,this._loaded&&(this._zoom<i?this.setView(t.getCenter(),i,e):this.panInsideBounds(t)),this.on("moveend",this._panInsideMaxBounds,this),this},panInsideBounds:function(t){t=o.latLngBounds(t);var e=this.getPixelBounds(),i=e.getBottomLeft(),n=e.getTopRight(),s=this.project(t.getSouthWest()),a=this.project(t.getNorthEast()),r=0,h=0;return n.y<a.y&&(h=Math.ceil(a.y-n.y)),n.x>a.x&&(r=Math.floor(a.x-n.x)),i.y>s.y&&(h=Math.floor(s.y-i.y)),i.x<s.x&&(r=Math.ceil(s.x-i.x)),r||h?this.panBy([r,h]):this},addLayer:function(t){var e=o.stamp(t);return this._layers[e]?this:(this._layers[e]=t,!t.options||isNaN(t.options.maxZoom)&&isNaN(t.options.minZoom)||(this._zoomBoundLayers[e]=t,this._updateZoomLevels()),this.options.zoomAnimation&&o.TileLayer&&t instanceof o.TileLayer&&(this._tileLayersNum++,this._tileLayersToLoad++,t.on("load",this._onTileLayerLoad,this)),this._loaded&&this._layerAdd(t),this)},removeLayer:function(t){var e=o.stamp(t);if(this._layers[e])return this._loaded&&t.onRemove(this),delete this._layers[e],this._loaded&&this.fire("layerremove",{layer:t}),this._zoomBoundLayers[e]&&(delete this._zoomBoundLayers[e],this._updateZoomLevels()),this.options.zoomAnimation&&o.TileLayer&&t instanceof o.TileLayer&&(this._tileLayersNum--,this._tileLayersToLoad--,t.off("load",this._onTileLayerLoad,this)),this},hasLayer:function(t){return t?o.stamp(t)in this._layers:!1},eachLayer:function(t,e){for(var i in this._layers)t.call(e,this._layers[i]);return this},invalidateSize:function(t){t=o.extend({animate:!1,pan:!0},t===!0?{animate:!0}:t);var e=this.getSize();if(this._sizeChanged=!0,this.options.maxBounds&&this.setMaxBounds(this.options.maxBounds),!this._loaded)return this;var i=this.getSize(),n=e.subtract(i).divideBy(2).round();return n.x||n.y?(t.animate&&t.pan?this.panBy(n):(t.pan&&this._rawPanBy(n),this.fire("move"),clearTimeout(this._sizeTimer),this._sizeTimer=setTimeout(o.bind(this.fire,this,"moveend"),200)),this.fire("resize",{oldSize:e,newSize:i})):this},addHandler:function(t,e){if(e){var i=this[t]=new e(this);return this._handlers.push(i),this.options[t]&&i.enable(),this}},remove:function(){return this._loaded&&this.fire("unload"),this._initEvents("off"),delete this._container._leaflet,this._clearPanes(),this._clearControlPos&&this._clearControlPos(),this._clearHandlers(),this},getCenter:function(){return this._checkIfLoaded(),this._moved()?this.layerPointToLatLng(this._getCenterLayerPoint()):this._initialCenter},getZoom:function(){return this._zoom},getBounds:function(){var t=this.getPixelBounds(),e=this.unproject(t.getBottomLeft()),i=this.unproject(t.getTopRight());return new o.LatLngBounds(e,i)},getMinZoom:function(){var t=this._layersMinZoom===i?0:this._layersMinZoom,e=this._boundsMinZoom===i?0:this._boundsMinZoom;return this.options.minZoom===i?Math.max(t,e):this.options.minZoom},getMaxZoom:function(){return this.options.maxZoom===i?this._layersMaxZoom===i?1/0:this._layersMaxZoom:this.options.maxZoom},getBoundsZoom:function(t,e,i){t=o.latLngBounds(t);var n,s=this.getMinZoom()-(e?1:0),a=this.getMaxZoom(),r=this.getSize(),h=t.getNorthWest(),l=t.getSouthEast(),u=!0;i=o.point(i||[0,0]);do s++,n=this.project(l,s).subtract(this.project(h,s)).add(i),u=e?n.x<r.x||n.y<r.y:r.contains(n);while(u&&a>=s);return u&&e?null:e?s:s-1},getSize:function(){return(!this._size||this._sizeChanged)&&(this._size=new o.Point(this._container.clientWidth,this._container.clientHeight),this._sizeChanged=!1),this._size.clone()},getPixelBounds:function(){var t=this._getTopLeftPoint();return new o.Bounds(t,t.add(this.getSize()))},getPixelOrigin:function(){return this._checkIfLoaded(),this._initialTopLeftPoint},getPanes:function(){return this._panes},getContainer:function(){return this._container},getZoomScale:function(t){var e=this.options.crs;return e.scale(t)/e.scale(this._zoom)},getScaleZoom:function(t){return this._zoom+Math.log(t)/Math.LN2},project:function(t,e){return e=e===i?this._zoom:e,this.options.crs.latLngToPoint(o.latLng(t),e)},unproject:function(t,e){return e=e===i?this._zoom:e,this.options.crs.pointToLatLng(o.point(t),e)},layerPointToLatLng:function(t){var e=o.point(t).add(this.getPixelOrigin());return this.unproject(e)},latLngToLayerPoint:function(t){var e=this.project(o.latLng(t))._round();return e._subtract(this.getPixelOrigin())},containerPointToLayerPoint:function(t){return o.point(t).subtract(this._getMapPanePos())},layerPointToContainerPoint:function(t){return o.point(t).add(this._getMapPanePos())},containerPointToLatLng:function(t){var e=this.containerPointToLayerPoint(o.point(t));return this.layerPointToLatLng(e)},latLngToContainerPoint:function(t){return this.layerPointToContainerPoint(this.latLngToLayerPoint(o.latLng(t)))},mouseEventToContainerPoint:function(t){return o.DomEvent.getMousePosition(t,this._container)},mouseEventToLayerPoint:function(t){return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(t))},mouseEventToLatLng:function(t){return this.layerPointToLatLng(this.mouseEventToLayerPoint(t))},_initContainer:function(t){var e=this._container=o.DomUtil.get(t);if(!e)throw new Error("Map container not found.");if(e._leaflet)throw new Error("Map container is already initialized.");e._leaflet=!0},_initLayout:function(){var t=this._container;o.DomUtil.addClass(t,"leaflet-container"+(o.Browser.touch?" leaflet-touch":"")+(o.Browser.retina?" leaflet-retina":"")+(this.options.fadeAnimation?" leaflet-fade-anim":""));var e=o.DomUtil.getStyle(t,"position");"absolute"!==e&&"relative"!==e&&"fixed"!==e&&(t.style.position="relative"),this._initPanes(),this._initControlPos&&this._initControlPos()},_initPanes:function(){var t=this._panes={};this._mapPane=t.mapPane=this._createPane("leaflet-map-pane",this._container),this._tilePane=t.tilePane=this._createPane("leaflet-tile-pane",this._mapPane),t.objectsPane=this._createPane("leaflet-objects-pane",this._mapPane),t.shadowPane=this._createPane("leaflet-shadow-pane"),t.overlayPane=this._createPane("leaflet-overlay-pane"),t.markerPane=this._createPane("leaflet-marker-pane"),t.popupPane=this._createPane("leaflet-popup-pane");var e=" leaflet-zoom-hide";this.options.markerZoomAnimation||(o.DomUtil.addClass(t.markerPane,e),o.DomUtil.addClass(t.shadowPane,e),o.DomUtil.addClass(t.popupPane,e))},_createPane:function(t,e){return o.DomUtil.create("div",t,e||this._panes.objectsPane)},_clearPanes:function(){this._container.removeChild(this._mapPane)},_addLayers:function(t){t=t?o.Util.isArray(t)?t:[t]:[];for(var e=0,i=t.length;i>e;e++)this.addLayer(t[e])},_resetView:function(t,e,i,n){var s=this._zoom!==e;n||(this.fire("movestart"),s&&this.fire("zoomstart")),this._zoom=e,this._initialCenter=t,this._initialTopLeftPoint=this._getNewTopLeftPoint(t),i?this._initialTopLeftPoint._add(this._getMapPanePos()):o.DomUtil.setPosition(this._mapPane,new o.Point(0,0)),this._tileLayersToLoad=this._tileLayersNum;var a=!this._loaded;this._loaded=!0,a&&(this.fire("load"),this.eachLayer(this._layerAdd,this)),this.fire("viewreset",{hard:!i}),this.fire("move"),(s||n)&&this.fire("zoomend"),this.fire("moveend",{hard:!i})},_rawPanBy:function(t){o.DomUtil.setPosition(this._mapPane,this._getMapPanePos().subtract(t))},_getZoomSpan:function(){return this.getMaxZoom()-this.getMinZoom()},_updateZoomLevels:function(){var t,e=1/0,n=-1/0,o=this._getZoomSpan();for(t in this._zoomBoundLayers){var s=this._zoomBoundLayers[t];isNaN(s.options.minZoom)||(e=Math.min(e,s.options.minZoom)),isNaN(s.options.maxZoom)||(n=Math.max(n,s.options.maxZoom))}t===i?this._layersMaxZoom=this._layersMinZoom=i:(this._layersMaxZoom=n,this._layersMinZoom=e),o!==this._getZoomSpan()&&this.fire("zoomlevelschange")},_panInsideMaxBounds:function(){this.panInsideBounds(this.options.maxBounds)},_checkIfLoaded:function(){if(!this._loaded)throw new Error("Set map center and zoom first.")},_initEvents:function(e){if(o.DomEvent){e=e||"on",o.DomEvent[e](this._container,"click",this._onMouseClick,this);var i,n,s=["dblclick","mousedown","mouseup","mouseenter","mouseleave","mousemove","contextmenu"];for(i=0,n=s.length;n>i;i++)o.DomEvent[e](this._container,s[i],this._fireMouseEvent,this);this.options.trackResize&&o.DomEvent[e](t,"resize",this._onResize,this)}},_onResize:function(){o.Util.cancelAnimFrame(this._resizeRequest),this._resizeRequest=o.Util.requestAnimFrame(this.invalidateSize,this,!1,this._container)},_onMouseClick:function(t){!this._loaded||!t._simulated&&this.dragging&&this.dragging.moved()||o.DomEvent._skipped(t)||(this.fire("preclick"),this._fireMouseEvent(t))},_fireMouseEvent:function(t){if(this._loaded&&!o.DomEvent._skipped(t)){var e=t.type;if(e="mouseenter"===e?"mouseover":"mouseleave"===e?"mouseout":e,this.hasEventListeners(e)){"contextmenu"===e&&o.DomEvent.preventDefault(t);var i=this.mouseEventToContainerPoint(t),n=this.containerPointToLayerPoint(i),s=this.layerPointToLatLng(n);this.fire(e,{latlng:s,layerPoint:n,containerPoint:i,originalEvent:t})}}},_onTileLayerLoad:function(){this._tileLayersToLoad--,this._tileLayersNum&&!this._tileLayersToLoad&&this.fire("tilelayersload")},_clearHandlers:function(){for(var t=0,e=this._handlers.length;e>t;t++)this._handlers[t].disable()},whenReady:function(t,e){return this._loaded?t.call(e||this,this):this.on("load",t,e),this},_layerAdd:function(t){t.onAdd(this),this.fire("layeradd",{layer:t})},_getMapPanePos:function(){return o.DomUtil.getPosition(this._mapPane)},_moved:function(){var t=this._getMapPanePos();return t&&!t.equals([0,0])},_getTopLeftPoint:function(){return this.getPixelOrigin().subtract(this._getMapPanePos())},_getNewTopLeftPoint:function(t,e){var i=this.getSize()._divideBy(2);return this.project(t,e)._subtract(i)._round()},_latLngToNewLayerPoint:function(t,e,i){var n=this._getNewTopLeftPoint(i,e).add(this._getMapPanePos());return this.project(t,e)._subtract(n)},_getCenterLayerPoint:function(){return this.containerPointToLayerPoint(this.getSize()._divideBy(2))},_getCenterOffset:function(t){return this.latLngToLayerPoint(t).subtract(this._getCenterLayerPoint())},_limitZoom:function(t){var e=this.getMinZoom(),i=this.getMaxZoom();return Math.max(e,Math.min(i,t))}}),o.map=function(t,e){return new o.Map(t,e)},o.Projection.Mercator={MAX_LATITUDE:85.0840591556,R_MINOR:6356752.314245179,R_MAJOR:6378137,project:function(t){var e=o.LatLng.DEG_TO_RAD,i=this.MAX_LATITUDE,n=Math.max(Math.min(i,t.lat),-i),s=this.R_MAJOR,a=this.R_MINOR,r=t.lng*e*s,h=n*e,l=a/s,u=Math.sqrt(1-l*l),c=u*Math.sin(h);c=Math.pow((1-c)/(1+c),.5*u);var d=Math.tan(.5*(.5*Math.PI-h))/c;return h=-s*Math.log(d),new o.Point(r,h)},unproject:function(t){for(var e,i=o.LatLng.RAD_TO_DEG,n=this.R_MAJOR,s=this.R_MINOR,a=t.x*i/n,r=s/n,h=Math.sqrt(1-r*r),l=Math.exp(-t.y/n),u=Math.PI/2-2*Math.atan(l),c=15,d=1e-7,p=c,_=.1;Math.abs(_)>d&&--p>0;)e=h*Math.sin(u),_=Math.PI/2-2*Math.atan(l*Math.pow((1-e)/(1+e),.5*h))-u,u+=_;return new o.LatLng(u*i,a)}},o.CRS.EPSG3395=o.extend({},o.CRS,{code:"EPSG:3395",projection:o.Projection.Mercator,transformation:function(){var t=o.Projection.Mercator,e=t.R_MAJOR,i=t.R_MINOR;return new o.Transformation(.5/(Math.PI*e),.5,-.5/(Math.PI*i),.5)}()}),o.TileLayer=o.Class.extend({includes:o.Mixin.Events,options:{minZoom:0,maxZoom:18,tileSize:256,subdomains:"abc",errorTileUrl:"",attribution:"",zoomOffset:0,opacity:1,unloadInvisibleTiles:o.Browser.mobile,updateWhenIdle:o.Browser.mobile},initialize:function(t,e){e=o.setOptions(this,e),e.detectRetina&&o.Browser.retina&&e.maxZoom>0&&(e.tileSize=Math.floor(e.tileSize/2),e.zoomOffset++,e.minZoom>0&&e.minZoom--,this.options.maxZoom--),e.bounds&&(e.bounds=o.latLngBounds(e.bounds)),this._url=t;var i=this.options.subdomains;"string"==typeof i&&(this.options.subdomains=i.split(""))},onAdd:function(t){this._map=t,this._animated=t._zoomAnimated,this._initContainer(),this._createTileProto(),t.on({viewreset:this._reset,moveend:this._update},this),this._animated&&t.on({zoomanim:this._animateZoom,zoomend:this._endZoomAnim},this),this.options.updateWhenIdle||(this._limitedUpdate=o.Util.limitExecByInterval(this._update,150,this),t.on("move",this._limitedUpdate,this)),this._reset(),this._update()
},addTo:function(t){return t.addLayer(this),this},onRemove:function(t){this._container.parentNode.removeChild(this._container),t.off({viewreset:this._reset,moveend:this._update},this),this._animated&&t.off({zoomanim:this._animateZoom,zoomend:this._endZoomAnim},this),this.options.updateWhenIdle||t.off("move",this._limitedUpdate,this),this._container=null,this._map=null},bringToFront:function(){var t=this._map._panes.tilePane;return this._container&&(t.appendChild(this._container),this._setAutoZIndex(t,Math.max)),this},bringToBack:function(){var t=this._map._panes.tilePane;return this._container&&(t.insertBefore(this._container,t.firstChild),this._setAutoZIndex(t,Math.min)),this},getAttribution:function(){return this.options.attribution},getContainer:function(){return this._container},setOpacity:function(t){return this.options.opacity=t,this._map&&this._updateOpacity(),this},setZIndex:function(t){return this.options.zIndex=t,this._updateZIndex(),this},setUrl:function(t,e){return this._url=t,e||this.redraw(),this},redraw:function(){return this._map&&(this._reset({hard:!0}),this._update()),this},_updateZIndex:function(){this._container&&this.options.zIndex!==i&&(this._container.style.zIndex=this.options.zIndex)},_setAutoZIndex:function(t,e){var i,n,o,s=t.children,a=-e(1/0,-1/0);for(n=0,o=s.length;o>n;n++)s[n]!==this._container&&(i=parseInt(s[n].style.zIndex,10),isNaN(i)||(a=e(a,i)));this.options.zIndex=this._container.style.zIndex=(isFinite(a)?a:0)+e(1,-1)},_updateOpacity:function(){var t,e=this._tiles;if(o.Browser.ielt9)for(t in e)o.DomUtil.setOpacity(e[t],this.options.opacity);else o.DomUtil.setOpacity(this._container,this.options.opacity)},_initContainer:function(){var t=this._map._panes.tilePane;if(!this._container){if(this._container=o.DomUtil.create("div","leaflet-layer"),this._updateZIndex(),this._animated){var e="leaflet-tile-container leaflet-zoom-animated";this._bgBuffer=o.DomUtil.create("div",e,this._container),this._tileContainer=o.DomUtil.create("div",e,this._container)}else this._tileContainer=this._container;t.appendChild(this._container),this.options.opacity<1&&this._updateOpacity()}},_reset:function(t){for(var e in this._tiles)this.fire("tileunload",{tile:this._tiles[e]});this._tiles={},this._tilesToLoad=0,this.options.reuseTiles&&(this._unusedTiles=[]),this._tileContainer.innerHTML="",this._animated&&t&&t.hard&&this._clearBgBuffer(),this._initContainer()},_update:function(){if(this._map){var t=this._map.getPixelBounds(),e=this._map.getZoom(),i=this.options.tileSize;if(!(e>this.options.maxZoom||e<this.options.minZoom)){var n=o.bounds(t.min.divideBy(i)._floor(),t.max.divideBy(i)._floor());this._addTilesFromCenterOut(n),(this.options.unloadInvisibleTiles||this.options.reuseTiles)&&this._removeOtherTiles(n)}}},_addTilesFromCenterOut:function(t){var i,n,s,a=[],r=t.getCenter();for(i=t.min.y;i<=t.max.y;i++)for(n=t.min.x;n<=t.max.x;n++)s=new o.Point(n,i),this._tileShouldBeLoaded(s)&&a.push(s);var h=a.length;if(0!==h){a.sort(function(t,e){return t.distanceTo(r)-e.distanceTo(r)});var l=e.createDocumentFragment();for(this._tilesToLoad||this.fire("loading"),this._tilesToLoad+=h,n=0;h>n;n++)this._addTile(a[n],l);this._tileContainer.appendChild(l)}},_tileShouldBeLoaded:function(t){if(t.x+":"+t.y in this._tiles)return!1;var e=this.options;if(!e.continuousWorld){var i=this._getWrapTileNum();if(e.noWrap&&(t.x<0||t.x>=i)||t.y<0||t.y>=i)return!1}if(e.bounds){var n=e.tileSize,o=t.multiplyBy(n),s=o.add([n,n]),a=this._map.unproject(o),r=this._map.unproject(s);if(e.continuousWorld||e.noWrap||(a=a.wrap(),r=r.wrap()),!e.bounds.intersects([a,r]))return!1}return!0},_removeOtherTiles:function(t){var e,i,n,o;for(o in this._tiles)e=o.split(":"),i=parseInt(e[0],10),n=parseInt(e[1],10),(i<t.min.x||i>t.max.x||n<t.min.y||n>t.max.y)&&this._removeTile(o)},_removeTile:function(t){var e=this._tiles[t];this.fire("tileunload",{tile:e,url:e.src}),this.options.reuseTiles?(o.DomUtil.removeClass(e,"leaflet-tile-loaded"),this._unusedTiles.push(e)):e.parentNode===this._tileContainer&&this._tileContainer.removeChild(e),o.Browser.android||(e.onload=null,e.src=o.Util.emptyImageUrl),delete this._tiles[t]},_addTile:function(t,e){var i=this._getTilePos(t),n=this._getTile();o.DomUtil.setPosition(n,i,o.Browser.chrome||o.Browser.android23),this._tiles[t.x+":"+t.y]=n,this._loadTile(n,t),n.parentNode!==this._tileContainer&&e.appendChild(n)},_getZoomForUrl:function(){var t=this.options,e=this._map.getZoom();return t.zoomReverse&&(e=t.maxZoom-e),e+t.zoomOffset},_getTilePos:function(t){var e=this._map.getPixelOrigin(),i=this.options.tileSize;return t.multiplyBy(i).subtract(e)},getTileUrl:function(t){return o.Util.template(this._url,o.extend({s:this._getSubdomain(t),z:t.z,x:t.x,y:t.y},this.options))},_getWrapTileNum:function(){return Math.pow(2,this._getZoomForUrl())},_adjustTilePoint:function(t){var e=this._getWrapTileNum();this.options.continuousWorld||this.options.noWrap||(t.x=(t.x%e+e)%e),this.options.tms&&(t.y=e-t.y-1),t.z=this._getZoomForUrl()},_getSubdomain:function(t){var e=Math.abs(t.x+t.y)%this.options.subdomains.length;return this.options.subdomains[e]},_createTileProto:function(){var t=this._tileImg=o.DomUtil.create("img","leaflet-tile");t.style.width=t.style.height=this.options.tileSize+"px",t.galleryimg="no"},_getTile:function(){if(this.options.reuseTiles&&this._unusedTiles.length>0){var t=this._unusedTiles.pop();return this._resetTile(t),t}return this._createTile()},_resetTile:function(){},_createTile:function(){var t=this._tileImg.cloneNode(!1);return t.onselectstart=t.onmousemove=o.Util.falseFn,o.Browser.ielt9&&this.options.opacity!==i&&o.DomUtil.setOpacity(t,this.options.opacity),t},_loadTile:function(t,e){t._layer=this,t.onload=this._tileOnLoad,t.onerror=this._tileOnError,this._adjustTilePoint(e),t.src=this.getTileUrl(e)},_tileLoaded:function(){this._tilesToLoad--,this._tilesToLoad||(this.fire("load"),this._animated&&(clearTimeout(this._clearBgBufferTimer),this._clearBgBufferTimer=setTimeout(o.bind(this._clearBgBuffer,this),500)))},_tileOnLoad:function(){var t=this._layer;this.src!==o.Util.emptyImageUrl&&(o.DomUtil.addClass(this,"leaflet-tile-loaded"),t.fire("tileload",{tile:this,url:this.src})),t._tileLoaded()},_tileOnError:function(){var t=this._layer;t.fire("tileerror",{tile:this,url:this.src});var e=t.options.errorTileUrl;e&&(this.src=e),t._tileLoaded()}}),o.tileLayer=function(t,e){return new o.TileLayer(t,e)},o.TileLayer.WMS=o.TileLayer.extend({defaultWmsParams:{service:"WMS",request:"GetMap",version:"1.1.1",layers:"",styles:"",format:"image/jpeg",transparent:!1},initialize:function(t,e){this._url=t;var i=o.extend({},this.defaultWmsParams),n=e.tileSize||this.options.tileSize;i.width=i.height=e.detectRetina&&o.Browser.retina?2*n:n;for(var s in e)this.options.hasOwnProperty(s)||"crs"===s||(i[s]=e[s]);this.wmsParams=i,o.setOptions(this,e)},onAdd:function(t){this._crs=this.options.crs||t.options.crs;var e=parseFloat(this.wmsParams.version)>=1.3?"crs":"srs";this.wmsParams[e]=this._crs.code,o.TileLayer.prototype.onAdd.call(this,t)},getTileUrl:function(t,e){var i=this._map,n=this.options.tileSize,s=t.multiplyBy(n),a=s.add([n,n]),r=this._crs.project(i.unproject(s,e)),h=this._crs.project(i.unproject(a,e)),l=[r.x,h.y,h.x,r.y].join(","),u=o.Util.template(this._url,{s:this._getSubdomain(t)});return u+o.Util.getParamString(this.wmsParams,u,!0)+"&BBOX="+l},setParams:function(t,e){return o.extend(this.wmsParams,t),e||this.redraw(),this}}),o.tileLayer.wms=function(t,e){return new o.TileLayer.WMS(t,e)},o.TileLayer.Canvas=o.TileLayer.extend({options:{async:!1},initialize:function(t){o.setOptions(this,t)},redraw:function(){this._map&&(this._reset({hard:!0}),this._update());for(var t in this._tiles)this._redrawTile(this._tiles[t]);return this},_redrawTile:function(t){this.drawTile(t,t._tilePoint,this._map._zoom)},_createTileProto:function(){var t=this._canvasProto=o.DomUtil.create("canvas","leaflet-tile");t.width=t.height=this.options.tileSize},_createTile:function(){var t=this._canvasProto.cloneNode(!1);return t.onselectstart=t.onmousemove=o.Util.falseFn,t},_loadTile:function(t,e){t._layer=this,t._tilePoint=e,this._redrawTile(t),this.options.async||this.tileDrawn(t)},drawTile:function(){},tileDrawn:function(t){this._tileOnLoad.call(t)}}),o.tileLayer.canvas=function(t){return new o.TileLayer.Canvas(t)},o.ImageOverlay=o.Class.extend({includes:o.Mixin.Events,options:{opacity:1},initialize:function(t,e,i){this._url=t,this._bounds=o.latLngBounds(e),o.setOptions(this,i)},onAdd:function(t){this._map=t,this._image||this._initImage(),t._panes.overlayPane.appendChild(this._image),t.on("viewreset",this._reset,this),t.options.zoomAnimation&&o.Browser.any3d&&t.on("zoomanim",this._animateZoom,this),this._reset()},onRemove:function(t){t.getPanes().overlayPane.removeChild(this._image),t.off("viewreset",this._reset,this),t.options.zoomAnimation&&t.off("zoomanim",this._animateZoom,this)},addTo:function(t){return t.addLayer(this),this},setOpacity:function(t){return this.options.opacity=t,this._updateOpacity(),this},bringToFront:function(){return this._image&&this._map._panes.overlayPane.appendChild(this._image),this},bringToBack:function(){var t=this._map._panes.overlayPane;return this._image&&t.insertBefore(this._image,t.firstChild),this},_initImage:function(){this._image=o.DomUtil.create("img","leaflet-image-layer"),this._map.options.zoomAnimation&&o.Browser.any3d?o.DomUtil.addClass(this._image,"leaflet-zoom-animated"):o.DomUtil.addClass(this._image,"leaflet-zoom-hide"),this._updateOpacity(),o.extend(this._image,{galleryimg:"no",onselectstart:o.Util.falseFn,onmousemove:o.Util.falseFn,onload:o.bind(this._onImageLoad,this),src:this._url})},_animateZoom:function(t){var e=this._map,i=this._image,n=e.getZoomScale(t.zoom),s=this._bounds.getNorthWest(),a=this._bounds.getSouthEast(),r=e._latLngToNewLayerPoint(s,t.zoom,t.center),h=e._latLngToNewLayerPoint(a,t.zoom,t.center)._subtract(r),l=r._add(h._multiplyBy(.5*(1-1/n)));i.style[o.DomUtil.TRANSFORM]=o.DomUtil.getTranslateString(l)+" scale("+n+") "},_reset:function(){var t=this._image,e=this._map.latLngToLayerPoint(this._bounds.getNorthWest()),i=this._map.latLngToLayerPoint(this._bounds.getSouthEast())._subtract(e);o.DomUtil.setPosition(t,e),t.style.width=i.x+"px",t.style.height=i.y+"px"},_onImageLoad:function(){this.fire("load")},_updateOpacity:function(){o.DomUtil.setOpacity(this._image,this.options.opacity)}}),o.imageOverlay=function(t,e,i){return new o.ImageOverlay(t,e,i)},o.Icon=o.Class.extend({options:{className:""},initialize:function(t){o.setOptions(this,t)},createIcon:function(t){return this._createIcon("icon",t)},createShadow:function(t){return this._createIcon("shadow",t)},_createIcon:function(t,e){var i=this._getIconUrl(t);if(!i){if("icon"===t)throw new Error("iconUrl not set in Icon options (see the docs).");return null}var n;return n=e&&"IMG"===e.tagName?this._createImg(i,e):this._createImg(i),this._setIconStyles(n,t),n},_setIconStyles:function(t,e){var i,n=this.options,s=o.point(n[e+"Size"]);i="shadow"===e?o.point(n.shadowAnchor||n.iconAnchor):o.point(n.iconAnchor),!i&&s&&(i=s.divideBy(2,!0)),t.className="leaflet-marker-"+e+" "+n.className,i&&(t.style.marginLeft=-i.x+"px",t.style.marginTop=-i.y+"px"),s&&(t.style.width=s.x+"px",t.style.height=s.y+"px")},_createImg:function(t,i){return o.Browser.ie6?(i||(i=e.createElement("div")),i.style.filter='progid:DXImageTransform.Microsoft.AlphaImageLoader(src="'+t+'")'):(i||(i=e.createElement("img")),i.src=t),i},_getIconUrl:function(t){return o.Browser.retina&&this.options[t+"RetinaUrl"]?this.options[t+"RetinaUrl"]:this.options[t+"Url"]}}),o.icon=function(t){return new o.Icon(t)},o.Icon.Default=o.Icon.extend({options:{iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],shadowSize:[41,41]},_getIconUrl:function(t){var e=t+"Url";if(this.options[e])return this.options[e];o.Browser.retina&&"icon"===t&&(t+="-2x");var i=o.Icon.Default.imagePath;if(!i)throw new Error("Couldn't autodetect L.Icon.Default.imagePath, set it manually.");return i+"/marker-"+t+".png"}}),o.Icon.Default.imagePath=function(){var t,i,n,o,s,a=e.getElementsByTagName("script"),r=/[\/^]leaflet[\-\._]?([\w\-\._]*)\.js\??/;for(t=0,i=a.length;i>t;t++)if(n=a[t].src,o=n.match(r))return s=n.split(r)[0],(s?s+"/":"")+"images"}(),o.Marker=o.Class.extend({includes:o.Mixin.Events,options:{icon:new o.Icon.Default,title:"",clickable:!0,draggable:!1,keyboard:!0,zIndexOffset:0,opacity:1,riseOnHover:!1,riseOffset:250},initialize:function(t,e){o.setOptions(this,e),this._latlng=o.latLng(t)},onAdd:function(t){this._map=t,t.on("viewreset",this.update,this),this._initIcon(),this.update(),t.options.zoomAnimation&&t.options.markerZoomAnimation&&t.on("zoomanim",this._animateZoom,this)},addTo:function(t){return t.addLayer(this),this},onRemove:function(t){this.dragging&&this.dragging.disable(),this._removeIcon(),this._removeShadow(),this.fire("remove"),t.off({viewreset:this.update,zoomanim:this._animateZoom},this),this._map=null},getLatLng:function(){return this._latlng},setLatLng:function(t){return this._latlng=o.latLng(t),this.update(),this.fire("move",{latlng:this._latlng})},setZIndexOffset:function(t){return this.options.zIndexOffset=t,this.update(),this},setIcon:function(t){return this.options.icon=t,this._map&&(this._initIcon(),this.update()),this},update:function(){if(this._icon){var t=this._map.latLngToLayerPoint(this._latlng).round();this._setPos(t)}return this},_initIcon:function(){var t=this.options,e=this._map,i=e.options.zoomAnimation&&e.options.markerZoomAnimation,n=i?"leaflet-zoom-animated":"leaflet-zoom-hide",s=t.icon.createIcon(this._icon),a=!1;s!==this._icon&&(this._icon&&this._removeIcon(),a=!0,t.title&&(s.title=t.title)),o.DomUtil.addClass(s,n),t.keyboard&&(s.tabIndex="0"),this._icon=s,this._initInteraction(),t.riseOnHover&&o.DomEvent.on(s,"mouseover",this._bringToFront,this).on(s,"mouseout",this._resetZIndex,this);var r=t.icon.createShadow(this._shadow),h=!1;r!==this._shadow&&(this._removeShadow(),h=!0),r&&o.DomUtil.addClass(r,n),this._shadow=r,t.opacity<1&&this._updateOpacity();var l=this._map._panes;a&&l.markerPane.appendChild(this._icon),r&&h&&l.shadowPane.appendChild(this._shadow)},_removeIcon:function(){this.options.riseOnHover&&o.DomEvent.off(this._icon,"mouseover",this._bringToFront).off(this._icon,"mouseout",this._resetZIndex),this._map._panes.markerPane.removeChild(this._icon),this._icon=null},_removeShadow:function(){this._shadow&&this._map._panes.shadowPane.removeChild(this._shadow),this._shadow=null},_setPos:function(t){o.DomUtil.setPosition(this._icon,t),this._shadow&&o.DomUtil.setPosition(this._shadow,t),this._zIndex=t.y+this.options.zIndexOffset,this._resetZIndex()},_updateZIndex:function(t){this._icon.style.zIndex=this._zIndex+t},_animateZoom:function(t){var e=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center);this._setPos(e)},_initInteraction:function(){if(this.options.clickable){var t=this._icon,e=["dblclick","mousedown","mouseover","mouseout","contextmenu"];o.DomUtil.addClass(t,"leaflet-clickable"),o.DomEvent.on(t,"click",this._onMouseClick,this),o.DomEvent.on(t,"keypress",this._onKeyPress,this);for(var i=0;i<e.length;i++)o.DomEvent.on(t,e[i],this._fireMouseEvent,this);o.Handler.MarkerDrag&&(this.dragging=new o.Handler.MarkerDrag(this),this.options.draggable&&this.dragging.enable())}},_onMouseClick:function(t){var e=this.dragging&&this.dragging.moved();(this.hasEventListeners(t.type)||e)&&o.DomEvent.stopPropagation(t),e||(this.dragging&&this.dragging._enabled||!this._map.dragging||!this._map.dragging.moved())&&this.fire(t.type,{originalEvent:t,latlng:this._latlng})},_onKeyPress:function(t){13===t.keyCode&&this.fire("click",{originalEvent:t,latlng:this._latlng})},_fireMouseEvent:function(t){this.fire(t.type,{originalEvent:t,latlng:this._latlng}),"contextmenu"===t.type&&this.hasEventListeners(t.type)&&o.DomEvent.preventDefault(t),"mousedown"!==t.type?o.DomEvent.stopPropagation(t):o.DomEvent.preventDefault(t)},setOpacity:function(t){return this.options.opacity=t,this._map&&this._updateOpacity(),this},_updateOpacity:function(){o.DomUtil.setOpacity(this._icon,this.options.opacity),this._shadow&&o.DomUtil.setOpacity(this._shadow,this.options.opacity)},_bringToFront:function(){this._updateZIndex(this.options.riseOffset)},_resetZIndex:function(){this._updateZIndex(0)}}),o.marker=function(t,e){return new o.Marker(t,e)},o.DivIcon=o.Icon.extend({options:{iconSize:[12,12],className:"leaflet-div-icon",html:!1},createIcon:function(t){var i=t&&"DIV"===t.tagName?t:e.createElement("div"),n=this.options;return i.innerHTML=n.html!==!1?n.html:"",n.bgPos&&(i.style.backgroundPosition=-n.bgPos.x+"px "+-n.bgPos.y+"px"),this._setIconStyles(i,"icon"),i},createShadow:function(){return null}}),o.divIcon=function(t){return new o.DivIcon(t)},o.Map.mergeOptions({closePopupOnClick:!0}),o.Popup=o.Class.extend({includes:o.Mixin.Events,options:{minWidth:50,maxWidth:300,maxHeight:null,autoPan:!0,closeButton:!0,offset:[0,7],autoPanPadding:[5,5],keepInView:!1,className:"",zoomAnimation:!0},initialize:function(t,e){o.setOptions(this,t),this._source=e,this._animated=o.Browser.any3d&&this.options.zoomAnimation,this._isOpen=!1},onAdd:function(t){this._map=t,this._container||this._initLayout(),this._updateContent();var e=t.options.fadeAnimation;e&&o.DomUtil.setOpacity(this._container,0),t._panes.popupPane.appendChild(this._container),t.on(this._getEvents(),this),this._update(),e&&o.DomUtil.setOpacity(this._container,1),this.fire("open"),t.fire("popupopen",{popup:this}),this._source&&this._source.fire("popupopen",{popup:this})},addTo:function(t){return t.addLayer(this),this},openOn:function(t){return t.openPopup(this),this},onRemove:function(t){t._panes.popupPane.removeChild(this._container),o.Util.falseFn(this._container.offsetWidth),t.off(this._getEvents(),this),t.options.fadeAnimation&&o.DomUtil.setOpacity(this._container,0),this._map=null,this.fire("close"),t.fire("popupclose",{popup:this}),this._source&&this._source.fire("popupclose",{popup:this})},setLatLng:function(t){return this._latlng=o.latLng(t),this._update(),this},setContent:function(t){return this._content=t,this._update(),this},_getEvents:function(){var t={viewreset:this._updatePosition};return this._animated&&(t.zoomanim=this._zoomAnimation),("closeOnClick"in this.options?this.options.closeOnClick:this._map.options.closePopupOnClick)&&(t.preclick=this._close),this.options.keepInView&&(t.moveend=this._adjustPan),t},_close:function(){this._map&&this._map.closePopup(this)},_initLayout:function(){var t,e="leaflet-popup",i=e+" "+this.options.className+" leaflet-zoom-"+(this._animated?"animated":"hide"),n=this._container=o.DomUtil.create("div",i);this.options.closeButton&&(t=this._closeButton=o.DomUtil.create("a",e+"-close-button",n),t.href="#close",t.innerHTML="&#215;",o.DomEvent.disableClickPropagation(t),o.DomEvent.on(t,"click",this._onCloseButtonClick,this));var s=this._wrapper=o.DomUtil.create("div",e+"-content-wrapper",n);o.DomEvent.disableClickPropagation(s),this._contentNode=o.DomUtil.create("div",e+"-content",s),o.DomEvent.on(this._contentNode,"mousewheel",o.DomEvent.stopPropagation),o.DomEvent.on(this._contentNode,"MozMousePixelScroll",o.DomEvent.stopPropagation),o.DomEvent.on(s,"contextmenu",o.DomEvent.stopPropagation),this._tipContainer=o.DomUtil.create("div",e+"-tip-container",n),this._tip=o.DomUtil.create("div",e+"-tip",this._tipContainer)},_update:function(){this._map&&(this._container.style.visibility="hidden",this._updateContent(),this._updateLayout(),this._updatePosition(),this._container.style.visibility="",this._adjustPan())},_updateContent:function(){if(this._content){if("string"==typeof this._content)this._contentNode.innerHTML=this._content;else{for(;this._contentNode.hasChildNodes();)this._contentNode.removeChild(this._contentNode.firstChild);this._contentNode.appendChild(this._content)}this.fire("contentupdate")}},_updateLayout:function(){var t=this._contentNode,e=t.style;e.width="",e.whiteSpace="nowrap";var i=t.offsetWidth;i=Math.min(i,this.options.maxWidth),i=Math.max(i,this.options.minWidth),e.width=i+1+"px",e.whiteSpace="",e.height="";var n=t.offsetHeight,s=this.options.maxHeight,a="leaflet-popup-scrolled";s&&n>s?(e.height=s+"px",o.DomUtil.addClass(t,a)):o.DomUtil.removeClass(t,a),this._containerWidth=this._container.offsetWidth},_updatePosition:function(){if(this._map){var t=this._map.latLngToLayerPoint(this._latlng),e=this._animated,i=o.point(this.options.offset);e&&o.DomUtil.setPosition(this._container,t),this._containerBottom=-i.y-(e?0:t.y),this._containerLeft=-Math.round(this._containerWidth/2)+i.x+(e?0:t.x),this._container.style.bottom=this._containerBottom+"px",this._container.style.left=this._containerLeft+"px"}},_zoomAnimation:function(t){var e=this._map._latLngToNewLayerPoint(this._latlng,t.zoom,t.center);o.DomUtil.setPosition(this._container,e)},_adjustPan:function(){if(this.options.autoPan){var t=this._map,e=this._container.offsetHeight,i=this._containerWidth,n=new o.Point(this._containerLeft,-e-this._containerBottom);this._animated&&n._add(o.DomUtil.getPosition(this._container));var s=t.layerPointToContainerPoint(n),a=o.point(this.options.autoPanPadding),r=t.getSize(),h=0,l=0;s.x+i>r.x&&(h=s.x+i-r.x+a.x),s.x-h<0&&(h=s.x-a.x),s.y+e>r.y&&(l=s.y+e-r.y+a.y),s.y-l<0&&(l=s.y-a.y),(h||l)&&t.fire("autopanstart").panBy([h,l])}},_onCloseButtonClick:function(t){this._close(),o.DomEvent.stop(t)}}),o.popup=function(t,e){return new o.Popup(t,e)},o.Map.include({openPopup:function(t,e,i){if(this.closePopup(),!(t instanceof o.Popup)){var n=t;t=new o.Popup(i).setLatLng(e).setContent(n)}return t._isOpen=!0,this._popup=t,this.addLayer(t)},closePopup:function(t){return t&&t!==this._popup||(t=this._popup,this._popup=null),t&&(this.removeLayer(t),t._isOpen=!1),this}}),o.Marker.include({openPopup:function(){return this._popup&&this._map&&!this._map.hasLayer(this._popup)&&(this._popup.setLatLng(this._latlng),this._map.openPopup(this._popup)),this},closePopup:function(){return this._popup&&this._popup._close(),this},togglePopup:function(){return this._popup&&(this._popup._isOpen?this.closePopup():this.openPopup()),this},bindPopup:function(t,e){var i=o.point(this.options.icon.options.popupAnchor||[0,0]);return i=i.add(o.Popup.prototype.options.offset),e&&e.offset&&(i=i.add(e.offset)),e=o.extend({offset:i},e),this._popup||this.on("click",this.togglePopup,this).on("remove",this.closePopup,this).on("move",this._movePopup,this),t instanceof o.Popup?(o.setOptions(t,e),this._popup=t):this._popup=new o.Popup(e,this).setContent(t),this},setPopupContent:function(t){return this._popup&&this._popup.setContent(t),this},unbindPopup:function(){return this._popup&&(this._popup=null,this.off("click",this.togglePopup).off("remove",this.closePopup).off("move",this._movePopup)),this},_movePopup:function(t){this._popup.setLatLng(t.latlng)}}),o.LayerGroup=o.Class.extend({initialize:function(t){this._layers={};var e,i;if(t)for(e=0,i=t.length;i>e;e++)this.addLayer(t[e])},addLayer:function(t){var e=this.getLayerId(t);return this._layers[e]=t,this._map&&this._map.addLayer(t),this},removeLayer:function(t){var e=t in this._layers?t:this.getLayerId(t);return this._map&&this._layers[e]&&this._map.removeLayer(this._layers[e]),delete this._layers[e],this},hasLayer:function(t){return t?t in this._layers||this.getLayerId(t)in this._layers:!1},clearLayers:function(){return this.eachLayer(this.removeLayer,this),this},invoke:function(t){var e,i,n=Array.prototype.slice.call(arguments,1);for(e in this._layers)i=this._layers[e],i[t]&&i[t].apply(i,n);return this},onAdd:function(t){this._map=t,this.eachLayer(t.addLayer,t)},onRemove:function(t){this.eachLayer(t.removeLayer,t),this._map=null},addTo:function(t){return t.addLayer(this),this},eachLayer:function(t,e){for(var i in this._layers)t.call(e,this._layers[i]);return this},getLayer:function(t){return this._layers[t]},getLayers:function(){var t=[];for(var e in this._layers)t.push(this._layers[e]);return t},setZIndex:function(t){return this.invoke("setZIndex",t)},getLayerId:function(t){return o.stamp(t)}}),o.layerGroup=function(t){return new o.LayerGroup(t)},o.FeatureGroup=o.LayerGroup.extend({includes:o.Mixin.Events,statics:{EVENTS:"click dblclick mouseover mouseout mousemove contextmenu popupopen popupclose"},addLayer:function(t){return this.hasLayer(t)?this:(t.on(o.FeatureGroup.EVENTS,this._propagateEvent,this),o.LayerGroup.prototype.addLayer.call(this,t),this._popupContent&&t.bindPopup&&t.bindPopup(this._popupContent,this._popupOptions),this.fire("layeradd",{layer:t}))},removeLayer:function(t){return this.hasLayer(t)?(t in this._layers&&(t=this._layers[t]),t.off(o.FeatureGroup.EVENTS,this._propagateEvent,this),o.LayerGroup.prototype.removeLayer.call(this,t),this._popupContent&&this.invoke("unbindPopup"),this.fire("layerremove",{layer:t})):this},bindPopup:function(t,e){return this._popupContent=t,this._popupOptions=e,this.invoke("bindPopup",t,e)},setStyle:function(t){return this.invoke("setStyle",t)},bringToFront:function(){return this.invoke("bringToFront")},bringToBack:function(){return this.invoke("bringToBack")},getBounds:function(){var t=new o.LatLngBounds;return this.eachLayer(function(e){t.extend(e instanceof o.Marker?e.getLatLng():e.getBounds())}),t},_propagateEvent:function(t){t.layer||(t.layer=t.target),t.target=this,this.fire(t.type,t)}}),o.featureGroup=function(t){return new o.FeatureGroup(t)},o.Path=o.Class.extend({includes:[o.Mixin.Events],statics:{CLIP_PADDING:function(){var e=o.Browser.mobile?1280:2e3,i=(e/Math.max(t.outerWidth,t.outerHeight)-1)/2;return Math.max(0,Math.min(.5,i))}()},options:{stroke:!0,color:"#0033ff",dashArray:null,weight:5,opacity:.5,fill:!1,fillColor:null,fillOpacity:.2,clickable:!0},initialize:function(t){o.setOptions(this,t)},onAdd:function(t){this._map=t,this._container||(this._initElements(),this._initEvents()),this.projectLatlngs(),this._updatePath(),this._container&&this._map._pathRoot.appendChild(this._container),this.fire("add"),t.on({viewreset:this.projectLatlngs,moveend:this._updatePath},this)},addTo:function(t){return t.addLayer(this),this},onRemove:function(t){t._pathRoot.removeChild(this._container),this.fire("remove"),this._map=null,o.Browser.vml&&(this._container=null,this._stroke=null,this._fill=null),t.off({viewreset:this.projectLatlngs,moveend:this._updatePath},this)},projectLatlngs:function(){},setStyle:function(t){return o.setOptions(this,t),this._container&&this._updateStyle(),this},redraw:function(){return this._map&&(this.projectLatlngs(),this._updatePath()),this}}),o.Map.include({_updatePathViewport:function(){var t=o.Path.CLIP_PADDING,e=this.getSize(),i=o.DomUtil.getPosition(this._mapPane),n=i.multiplyBy(-1)._subtract(e.multiplyBy(t)._round()),s=n.add(e.multiplyBy(1+2*t)._round());this._pathViewport=new o.Bounds(n,s)}}),o.Path.SVG_NS="http://www.w3.org/2000/svg",o.Browser.svg=!(!e.createElementNS||!e.createElementNS(o.Path.SVG_NS,"svg").createSVGRect),o.Path=o.Path.extend({statics:{SVG:o.Browser.svg},bringToFront:function(){var t=this._map._pathRoot,e=this._container;return e&&t.lastChild!==e&&t.appendChild(e),this},bringToBack:function(){var t=this._map._pathRoot,e=this._container,i=t.firstChild;return e&&i!==e&&t.insertBefore(e,i),this},getPathString:function(){},_createElement:function(t){return e.createElementNS(o.Path.SVG_NS,t)},_initElements:function(){this._map._initPathRoot(),this._initPath(),this._initStyle()},_initPath:function(){this._container=this._createElement("g"),this._path=this._createElement("path"),this._container.appendChild(this._path)},_initStyle:function(){this.options.stroke&&(this._path.setAttribute("stroke-linejoin","round"),this._path.setAttribute("stroke-linecap","round")),this.options.fill&&this._path.setAttribute("fill-rule","evenodd"),this.options.pointerEvents&&this._path.setAttribute("pointer-events",this.options.pointerEvents),this.options.clickable||this.options.pointerEvents||this._path.setAttribute("pointer-events","none"),this._updateStyle()},_updateStyle:function(){this.options.stroke?(this._path.setAttribute("stroke",this.options.color),this._path.setAttribute("stroke-opacity",this.options.opacity),this._path.setAttribute("stroke-width",this.options.weight),this.options.dashArray?this._path.setAttribute("stroke-dasharray",this.options.dashArray):this._path.removeAttribute("stroke-dasharray")):this._path.setAttribute("stroke","none"),this.options.fill?(this._path.setAttribute("fill",this.options.fillColor||this.options.color),this._path.setAttribute("fill-opacity",this.options.fillOpacity)):this._path.setAttribute("fill","none")},_updatePath:function(){var t=this.getPathString();t||(t="M0 0"),this._path.setAttribute("d",t)},_initEvents:function(){if(this.options.clickable){(o.Browser.svg||!o.Browser.vml)&&this._path.setAttribute("class","leaflet-clickable"),o.DomEvent.on(this._container,"click",this._onMouseClick,this);for(var t=["dblclick","mousedown","mouseover","mouseout","mousemove","contextmenu"],e=0;e<t.length;e++)o.DomEvent.on(this._container,t[e],this._fireMouseEvent,this)}},_onMouseClick:function(t){this._map.dragging&&this._map.dragging.moved()||this._fireMouseEvent(t)},_fireMouseEvent:function(t){if(this.hasEventListeners(t.type)){var e=this._map,i=e.mouseEventToContainerPoint(t),n=e.containerPointToLayerPoint(i),s=e.layerPointToLatLng(n);this.fire(t.type,{latlng:s,layerPoint:n,containerPoint:i,originalEvent:t}),"contextmenu"===t.type&&o.DomEvent.preventDefault(t),"mousemove"!==t.type&&o.DomEvent.stopPropagation(t)}}}),o.Map.include({_initPathRoot:function(){this._pathRoot||(this._pathRoot=o.Path.prototype._createElement("svg"),this._panes.overlayPane.appendChild(this._pathRoot),this.options.zoomAnimation&&o.Browser.any3d?(this._pathRoot.setAttribute("class"," leaflet-zoom-animated"),this.on({zoomanim:this._animatePathZoom,zoomend:this._endPathZoom})):this._pathRoot.setAttribute("class"," leaflet-zoom-hide"),this.on("moveend",this._updateSvgViewport),this._updateSvgViewport())},_animatePathZoom:function(t){var e=this.getZoomScale(t.zoom),i=this._getCenterOffset(t.center)._multiplyBy(-e)._add(this._pathViewport.min);this._pathRoot.style[o.DomUtil.TRANSFORM]=o.DomUtil.getTranslateString(i)+" scale("+e+") ",this._pathZooming=!0},_endPathZoom:function(){this._pathZooming=!1},_updateSvgViewport:function(){if(!this._pathZooming){this._updatePathViewport();var t=this._pathViewport,e=t.min,i=t.max,n=i.x-e.x,s=i.y-e.y,a=this._pathRoot,r=this._panes.overlayPane;o.Browser.mobileWebkit&&r.removeChild(a),o.DomUtil.setPosition(a,e),a.setAttribute("width",n),a.setAttribute("height",s),a.setAttribute("viewBox",[e.x,e.y,n,s].join(" ")),o.Browser.mobileWebkit&&r.appendChild(a)}}}),o.Path.include({bindPopup:function(t,e){return t instanceof o.Popup?this._popup=t:((!this._popup||e)&&(this._popup=new o.Popup(e,this)),this._popup.setContent(t)),this._popupHandlersAdded||(this.on("click",this._openPopup,this).on("remove",this.closePopup,this),this._popupHandlersAdded=!0),this},unbindPopup:function(){return this._popup&&(this._popup=null,this.off("click",this._openPopup).off("remove",this.closePopup),this._popupHandlersAdded=!1),this},openPopup:function(t){return this._popup&&(t=t||this._latlng||this._latlngs[Math.floor(this._latlngs.length/2)],this._openPopup({latlng:t})),this},closePopup:function(){return this._popup&&this._popup._close(),this},_openPopup:function(t){this._popup.setLatLng(t.latlng),this._map.openPopup(this._popup)}}),o.Browser.vml=!o.Browser.svg&&function(){try{var t=e.createElement("div");t.innerHTML='<v:shape adj="1"/>';var i=t.firstChild;return i.style.behavior="url(#default#VML)",i&&"object"==typeof i.adj}catch(n){return!1}}(),o.Path=o.Browser.svg||!o.Browser.vml?o.Path:o.Path.extend({statics:{VML:!0,CLIP_PADDING:.02},_createElement:function(){try{return e.namespaces.add("lvml","urn:schemas-microsoft-com:vml"),function(t){return e.createElement("<lvml:"+t+' class="lvml">')}}catch(t){return function(t){return e.createElement("<"+t+' xmlns="urn:schemas-microsoft.com:vml" class="lvml">')}}}(),_initPath:function(){var t=this._container=this._createElement("shape");
o.DomUtil.addClass(t,"leaflet-vml-shape"),this.options.clickable&&o.DomUtil.addClass(t,"leaflet-clickable"),t.coordsize="1 1",this._path=this._createElement("path"),t.appendChild(this._path),this._map._pathRoot.appendChild(t)},_initStyle:function(){this._updateStyle()},_updateStyle:function(){var t=this._stroke,e=this._fill,i=this.options,n=this._container;n.stroked=i.stroke,n.filled=i.fill,i.stroke?(t||(t=this._stroke=this._createElement("stroke"),t.endcap="round",n.appendChild(t)),t.weight=i.weight+"px",t.color=i.color,t.opacity=i.opacity,t.dashStyle=i.dashArray?i.dashArray instanceof Array?i.dashArray.join(" "):i.dashArray.replace(/( *, *)/g," "):""):t&&(n.removeChild(t),this._stroke=null),i.fill?(e||(e=this._fill=this._createElement("fill"),n.appendChild(e)),e.color=i.fillColor||i.color,e.opacity=i.fillOpacity):e&&(n.removeChild(e),this._fill=null)},_updatePath:function(){var t=this._container.style;t.display="none",this._path.v=this.getPathString()+" ",t.display=""}}),o.Map.include(o.Browser.svg||!o.Browser.vml?{}:{_initPathRoot:function(){if(!this._pathRoot){var t=this._pathRoot=e.createElement("div");t.className="leaflet-vml-container",this._panes.overlayPane.appendChild(t),this.on("moveend",this._updatePathViewport),this._updatePathViewport()}}}),o.Browser.canvas=function(){return!!e.createElement("canvas").getContext}(),o.Path=o.Path.SVG&&!t.L_PREFER_CANVAS||!o.Browser.canvas?o.Path:o.Path.extend({statics:{CANVAS:!0,SVG:!1},redraw:function(){return this._map&&(this.projectLatlngs(),this._requestUpdate()),this},setStyle:function(t){return o.setOptions(this,t),this._map&&(this._updateStyle(),this._requestUpdate()),this},onRemove:function(t){t.off("viewreset",this.projectLatlngs,this).off("moveend",this._updatePath,this),this.options.clickable&&(this._map.off("click",this._onClick,this),this._map.off("mousemove",this._onMouseMove,this)),this._requestUpdate(),this._map=null},_requestUpdate:function(){this._map&&!o.Path._updateRequest&&(o.Path._updateRequest=o.Util.requestAnimFrame(this._fireMapMoveEnd,this._map))},_fireMapMoveEnd:function(){o.Path._updateRequest=null,this.fire("moveend")},_initElements:function(){this._map._initPathRoot(),this._ctx=this._map._canvasCtx},_updateStyle:function(){var t=this.options;t.stroke&&(this._ctx.lineWidth=t.weight,this._ctx.strokeStyle=t.color),t.fill&&(this._ctx.fillStyle=t.fillColor||t.color)},_drawPath:function(){var t,e,i,n,s,a;for(this._ctx.beginPath(),t=0,i=this._parts.length;i>t;t++){for(e=0,n=this._parts[t].length;n>e;e++)s=this._parts[t][e],a=(0===e?"move":"line")+"To",this._ctx[a](s.x,s.y);this instanceof o.Polygon&&this._ctx.closePath()}},_checkIfEmpty:function(){return!this._parts.length},_updatePath:function(){if(!this._checkIfEmpty()){var t=this._ctx,e=this.options;this._drawPath(),t.save(),this._updateStyle(),e.fill&&(t.globalAlpha=e.fillOpacity,t.fill()),e.stroke&&(t.globalAlpha=e.opacity,t.stroke()),t.restore()}},_initEvents:function(){this.options.clickable&&(this._map.on("mousemove",this._onMouseMove,this),this._map.on("click",this._onClick,this))},_onClick:function(t){this._containsPoint(t.layerPoint)&&this.fire("click",t)},_onMouseMove:function(t){this._map&&!this._map._animatingZoom&&(this._containsPoint(t.layerPoint)?(this._ctx.canvas.style.cursor="pointer",this._mouseInside=!0,this.fire("mouseover",t)):this._mouseInside&&(this._ctx.canvas.style.cursor="",this._mouseInside=!1,this.fire("mouseout",t)))}}),o.Map.include(o.Path.SVG&&!t.L_PREFER_CANVAS||!o.Browser.canvas?{}:{_initPathRoot:function(){var t,i=this._pathRoot;i||(i=this._pathRoot=e.createElement("canvas"),i.style.position="absolute",t=this._canvasCtx=i.getContext("2d"),t.lineCap="round",t.lineJoin="round",this._panes.overlayPane.appendChild(i),this.options.zoomAnimation&&(this._pathRoot.className="leaflet-zoom-animated",this.on("zoomanim",this._animatePathZoom),this.on("zoomend",this._endPathZoom)),this.on("moveend",this._updateCanvasViewport),this._updateCanvasViewport())},_updateCanvasViewport:function(){if(!this._pathZooming){this._updatePathViewport();var t=this._pathViewport,e=t.min,i=t.max.subtract(e),n=this._pathRoot;o.DomUtil.setPosition(n,e),n.width=i.x,n.height=i.y,n.getContext("2d").translate(-e.x,-e.y)}}}),o.LineUtil={simplify:function(t,e){if(!e||!t.length)return t.slice();var i=e*e;return t=this._reducePoints(t,i),t=this._simplifyDP(t,i)},pointToSegmentDistance:function(t,e,i){return Math.sqrt(this._sqClosestPointOnSegment(t,e,i,!0))},closestPointOnSegment:function(t,e,i){return this._sqClosestPointOnSegment(t,e,i)},_simplifyDP:function(t,e){var n=t.length,o=typeof Uint8Array!=i+""?Uint8Array:Array,s=new o(n);s[0]=s[n-1]=1,this._simplifyDPStep(t,s,e,0,n-1);var a,r=[];for(a=0;n>a;a++)s[a]&&r.push(t[a]);return r},_simplifyDPStep:function(t,e,i,n,o){var s,a,r,h=0;for(a=n+1;o-1>=a;a++)r=this._sqClosestPointOnSegment(t[a],t[n],t[o],!0),r>h&&(s=a,h=r);h>i&&(e[s]=1,this._simplifyDPStep(t,e,i,n,s),this._simplifyDPStep(t,e,i,s,o))},_reducePoints:function(t,e){for(var i=[t[0]],n=1,o=0,s=t.length;s>n;n++)this._sqDist(t[n],t[o])>e&&(i.push(t[n]),o=n);return s-1>o&&i.push(t[s-1]),i},clipSegment:function(t,e,i,n){var o,s,a,r=n?this._lastCode:this._getBitCode(t,i),h=this._getBitCode(e,i);for(this._lastCode=h;;){if(!(r|h))return[t,e];if(r&h)return!1;o=r||h,s=this._getEdgeIntersection(t,e,o,i),a=this._getBitCode(s,i),o===r?(t=s,r=a):(e=s,h=a)}},_getEdgeIntersection:function(t,e,i,n){var s=e.x-t.x,a=e.y-t.y,r=n.min,h=n.max;return 8&i?new o.Point(t.x+s*(h.y-t.y)/a,h.y):4&i?new o.Point(t.x+s*(r.y-t.y)/a,r.y):2&i?new o.Point(h.x,t.y+a*(h.x-t.x)/s):1&i?new o.Point(r.x,t.y+a*(r.x-t.x)/s):void 0},_getBitCode:function(t,e){var i=0;return t.x<e.min.x?i|=1:t.x>e.max.x&&(i|=2),t.y<e.min.y?i|=4:t.y>e.max.y&&(i|=8),i},_sqDist:function(t,e){var i=e.x-t.x,n=e.y-t.y;return i*i+n*n},_sqClosestPointOnSegment:function(t,e,i,n){var s,a=e.x,r=e.y,h=i.x-a,l=i.y-r,u=h*h+l*l;return u>0&&(s=((t.x-a)*h+(t.y-r)*l)/u,s>1?(a=i.x,r=i.y):s>0&&(a+=h*s,r+=l*s)),h=t.x-a,l=t.y-r,n?h*h+l*l:new o.Point(a,r)}},o.Polyline=o.Path.extend({initialize:function(t,e){o.Path.prototype.initialize.call(this,e),this._latlngs=this._convertLatLngs(t)},options:{smoothFactor:1,noClip:!1},projectLatlngs:function(){this._originalPoints=[];for(var t=0,e=this._latlngs.length;e>t;t++)this._originalPoints[t]=this._map.latLngToLayerPoint(this._latlngs[t])},getPathString:function(){for(var t=0,e=this._parts.length,i="";e>t;t++)i+=this._getPathPartStr(this._parts[t]);return i},getLatLngs:function(){return this._latlngs},setLatLngs:function(t){return this._latlngs=this._convertLatLngs(t),this.redraw()},addLatLng:function(t){return this._latlngs.push(o.latLng(t)),this.redraw()},spliceLatLngs:function(){var t=[].splice.apply(this._latlngs,arguments);return this._convertLatLngs(this._latlngs,!0),this.redraw(),t},closestLayerPoint:function(t){for(var e,i,n=1/0,s=this._parts,a=null,r=0,h=s.length;h>r;r++)for(var l=s[r],u=1,c=l.length;c>u;u++){e=l[u-1],i=l[u];var d=o.LineUtil._sqClosestPointOnSegment(t,e,i,!0);n>d&&(n=d,a=o.LineUtil._sqClosestPointOnSegment(t,e,i))}return a&&(a.distance=Math.sqrt(n)),a},getBounds:function(){return new o.LatLngBounds(this.getLatLngs())},_convertLatLngs:function(t,e){var i,n,s=e?t:[];for(i=0,n=t.length;n>i;i++){if(o.Util.isArray(t[i])&&"number"!=typeof t[i][0])return;s[i]=o.latLng(t[i])}return s},_initEvents:function(){o.Path.prototype._initEvents.call(this)},_getPathPartStr:function(t){for(var e,i=o.Path.VML,n=0,s=t.length,a="";s>n;n++)e=t[n],i&&e._round(),a+=(n?"L":"M")+e.x+" "+e.y;return a},_clipPoints:function(){var t,e,i,n=this._originalPoints,s=n.length;if(this.options.noClip)return this._parts=[n],void 0;this._parts=[];var a=this._parts,r=this._map._pathViewport,h=o.LineUtil;for(t=0,e=0;s-1>t;t++)i=h.clipSegment(n[t],n[t+1],r,t),i&&(a[e]=a[e]||[],a[e].push(i[0]),(i[1]!==n[t+1]||t===s-2)&&(a[e].push(i[1]),e++))},_simplifyPoints:function(){for(var t=this._parts,e=o.LineUtil,i=0,n=t.length;n>i;i++)t[i]=e.simplify(t[i],this.options.smoothFactor)},_updatePath:function(){this._map&&(this._clipPoints(),this._simplifyPoints(),o.Path.prototype._updatePath.call(this))}}),o.polyline=function(t,e){return new o.Polyline(t,e)},o.PolyUtil={},o.PolyUtil.clipPolygon=function(t,e){var i,n,s,a,r,h,l,u,c,d=[1,4,2,8],p=o.LineUtil;for(n=0,l=t.length;l>n;n++)t[n]._code=p._getBitCode(t[n],e);for(a=0;4>a;a++){for(u=d[a],i=[],n=0,l=t.length,s=l-1;l>n;s=n++)r=t[n],h=t[s],r._code&u?h._code&u||(c=p._getEdgeIntersection(h,r,u,e),c._code=p._getBitCode(c,e),i.push(c)):(h._code&u&&(c=p._getEdgeIntersection(h,r,u,e),c._code=p._getBitCode(c,e),i.push(c)),i.push(r));t=i}return t},o.Polygon=o.Polyline.extend({options:{fill:!0},initialize:function(t,e){var i,n,s;if(o.Polyline.prototype.initialize.call(this,t,e),t&&o.Util.isArray(t[0])&&"number"!=typeof t[0][0])for(this._latlngs=this._convertLatLngs(t[0]),this._holes=t.slice(1),i=0,n=this._holes.length;n>i;i++)s=this._holes[i]=this._convertLatLngs(this._holes[i]),s[0].equals(s[s.length-1])&&s.pop();t=this._latlngs,t.length>=2&&t[0].equals(t[t.length-1])&&t.pop()},projectLatlngs:function(){if(o.Polyline.prototype.projectLatlngs.call(this),this._holePoints=[],this._holes){var t,e,i,n;for(t=0,i=this._holes.length;i>t;t++)for(this._holePoints[t]=[],e=0,n=this._holes[t].length;n>e;e++)this._holePoints[t][e]=this._map.latLngToLayerPoint(this._holes[t][e])}},_clipPoints:function(){var t=this._originalPoints,e=[];if(this._parts=[t].concat(this._holePoints),!this.options.noClip){for(var i=0,n=this._parts.length;n>i;i++){var s=o.PolyUtil.clipPolygon(this._parts[i],this._map._pathViewport);s.length&&e.push(s)}this._parts=e}},_getPathPartStr:function(t){var e=o.Polyline.prototype._getPathPartStr.call(this,t);return e+(o.Browser.svg?"z":"x")}}),o.polygon=function(t,e){return new o.Polygon(t,e)},function(){function t(t){return o.FeatureGroup.extend({initialize:function(t,e){this._layers={},this._options=e,this.setLatLngs(t)},setLatLngs:function(e){var i=0,n=e.length;for(this.eachLayer(function(t){n>i?t.setLatLngs(e[i++]):this.removeLayer(t)},this);n>i;)this.addLayer(new t(e[i++],this._options));return this},getLatLngs:function(){var t=[];return this.eachLayer(function(e){t.push(e.getLatLngs())}),t}})}o.MultiPolyline=t(o.Polyline),o.MultiPolygon=t(o.Polygon),o.multiPolyline=function(t,e){return new o.MultiPolyline(t,e)},o.multiPolygon=function(t,e){return new o.MultiPolygon(t,e)}}(),o.Rectangle=o.Polygon.extend({initialize:function(t,e){o.Polygon.prototype.initialize.call(this,this._boundsToLatLngs(t),e)},setBounds:function(t){this.setLatLngs(this._boundsToLatLngs(t))},_boundsToLatLngs:function(t){return t=o.latLngBounds(t),[t.getSouthWest(),t.getNorthWest(),t.getNorthEast(),t.getSouthEast()]}}),o.rectangle=function(t,e){return new o.Rectangle(t,e)},o.Circle=o.Path.extend({initialize:function(t,e,i){o.Path.prototype.initialize.call(this,i),this._latlng=o.latLng(t),this._mRadius=e},options:{fill:!0},setLatLng:function(t){return this._latlng=o.latLng(t),this.redraw()},setRadius:function(t){return this._mRadius=t,this.redraw()},projectLatlngs:function(){var t=this._getLngRadius(),e=this._latlng,i=this._map.latLngToLayerPoint([e.lat,e.lng-t]);this._point=this._map.latLngToLayerPoint(e),this._radius=Math.max(this._point.x-i.x,1)},getBounds:function(){var t=this._getLngRadius(),e=360*(this._mRadius/40075017),i=this._latlng;return new o.LatLngBounds([i.lat-e,i.lng-t],[i.lat+e,i.lng+t])},getLatLng:function(){return this._latlng},getPathString:function(){var t=this._point,e=this._radius;return this._checkIfEmpty()?"":o.Browser.svg?"M"+t.x+","+(t.y-e)+"A"+e+","+e+",0,1,1,"+(t.x-.1)+","+(t.y-e)+" z":(t._round(),e=Math.round(e),"AL "+t.x+","+t.y+" "+e+","+e+" 0,"+23592600)},getRadius:function(){return this._mRadius},_getLatRadius:function(){return 360*(this._mRadius/40075017)},_getLngRadius:function(){return this._getLatRadius()/Math.cos(o.LatLng.DEG_TO_RAD*this._latlng.lat)},_checkIfEmpty:function(){if(!this._map)return!1;var t=this._map._pathViewport,e=this._radius,i=this._point;return i.x-e>t.max.x||i.y-e>t.max.y||i.x+e<t.min.x||i.y+e<t.min.y}}),o.circle=function(t,e,i){return new o.Circle(t,e,i)},o.CircleMarker=o.Circle.extend({options:{radius:10,weight:2},initialize:function(t,e){o.Circle.prototype.initialize.call(this,t,null,e),this._radius=this.options.radius},projectLatlngs:function(){this._point=this._map.latLngToLayerPoint(this._latlng)},_updateStyle:function(){o.Circle.prototype._updateStyle.call(this),this.setRadius(this.options.radius)},setRadius:function(t){return this.options.radius=this._radius=t,this.redraw()}}),o.circleMarker=function(t,e){return new o.CircleMarker(t,e)},o.Polyline.include(o.Path.CANVAS?{_containsPoint:function(t,e){var i,n,s,a,r,h,l,u=this.options.weight/2;for(o.Browser.touch&&(u+=10),i=0,a=this._parts.length;a>i;i++)for(l=this._parts[i],n=0,r=l.length,s=r-1;r>n;s=n++)if((e||0!==n)&&(h=o.LineUtil.pointToSegmentDistance(t,l[s],l[n]),u>=h))return!0;return!1}}:{}),o.Polygon.include(o.Path.CANVAS?{_containsPoint:function(t){var e,i,n,s,a,r,h,l,u=!1;if(o.Polyline.prototype._containsPoint.call(this,t,!0))return!0;for(s=0,h=this._parts.length;h>s;s++)for(e=this._parts[s],a=0,l=e.length,r=l-1;l>a;r=a++)i=e[a],n=e[r],i.y>t.y!=n.y>t.y&&t.x<(n.x-i.x)*(t.y-i.y)/(n.y-i.y)+i.x&&(u=!u);return u}}:{}),o.Circle.include(o.Path.CANVAS?{_drawPath:function(){var t=this._point;this._ctx.beginPath(),this._ctx.arc(t.x,t.y,this._radius,0,2*Math.PI,!1)},_containsPoint:function(t){var e=this._point,i=this.options.stroke?this.options.weight/2:0;return t.distanceTo(e)<=this._radius+i}}:{}),o.CircleMarker.include(o.Path.CANVAS?{_updateStyle:function(){o.Path.prototype._updateStyle.call(this)}}:{}),o.GeoJSON=o.FeatureGroup.extend({initialize:function(t,e){o.setOptions(this,e),this._layers={},t&&this.addData(t)},addData:function(t){var e,i,n,s=o.Util.isArray(t)?t:t.features;if(s){for(e=0,i=s.length;i>e;e++)n=s[e],(n.geometries||n.geometry||n.features||n.coordinates)&&this.addData(s[e]);return this}var a=this.options;if(!a.filter||a.filter(t)){var r=o.GeoJSON.geometryToLayer(t,a.pointToLayer,a.coordsToLatLng);return r.feature=o.GeoJSON.asFeature(t),r.defaultOptions=r.options,this.resetStyle(r),a.onEachFeature&&a.onEachFeature(t,r),this.addLayer(r)}},resetStyle:function(t){var e=this.options.style;e&&(o.Util.extend(t.options,t.defaultOptions),this._setLayerStyle(t,e))},setStyle:function(t){this.eachLayer(function(e){this._setLayerStyle(e,t)},this)},_setLayerStyle:function(t,e){"function"==typeof e&&(e=e(t.feature)),t.setStyle&&t.setStyle(e)}}),o.extend(o.GeoJSON,{geometryToLayer:function(t,e,i){var n,s,a,r,h,l="Feature"===t.type?t.geometry:t,u=l.coordinates,c=[];switch(i=i||this.coordsToLatLng,l.type){case"Point":return n=i(u),e?e(t,n):new o.Marker(n);case"MultiPoint":for(a=0,r=u.length;r>a;a++)n=i(u[a]),h=e?e(t,n):new o.Marker(n),c.push(h);return new o.FeatureGroup(c);case"LineString":return s=this.coordsToLatLngs(u,0,i),new o.Polyline(s);case"Polygon":return s=this.coordsToLatLngs(u,1,i),new o.Polygon(s);case"MultiLineString":return s=this.coordsToLatLngs(u,1,i),new o.MultiPolyline(s);case"MultiPolygon":return s=this.coordsToLatLngs(u,2,i),new o.MultiPolygon(s);case"GeometryCollection":for(a=0,r=l.geometries.length;r>a;a++)h=this.geometryToLayer({geometry:l.geometries[a],type:"Feature",properties:t.properties},e,i),c.push(h);return new o.FeatureGroup(c);default:throw new Error("Invalid GeoJSON object.")}},coordsToLatLng:function(t){return new o.LatLng(t[1],t[0])},coordsToLatLngs:function(t,e,i){var n,o,s,a=[];for(o=0,s=t.length;s>o;o++)n=e?this.coordsToLatLngs(t[o],e-1,i):(i||this.coordsToLatLng)(t[o]),a.push(n);return a},latLngToCoords:function(t){return[t.lng,t.lat]},latLngsToCoords:function(t){for(var e=[],i=0,n=t.length;n>i;i++)e.push(o.GeoJSON.latLngToCoords(t[i]));return e},getFeature:function(t,e){return t.feature?o.extend({},t.feature,{geometry:e}):o.GeoJSON.asFeature(e)},asFeature:function(t){return"Feature"===t.type?t:{type:"Feature",properties:{},geometry:t}}});var a={toGeoJSON:function(){return o.GeoJSON.getFeature(this,{type:"Point",coordinates:o.GeoJSON.latLngToCoords(this.getLatLng())})}};o.Marker.include(a),o.Circle.include(a),o.CircleMarker.include(a),o.Polyline.include({toGeoJSON:function(){return o.GeoJSON.getFeature(this,{type:"LineString",coordinates:o.GeoJSON.latLngsToCoords(this.getLatLngs())})}}),o.Polygon.include({toGeoJSON:function(){var t,e,i,n=[o.GeoJSON.latLngsToCoords(this.getLatLngs())];if(n[0].push(n[0][0]),this._holes)for(t=0,e=this._holes.length;e>t;t++)i=o.GeoJSON.latLngsToCoords(this._holes[t]),i.push(i[0]),n.push(i);return o.GeoJSON.getFeature(this,{type:"Polygon",coordinates:n})}}),function(){function t(t,e){t.include({toGeoJSON:function(){var t=[];return this.eachLayer(function(e){t.push(e.toGeoJSON().geometry.coordinates)}),o.GeoJSON.getFeature(this,{type:e,coordinates:t})}})}t(o.MultiPolyline,"MultiLineString"),t(o.MultiPolygon,"MultiPolygon")}(),o.LayerGroup.include({toGeoJSON:function(){var t=[];return this.eachLayer(function(e){e.toGeoJSON&&t.push(o.GeoJSON.asFeature(e.toGeoJSON()))}),{type:"FeatureCollection",features:t}}}),o.geoJson=function(t,e){return new o.GeoJSON(t,e)},o.DomEvent={addListener:function(t,e,i,n){var s,a,r,h=o.stamp(i),l="_leaflet_"+e+h;return t[l]?this:(s=function(e){return i.call(n||t,e||o.DomEvent._getEvent())},o.Browser.msTouch&&0===e.indexOf("touch")?this.addMsTouchListener(t,e,s,h):(o.Browser.touch&&"dblclick"===e&&this.addDoubleTapListener&&this.addDoubleTapListener(t,s,h),"addEventListener"in t?"mousewheel"===e?(t.addEventListener("DOMMouseScroll",s,!1),t.addEventListener(e,s,!1)):"mouseenter"===e||"mouseleave"===e?(a=s,r="mouseenter"===e?"mouseover":"mouseout",s=function(e){return o.DomEvent._checkMouse(t,e)?a(e):void 0},t.addEventListener(r,s,!1)):"click"===e&&o.Browser.android?(a=s,s=function(t){return o.DomEvent._filterClick(t,a)},t.addEventListener(e,s,!1)):t.addEventListener(e,s,!1):"attachEvent"in t&&t.attachEvent("on"+e,s),t[l]=s,this))},removeListener:function(t,e,i){var n=o.stamp(i),s="_leaflet_"+e+n,a=t[s];return a?(o.Browser.msTouch&&0===e.indexOf("touch")?this.removeMsTouchListener(t,e,n):o.Browser.touch&&"dblclick"===e&&this.removeDoubleTapListener?this.removeDoubleTapListener(t,n):"removeEventListener"in t?"mousewheel"===e?(t.removeEventListener("DOMMouseScroll",a,!1),t.removeEventListener(e,a,!1)):"mouseenter"===e||"mouseleave"===e?t.removeEventListener("mouseenter"===e?"mouseover":"mouseout",a,!1):t.removeEventListener(e,a,!1):"detachEvent"in t&&t.detachEvent("on"+e,a),t[s]=null,this):this},stopPropagation:function(t){return t.stopPropagation?t.stopPropagation():t.cancelBubble=!0,this},disableClickPropagation:function(t){for(var e=o.DomEvent.stopPropagation,i=o.Draggable.START.length-1;i>=0;i--)o.DomEvent.addListener(t,o.Draggable.START[i],e);return o.DomEvent.addListener(t,"click",o.DomEvent._fakeStop).addListener(t,"dblclick",e)},preventDefault:function(t){return t.preventDefault?t.preventDefault():t.returnValue=!1,this},stop:function(t){return o.DomEvent.preventDefault(t).stopPropagation(t)},getMousePosition:function(t,i){var n=o.Browser.ie7,s=e.body,a=e.documentElement,r=t.pageX?t.pageX-s.scrollLeft-a.scrollLeft:t.clientX,h=t.pageY?t.pageY-s.scrollTop-a.scrollTop:t.clientY,l=new o.Point(r,h),u=i.getBoundingClientRect(),c=u.left-i.clientLeft,d=u.top-i.clientTop;return o.DomUtil.documentIsLtr()||!o.Browser.webkit&&!n||(c+=i.scrollWidth-i.clientWidth,n&&"hidden"!==o.DomUtil.getStyle(i,"overflow-y")&&"hidden"!==o.DomUtil.getStyle(i,"overflow")&&(c+=17)),l._subtract(new o.Point(c,d))},getWheelDelta:function(t){var e=0;return t.wheelDelta&&(e=t.wheelDelta/120),t.detail&&(e=-t.detail/3),e},_skipEvents:{},_fakeStop:function(t){o.DomEvent._skipEvents[t.type]=!0},_skipped:function(t){var e=this._skipEvents[t.type];return this._skipEvents[t.type]=!1,e},_checkMouse:function(t,e){var i=e.relatedTarget;if(!i)return!0;try{for(;i&&i!==t;)i=i.parentNode}catch(n){return!1}return i!==t},_getEvent:function(){var e=t.event;if(!e)for(var i=arguments.callee.caller;i&&(e=i.arguments[0],!e||t.Event!==e.constructor);)i=i.caller;return e},_filterClick:function(t,e){var i=t.timeStamp||t.originalEvent.timeStamp,n=o.DomEvent._lastClick&&i-o.DomEvent._lastClick;return n&&n>100&&1e3>n||t.target._simulatedClick&&!t._simulated?(o.DomEvent.stop(t),void 0):(o.DomEvent._lastClick=i,e(t))}},o.DomEvent.on=o.DomEvent.addListener,o.DomEvent.off=o.DomEvent.removeListener,o.Draggable=o.Class.extend({includes:o.Mixin.Events,statics:{START:o.Browser.touch?["touchstart","mousedown"]:["mousedown"],END:{mousedown:"mouseup",touchstart:"touchend",MSPointerDown:"touchend"},MOVE:{mousedown:"mousemove",touchstart:"touchmove",MSPointerDown:"touchmove"}},initialize:function(t,e){this._element=t,this._dragStartTarget=e||t},enable:function(){if(!this._enabled){for(var t=o.Draggable.START.length-1;t>=0;t--)o.DomEvent.on(this._dragStartTarget,o.Draggable.START[t],this._onDown,this);this._enabled=!0}},disable:function(){if(this._enabled){for(var t=o.Draggable.START.length-1;t>=0;t--)o.DomEvent.off(this._dragStartTarget,o.Draggable.START[t],this._onDown,this);this._enabled=!1,this._moved=!1}},_onDown:function(t){if(!t.shiftKey&&(1===t.which||1===t.button||t.touches)&&(o.DomEvent.stopPropagation(t),!o.Draggable._disabled)){o.DomUtil.disableImageDrag(),o.DomUtil.disableTextSelection();var i=t.touches?t.touches[0]:t,n=i.target;o.Browser.touch&&"a"===n.tagName.toLowerCase()&&o.DomUtil.addClass(n,"leaflet-active"),this._moved=!1,this._moving||(this._startPoint=new o.Point(i.clientX,i.clientY),this._startPos=this._newPos=o.DomUtil.getPosition(this._element),o.DomEvent.on(e,o.Draggable.MOVE[t.type],this._onMove,this).on(e,o.Draggable.END[t.type],this._onUp,this))}},_onMove:function(t){if(!(t.touches&&t.touches.length>1)){var i=t.touches&&1===t.touches.length?t.touches[0]:t,n=new o.Point(i.clientX,i.clientY),s=n.subtract(this._startPoint);(s.x||s.y)&&(o.DomEvent.preventDefault(t),this._moved||(this.fire("dragstart"),this._moved=!0,this._startPos=o.DomUtil.getPosition(this._element).subtract(s),o.Browser.touch||o.DomUtil.addClass(e.body,"leaflet-dragging")),this._newPos=this._startPos.add(s),this._moving=!0,o.Util.cancelAnimFrame(this._animRequest),this._animRequest=o.Util.requestAnimFrame(this._updatePosition,this,!0,this._dragStartTarget))}},_updatePosition:function(){this.fire("predrag"),o.DomUtil.setPosition(this._element,this._newPos),this.fire("drag")},_onUp:function(){o.Browser.touch||o.DomUtil.removeClass(e.body,"leaflet-dragging");for(var t in o.Draggable.MOVE)o.DomEvent.off(e,o.Draggable.MOVE[t],this._onMove).off(e,o.Draggable.END[t],this._onUp);o.DomUtil.enableImageDrag(),o.DomUtil.enableTextSelection(),this._moved&&(o.Util.cancelAnimFrame(this._animRequest),this.fire("dragend")),this._moving=!1}}),o.Handler=o.Class.extend({initialize:function(t){this._map=t},enable:function(){this._enabled||(this._enabled=!0,this.addHooks())},disable:function(){this._enabled&&(this._enabled=!1,this.removeHooks())},enabled:function(){return!!this._enabled}}),o.Map.mergeOptions({dragging:!0,inertia:!o.Browser.android23,inertiaDeceleration:3400,inertiaMaxSpeed:1/0,inertiaThreshold:o.Browser.touch?32:18,easeLinearity:.25,worldCopyJump:!1}),o.Map.Drag=o.Handler.extend({addHooks:function(){if(!this._draggable){var t=this._map;this._draggable=new o.Draggable(t._mapPane,t._container),this._draggable.on({dragstart:this._onDragStart,drag:this._onDrag,dragend:this._onDragEnd},this),t.options.worldCopyJump&&(this._draggable.on("predrag",this._onPreDrag,this),t.on("viewreset",this._onViewReset,this),this._onViewReset())}this._draggable.enable()},removeHooks:function(){this._draggable.disable()},moved:function(){return this._draggable&&this._draggable._moved},_onDragStart:function(){var t=this._map;t._panAnim&&t._panAnim.stop(),t.fire("movestart").fire("dragstart"),t.options.inertia&&(this._positions=[],this._times=[])},_onDrag:function(){if(this._map.options.inertia){var t=this._lastTime=+new Date,e=this._lastPos=this._draggable._newPos;this._positions.push(e),this._times.push(t),t-this._times[0]>200&&(this._positions.shift(),this._times.shift())}this._map.fire("move").fire("drag")},_onViewReset:function(){var t=this._map.getSize()._divideBy(2),e=this._map.latLngToLayerPoint([0,0]);this._initialWorldOffset=e.subtract(t).x,this._worldWidth=this._map.project([0,180]).x},_onPreDrag:function(){var t=this._worldWidth,e=Math.round(t/2),i=this._initialWorldOffset,n=this._draggable._newPos.x,o=(n-e+i)%t+e-i,s=(n+e+i)%t-e-i,a=Math.abs(o+i)<Math.abs(s+i)?o:s;this._draggable._newPos.x=a},_onDragEnd:function(){var t=this._map,e=t.options,i=+new Date-this._lastTime,n=!e.inertia||i>e.inertiaThreshold||!this._positions[0];if(t.fire("dragend"),n)t.fire("moveend");else{var s=this._lastPos.subtract(this._positions[0]),a=(this._lastTime+i-this._times[0])/1e3,r=e.easeLinearity,h=s.multiplyBy(r/a),l=h.distanceTo([0,0]),u=Math.min(e.inertiaMaxSpeed,l),c=h.multiplyBy(u/l),d=u/(e.inertiaDeceleration*r),p=c.multiplyBy(-d/2).round();p.x&&p.y?o.Util.requestAnimFrame(function(){t.panBy(p,{duration:d,easeLinearity:r,noMoveStart:!0})}):t.fire("moveend")}}}),o.Map.addInitHook("addHandler","dragging",o.Map.Drag),o.Map.mergeOptions({doubleClickZoom:!0}),o.Map.DoubleClickZoom=o.Handler.extend({addHooks:function(){this._map.on("dblclick",this._onDoubleClick)},removeHooks:function(){this._map.off("dblclick",this._onDoubleClick)},_onDoubleClick:function(t){this.setZoomAround(t.containerPoint,this._zoom+1)}}),o.Map.addInitHook("addHandler","doubleClickZoom",o.Map.DoubleClickZoom),o.Map.mergeOptions({scrollWheelZoom:!0}),o.Map.ScrollWheelZoom=o.Handler.extend({addHooks:function(){o.DomEvent.on(this._map._container,"mousewheel",this._onWheelScroll,this),o.DomEvent.on(this._map._container,"MozMousePixelScroll",o.DomEvent.preventDefault),this._delta=0},removeHooks:function(){o.DomEvent.off(this._map._container,"mousewheel",this._onWheelScroll),o.DomEvent.off(this._map._container,"MozMousePixelScroll",o.DomEvent.preventDefault)},_onWheelScroll:function(t){var e=o.DomEvent.getWheelDelta(t);this._delta+=e,this._lastMousePos=this._map.mouseEventToContainerPoint(t),this._startTime||(this._startTime=+new Date);var i=Math.max(40-(+new Date-this._startTime),0);clearTimeout(this._timer),this._timer=setTimeout(o.bind(this._performZoom,this),i),o.DomEvent.preventDefault(t),o.DomEvent.stopPropagation(t)},_performZoom:function(){var t=this._map,e=this._delta,i=t.getZoom();e=e>0?Math.ceil(e):Math.floor(e),e=Math.max(Math.min(e,4),-4),e=t._limitZoom(i+e)-i,this._delta=0,this._startTime=null,e&&t.setZoomAround(this._lastMousePos,i+e)}}),o.Map.addInitHook("addHandler","scrollWheelZoom",o.Map.ScrollWheelZoom),o.extend(o.DomEvent,{_touchstart:o.Browser.msTouch?"MSPointerDown":"touchstart",_touchend:o.Browser.msTouch?"MSPointerUp":"touchend",addDoubleTapListener:function(t,i,n){function s(t){var e;if(o.Browser.msTouch?(_.push(t.pointerId),e=_.length):e=t.touches.length,!(e>1)){var i=Date.now(),n=i-(r||i);h=t.touches?t.touches[0]:t,l=n>0&&u>=n,r=i}}function a(t){if(o.Browser.msTouch){var e=_.indexOf(t.pointerId);if(-1===e)return;_.splice(e,1)}if(l){if(o.Browser.msTouch){var n,s={};for(var a in h)n=h[a],s[a]="function"==typeof n?n.bind(h):n;h=s}h.type="dblclick",i(h),r=null}}var r,h,l=!1,u=250,c="_leaflet_",d=this._touchstart,p=this._touchend,_=[];t[c+d+n]=s,t[c+p+n]=a;var m=o.Browser.msTouch?e.documentElement:t;return t.addEventListener(d,s,!1),m.addEventListener(p,a,!1),o.Browser.msTouch&&m.addEventListener("MSPointerCancel",a,!1),this},removeDoubleTapListener:function(t,i){var n="_leaflet_";return t.removeEventListener(this._touchstart,t[n+this._touchstart+i],!1),(o.Browser.msTouch?e.documentElement:t).removeEventListener(this._touchend,t[n+this._touchend+i],!1),o.Browser.msTouch&&e.documentElement.removeEventListener("MSPointerCancel",t[n+this._touchend+i],!1),this}}),o.extend(o.DomEvent,{_msTouches:[],_msDocumentListener:!1,addMsTouchListener:function(t,e,i,n){switch(e){case"touchstart":return this.addMsTouchListenerStart(t,e,i,n);case"touchend":return this.addMsTouchListenerEnd(t,e,i,n);case"touchmove":return this.addMsTouchListenerMove(t,e,i,n);default:throw"Unknown touch event type"}},addMsTouchListenerStart:function(t,i,n,o){var s="_leaflet_",a=this._msTouches,r=function(t){for(var e=!1,i=0;i<a.length;i++)if(a[i].pointerId===t.pointerId){e=!0;break}e||a.push(t),t.touches=a.slice(),t.changedTouches=[t],n(t)};if(t[s+"touchstart"+o]=r,t.addEventListener("MSPointerDown",r,!1),!this._msDocumentListener){var h=function(t){for(var e=0;e<a.length;e++)if(a[e].pointerId===t.pointerId){a.splice(e,1);break}};e.documentElement.addEventListener("MSPointerUp",h,!1),e.documentElement.addEventListener("MSPointerCancel",h,!1),this._msDocumentListener=!0}return this},addMsTouchListenerMove:function(t,e,i,n){function o(t){if(t.pointerType!==t.MSPOINTER_TYPE_MOUSE||0!==t.buttons){for(var e=0;e<a.length;e++)if(a[e].pointerId===t.pointerId){a[e]=t;break}t.touches=a.slice(),t.changedTouches=[t],i(t)}}var s="_leaflet_",a=this._msTouches;return t[s+"touchmove"+n]=o,t.addEventListener("MSPointerMove",o,!1),this},addMsTouchListenerEnd:function(t,e,i,n){var o="_leaflet_",s=this._msTouches,a=function(t){for(var e=0;e<s.length;e++)if(s[e].pointerId===t.pointerId){s.splice(e,1);break}t.touches=s.slice(),t.changedTouches=[t],i(t)};return t[o+"touchend"+n]=a,t.addEventListener("MSPointerUp",a,!1),t.addEventListener("MSPointerCancel",a,!1),this},removeMsTouchListener:function(t,e,i){var n="_leaflet_",o=t[n+e+i];switch(e){case"touchstart":t.removeEventListener("MSPointerDown",o,!1);break;case"touchmove":t.removeEventListener("MSPointerMove",o,!1);break;case"touchend":t.removeEventListener("MSPointerUp",o,!1),t.removeEventListener("MSPointerCancel",o,!1)}return this}}),o.Map.mergeOptions({touchZoom:o.Browser.touch&&!o.Browser.android23}),o.Map.TouchZoom=o.Handler.extend({addHooks:function(){o.DomEvent.on(this._map._container,"touchstart",this._onTouchStart,this)},removeHooks:function(){o.DomEvent.off(this._map._container,"touchstart",this._onTouchStart,this)},_onTouchStart:function(t){var i=this._map;if(t.touches&&2===t.touches.length&&!i._animatingZoom&&!this._zooming){var n=i.mouseEventToLayerPoint(t.touches[0]),s=i.mouseEventToLayerPoint(t.touches[1]),a=i._getCenterLayerPoint();this._startCenter=n.add(s)._divideBy(2),this._startDist=n.distanceTo(s),this._moved=!1,this._zooming=!0,this._centerOffset=a.subtract(this._startCenter),i._panAnim&&i._panAnim.stop(),o.DomEvent.on(e,"touchmove",this._onTouchMove,this).on(e,"touchend",this._onTouchEnd,this),o.DomEvent.preventDefault(t)}},_onTouchMove:function(t){var e=this._map;if(t.touches&&2===t.touches.length&&this._zooming){var i=e.mouseEventToLayerPoint(t.touches[0]),n=e.mouseEventToLayerPoint(t.touches[1]);this._scale=i.distanceTo(n)/this._startDist,this._delta=i._add(n)._divideBy(2)._subtract(this._startCenter),1!==this._scale&&(this._moved||(o.DomUtil.addClass(e._mapPane,"leaflet-touching"),e.fire("movestart").fire("zoomstart"),this._moved=!0),o.Util.cancelAnimFrame(this._animRequest),this._animRequest=o.Util.requestAnimFrame(this._updateOnMove,this,!0,this._map._container),o.DomEvent.preventDefault(t))}},_updateOnMove:function(){var t=this._map,e=this._getScaleOrigin(),i=t.layerPointToLatLng(e),n=t.getScaleZoom(this._scale);t._animateZoom(i,n,this._startCenter,this._scale,this._delta)},_onTouchEnd:function(){if(!this._moved||!this._zooming)return this._zooming=!1,void 0;var t=this._map;this._zooming=!1,o.DomUtil.removeClass(t._mapPane,"leaflet-touching"),o.Util.cancelAnimFrame(this._animRequest),o.DomEvent.off(e,"touchmove",this._onTouchMove).off(e,"touchend",this._onTouchEnd);var i=this._getScaleOrigin(),n=t.layerPointToLatLng(i),s=t.getZoom(),a=t.getScaleZoom(this._scale)-s,r=a>0?Math.ceil(a):Math.floor(a),h=t._limitZoom(s+r),l=t.getZoomScale(h)/this._scale;t._animateZoom(n,h,i,l)},_getScaleOrigin:function(){var t=this._centerOffset.subtract(this._delta).divideBy(this._scale);return this._startCenter.add(t)}}),o.Map.addInitHook("addHandler","touchZoom",o.Map.TouchZoom),o.Map.mergeOptions({tap:!0,tapTolerance:15}),o.Map.Tap=o.Handler.extend({addHooks:function(){o.DomEvent.on(this._map._container,"touchstart",this._onDown,this)
},removeHooks:function(){o.DomEvent.off(this._map._container,"touchstart",this._onDown,this)},_onDown:function(t){if(t.touches){if(o.DomEvent.preventDefault(t),this._fireClick=!0,t.touches.length>1)return this._fireClick=!1,clearTimeout(this._holdTimeout),void 0;var i=t.touches[0],n=i.target;this._startPos=this._newPos=new o.Point(i.clientX,i.clientY),"a"===n.tagName.toLowerCase()&&o.DomUtil.addClass(n,"leaflet-active"),this._holdTimeout=setTimeout(o.bind(function(){this._isTapValid()&&(this._fireClick=!1,this._onUp(),this._simulateEvent("contextmenu",i))},this),1e3),o.DomEvent.on(e,"touchmove",this._onMove,this).on(e,"touchend",this._onUp,this)}},_onUp:function(t){if(clearTimeout(this._holdTimeout),o.DomEvent.off(e,"touchmove",this._onMove,this).off(e,"touchend",this._onUp,this),this._fireClick&&t&&t.changedTouches){var i=t.changedTouches[0],n=i.target;"a"===n.tagName.toLowerCase()&&o.DomUtil.removeClass(n,"leaflet-active"),this._isTapValid()&&this._simulateEvent("click",i)}},_isTapValid:function(){return this._newPos.distanceTo(this._startPos)<=this._map.options.tapTolerance},_onMove:function(t){var e=t.touches[0];this._newPos=new o.Point(e.clientX,e.clientY)},_simulateEvent:function(i,n){var o=e.createEvent("MouseEvents");o._simulated=!0,n.target._simulatedClick=!0,o.initMouseEvent(i,!0,!0,t,1,n.screenX,n.screenY,n.clientX,n.clientY,!1,!1,!1,!1,0,null),n.target.dispatchEvent(o)}}),o.Browser.touch&&!o.Browser.msTouch&&o.Map.addInitHook("addHandler","tap",o.Map.Tap),o.Map.mergeOptions({boxZoom:!0}),o.Map.BoxZoom=o.Handler.extend({initialize:function(t){this._map=t,this._container=t._container,this._pane=t._panes.overlayPane},addHooks:function(){o.DomEvent.on(this._container,"mousedown",this._onMouseDown,this)},removeHooks:function(){o.DomEvent.off(this._container,"mousedown",this._onMouseDown)},_onMouseDown:function(t){return!t.shiftKey||1!==t.which&&1!==t.button?!1:(o.DomUtil.disableTextSelection(),o.DomUtil.disableImageDrag(),this._startLayerPoint=this._map.mouseEventToLayerPoint(t),this._box=o.DomUtil.create("div","leaflet-zoom-box",this._pane),o.DomUtil.setPosition(this._box,this._startLayerPoint),this._container.style.cursor="crosshair",o.DomEvent.on(e,"mousemove",this._onMouseMove,this).on(e,"mouseup",this._onMouseUp,this).on(e,"keydown",this._onKeyDown,this),this._map.fire("boxzoomstart"),void 0)},_onMouseMove:function(t){var e=this._startLayerPoint,i=this._box,n=this._map.mouseEventToLayerPoint(t),s=n.subtract(e),a=new o.Point(Math.min(n.x,e.x),Math.min(n.y,e.y));o.DomUtil.setPosition(i,a),i.style.width=Math.max(0,Math.abs(s.x)-4)+"px",i.style.height=Math.max(0,Math.abs(s.y)-4)+"px"},_finish:function(){this._pane.removeChild(this._box),this._container.style.cursor="",o.DomUtil.enableTextSelection(),o.DomUtil.enableImageDrag(),o.DomEvent.off(e,"mousemove",this._onMouseMove).off(e,"mouseup",this._onMouseUp).off(e,"keydown",this._onKeyDown)},_onMouseUp:function(t){this._finish();var e=this._map,i=e.mouseEventToLayerPoint(t);if(!this._startLayerPoint.equals(i)){var n=new o.LatLngBounds(e.layerPointToLatLng(this._startLayerPoint),e.layerPointToLatLng(i));e.fitBounds(n),e.fire("boxzoomend",{boxZoomBounds:n})}},_onKeyDown:function(t){27===t.keyCode&&this._finish()}}),o.Map.addInitHook("addHandler","boxZoom",o.Map.BoxZoom),o.Map.mergeOptions({keyboard:!0,keyboardPanOffset:80,keyboardZoomOffset:1}),o.Map.Keyboard=o.Handler.extend({keyCodes:{left:[37],right:[39],down:[40],up:[38],zoomIn:[187,107,61],zoomOut:[189,109,173]},initialize:function(t){this._map=t,this._setPanOffset(t.options.keyboardPanOffset),this._setZoomOffset(t.options.keyboardZoomOffset)},addHooks:function(){var t=this._map._container;-1===t.tabIndex&&(t.tabIndex="0"),o.DomEvent.on(t,"focus",this._onFocus,this).on(t,"blur",this._onBlur,this).on(t,"mousedown",this._onMouseDown,this),this._map.on("focus",this._addHooks,this).on("blur",this._removeHooks,this)},removeHooks:function(){this._removeHooks();var t=this._map._container;o.DomEvent.off(t,"focus",this._onFocus,this).off(t,"blur",this._onBlur,this).off(t,"mousedown",this._onMouseDown,this),this._map.off("focus",this._addHooks,this).off("blur",this._removeHooks,this)},_onMouseDown:function(){if(!this._focused){var i=e.body,n=e.documentElement,o=i.scrollTop||n.scrollTop,s=i.scrollLeft||n.scrollLeft;this._map._container.focus(),t.scrollTo(s,o)}},_onFocus:function(){this._focused=!0,this._map.fire("focus")},_onBlur:function(){this._focused=!1,this._map.fire("blur")},_setPanOffset:function(t){var e,i,n=this._panKeys={},o=this.keyCodes;for(e=0,i=o.left.length;i>e;e++)n[o.left[e]]=[-1*t,0];for(e=0,i=o.right.length;i>e;e++)n[o.right[e]]=[t,0];for(e=0,i=o.down.length;i>e;e++)n[o.down[e]]=[0,t];for(e=0,i=o.up.length;i>e;e++)n[o.up[e]]=[0,-1*t]},_setZoomOffset:function(t){var e,i,n=this._zoomKeys={},o=this.keyCodes;for(e=0,i=o.zoomIn.length;i>e;e++)n[o.zoomIn[e]]=t;for(e=0,i=o.zoomOut.length;i>e;e++)n[o.zoomOut[e]]=-t},_addHooks:function(){o.DomEvent.on(e,"keydown",this._onKeyDown,this)},_removeHooks:function(){o.DomEvent.off(e,"keydown",this._onKeyDown,this)},_onKeyDown:function(t){var e=t.keyCode,i=this._map;if(e in this._panKeys){if(i._panAnim&&i._panAnim._inProgress)return;i.panBy(this._panKeys[e]),i.options.maxBounds&&i.panInsideBounds(i.options.maxBounds)}else{if(!(e in this._zoomKeys))return;i.setZoom(i.getZoom()+this._zoomKeys[e])}o.DomEvent.stop(t)}}),o.Map.addInitHook("addHandler","keyboard",o.Map.Keyboard),o.Handler.MarkerDrag=o.Handler.extend({initialize:function(t){this._marker=t},addHooks:function(){var t=this._marker._icon;this._draggable||(this._draggable=new o.Draggable(t,t)),this._draggable.on("dragstart",this._onDragStart,this).on("drag",this._onDrag,this).on("dragend",this._onDragEnd,this),this._draggable.enable()},removeHooks:function(){this._draggable.off("dragstart",this._onDragStart,this).off("drag",this._onDrag,this).off("dragend",this._onDragEnd,this),this._draggable.disable()},moved:function(){return this._draggable&&this._draggable._moved},_onDragStart:function(){this._marker.closePopup().fire("movestart").fire("dragstart")},_onDrag:function(){var t=this._marker,e=t._shadow,i=o.DomUtil.getPosition(t._icon),n=t._map.layerPointToLatLng(i);e&&o.DomUtil.setPosition(e,i),t._latlng=n,t.fire("move",{latlng:n}).fire("drag")},_onDragEnd:function(){this._marker.fire("moveend").fire("dragend")}}),o.Control=o.Class.extend({options:{position:"topright"},initialize:function(t){o.setOptions(this,t)},getPosition:function(){return this.options.position},setPosition:function(t){var e=this._map;return e&&e.removeControl(this),this.options.position=t,e&&e.addControl(this),this},getContainer:function(){return this._container},addTo:function(t){this._map=t;var e=this._container=this.onAdd(t),i=this.getPosition(),n=t._controlCorners[i];return o.DomUtil.addClass(e,"leaflet-control"),-1!==i.indexOf("bottom")?n.insertBefore(e,n.firstChild):n.appendChild(e),this},removeFrom:function(t){var e=this.getPosition(),i=t._controlCorners[e];return i.removeChild(this._container),this._map=null,this.onRemove&&this.onRemove(t),this}}),o.control=function(t){return new o.Control(t)},o.Map.include({addControl:function(t){return t.addTo(this),this},removeControl:function(t){return t.removeFrom(this),this},_initControlPos:function(){function t(t,s){var a=i+t+" "+i+s;e[t+s]=o.DomUtil.create("div",a,n)}var e=this._controlCorners={},i="leaflet-",n=this._controlContainer=o.DomUtil.create("div",i+"control-container",this._container);t("top","left"),t("top","right"),t("bottom","left"),t("bottom","right")},_clearControlPos:function(){this._container.removeChild(this._controlContainer)}}),o.Control.Zoom=o.Control.extend({options:{position:"topleft"},onAdd:function(t){var e="leaflet-control-zoom",i=o.DomUtil.create("div",e+" leaflet-bar");return this._map=t,this._zoomInButton=this._createButton("+","Zoom in",e+"-in",i,this._zoomIn,this),this._zoomOutButton=this._createButton("-","Zoom out",e+"-out",i,this._zoomOut,this),t.on("zoomend zoomlevelschange",this._updateDisabled,this),i},onRemove:function(t){t.off("zoomend zoomlevelschange",this._updateDisabled,this)},_zoomIn:function(t){this._map.zoomIn(t.shiftKey?3:1)},_zoomOut:function(t){this._map.zoomOut(t.shiftKey?3:1)},_createButton:function(t,e,i,n,s,a){var r=o.DomUtil.create("a",i,n);r.innerHTML=t,r.href="#",r.title=e;var h=o.DomEvent.stopPropagation;return o.DomEvent.on(r,"click",h).on(r,"mousedown",h).on(r,"dblclick",h).on(r,"click",o.DomEvent.preventDefault).on(r,"click",s,a),r},_updateDisabled:function(){var t=this._map,e="leaflet-disabled";o.DomUtil.removeClass(this._zoomInButton,e),o.DomUtil.removeClass(this._zoomOutButton,e),t._zoom===t.getMinZoom()&&o.DomUtil.addClass(this._zoomOutButton,e),t._zoom===t.getMaxZoom()&&o.DomUtil.addClass(this._zoomInButton,e)}}),o.Map.mergeOptions({zoomControl:!0}),o.Map.addInitHook(function(){this.options.zoomControl&&(this.zoomControl=new o.Control.Zoom,this.addControl(this.zoomControl))}),o.control.zoom=function(t){return new o.Control.Zoom(t)},o.Control.Attribution=o.Control.extend({options:{position:"bottomright",prefix:'<a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>'},initialize:function(t){o.setOptions(this,t),this._attributions={}},onAdd:function(t){return this._container=o.DomUtil.create("div","leaflet-control-attribution"),o.DomEvent.disableClickPropagation(this._container),t.on("layeradd",this._onLayerAdd,this).on("layerremove",this._onLayerRemove,this),this._update(),this._container},onRemove:function(t){t.off("layeradd",this._onLayerAdd).off("layerremove",this._onLayerRemove)},setPrefix:function(t){return this.options.prefix=t,this._update(),this},addAttribution:function(t){return t?(this._attributions[t]||(this._attributions[t]=0),this._attributions[t]++,this._update(),this):void 0},removeAttribution:function(t){return t?(this._attributions[t]&&(this._attributions[t]--,this._update()),this):void 0},_update:function(){if(this._map){var t=[];for(var e in this._attributions)this._attributions[e]&&t.push(e);var i=[];this.options.prefix&&i.push(this.options.prefix),t.length&&i.push(t.join(", ")),this._container.innerHTML=i.join(" | ")}},_onLayerAdd:function(t){t.layer.getAttribution&&this.addAttribution(t.layer.getAttribution())},_onLayerRemove:function(t){t.layer.getAttribution&&this.removeAttribution(t.layer.getAttribution())}}),o.Map.mergeOptions({attributionControl:!0}),o.Map.addInitHook(function(){this.options.attributionControl&&(this.attributionControl=(new o.Control.Attribution).addTo(this))}),o.control.attribution=function(t){return new o.Control.Attribution(t)},o.Control.Scale=o.Control.extend({options:{position:"bottomleft",maxWidth:100,metric:!0,imperial:!0,updateWhenIdle:!1},onAdd:function(t){this._map=t;var e="leaflet-control-scale",i=o.DomUtil.create("div",e),n=this.options;return this._addScales(n,e,i),t.on(n.updateWhenIdle?"moveend":"move",this._update,this),t.whenReady(this._update,this),i},onRemove:function(t){t.off(this.options.updateWhenIdle?"moveend":"move",this._update,this)},_addScales:function(t,e,i){t.metric&&(this._mScale=o.DomUtil.create("div",e+"-line",i)),t.imperial&&(this._iScale=o.DomUtil.create("div",e+"-line",i))},_update:function(){var t=this._map.getBounds(),e=t.getCenter().lat,i=6378137*Math.PI*Math.cos(e*Math.PI/180),n=i*(t.getNorthEast().lng-t.getSouthWest().lng)/180,o=this._map.getSize(),s=this.options,a=0;o.x>0&&(a=n*(s.maxWidth/o.x)),this._updateScales(s,a)},_updateScales:function(t,e){t.metric&&e&&this._updateMetric(e),t.imperial&&e&&this._updateImperial(e)},_updateMetric:function(t){var e=this._getRoundNum(t);this._mScale.style.width=this._getScaleWidth(e/t)+"px",this._mScale.innerHTML=1e3>e?e+" m":e/1e3+" km"},_updateImperial:function(t){var e,i,n,o=3.2808399*t,s=this._iScale;o>5280?(e=o/5280,i=this._getRoundNum(e),s.style.width=this._getScaleWidth(i/e)+"px",s.innerHTML=i+" mi"):(n=this._getRoundNum(o),s.style.width=this._getScaleWidth(n/o)+"px",s.innerHTML=n+" ft")},_getScaleWidth:function(t){return Math.round(this.options.maxWidth*t)-10},_getRoundNum:function(t){var e=Math.pow(10,(Math.floor(t)+"").length-1),i=t/e;return i=i>=10?10:i>=5?5:i>=3?3:i>=2?2:1,e*i}}),o.control.scale=function(t){return new o.Control.Scale(t)},o.Control.Layers=o.Control.extend({options:{collapsed:!0,position:"topright",autoZIndex:!0},initialize:function(t,e,i){o.setOptions(this,i),this._layers={},this._lastZIndex=0,this._handlingClick=!1;for(var n in t)this._addLayer(t[n],n);for(n in e)this._addLayer(e[n],n,!0)},onAdd:function(t){return this._initLayout(),this._update(),t.on("layeradd",this._onLayerChange,this).on("layerremove",this._onLayerChange,this),this._container},onRemove:function(t){t.off("layeradd",this._onLayerChange).off("layerremove",this._onLayerChange)},addBaseLayer:function(t,e){return this._addLayer(t,e),this._update(),this},addOverlay:function(t,e){return this._addLayer(t,e,!0),this._update(),this},removeLayer:function(t){var e=o.stamp(t);return delete this._layers[e],this._update(),this},_initLayout:function(){var t="leaflet-control-layers",e=this._container=o.DomUtil.create("div",t);e.setAttribute("aria-haspopup",!0),o.Browser.touch?o.DomEvent.on(e,"click",o.DomEvent.stopPropagation):(o.DomEvent.disableClickPropagation(e),o.DomEvent.on(e,"mousewheel",o.DomEvent.stopPropagation));var i=this._form=o.DomUtil.create("form",t+"-list");if(this.options.collapsed){o.Browser.android||o.DomEvent.on(e,"mouseover",this._expand,this).on(e,"mouseout",this._collapse,this);var n=this._layersLink=o.DomUtil.create("a",t+"-toggle",e);n.href="#",n.title="Layers",o.Browser.touch?o.DomEvent.on(n,"click",o.DomEvent.stop).on(n,"click",this._expand,this):o.DomEvent.on(n,"focus",this._expand,this),this._map.on("click",this._collapse,this)}else this._expand();this._baseLayersList=o.DomUtil.create("div",t+"-base",i),this._separator=o.DomUtil.create("div",t+"-separator",i),this._overlaysList=o.DomUtil.create("div",t+"-overlays",i),e.appendChild(i)},_addLayer:function(t,e,i){var n=o.stamp(t);this._layers[n]={layer:t,name:e,overlay:i},this.options.autoZIndex&&t.setZIndex&&(this._lastZIndex++,t.setZIndex(this._lastZIndex))},_update:function(){if(this._container){this._baseLayersList.innerHTML="",this._overlaysList.innerHTML="";var t,e,i=!1,n=!1;for(t in this._layers)e=this._layers[t],this._addItem(e),n=n||e.overlay,i=i||!e.overlay;this._separator.style.display=n&&i?"":"none"}},_onLayerChange:function(t){var e=this._layers[o.stamp(t.layer)];if(e){this._handlingClick||this._update();var i=e.overlay?"layeradd"===t.type?"overlayadd":"overlayremove":"layeradd"===t.type?"baselayerchange":null;i&&this._map.fire(i,e)}},_createRadioElement:function(t,i){var n='<input type="radio" class="leaflet-control-layers-selector" name="'+t+'"';i&&(n+=' checked="checked"'),n+="/>";var o=e.createElement("div");return o.innerHTML=n,o.firstChild},_addItem:function(t){var i,n=e.createElement("label"),s=this._map.hasLayer(t.layer);t.overlay?(i=e.createElement("input"),i.type="checkbox",i.className="leaflet-control-layers-selector",i.defaultChecked=s):i=this._createRadioElement("leaflet-base-layers",s),i.layerId=o.stamp(t.layer),o.DomEvent.on(i,"click",this._onInputClick,this);var a=e.createElement("span");a.innerHTML=" "+t.name,n.appendChild(i),n.appendChild(a);var r=t.overlay?this._overlaysList:this._baseLayersList;return r.appendChild(n),n},_onInputClick:function(){var t,e,i,n=this._form.getElementsByTagName("input"),o=n.length;for(this._handlingClick=!0,t=0;o>t;t++)e=n[t],i=this._layers[e.layerId],e.checked&&!this._map.hasLayer(i.layer)?this._map.addLayer(i.layer):!e.checked&&this._map.hasLayer(i.layer)&&this._map.removeLayer(i.layer);this._handlingClick=!1},_expand:function(){o.DomUtil.addClass(this._container,"leaflet-control-layers-expanded")},_collapse:function(){this._container.className=this._container.className.replace(" leaflet-control-layers-expanded","")}}),o.control.layers=function(t,e,i){return new o.Control.Layers(t,e,i)},o.PosAnimation=o.Class.extend({includes:o.Mixin.Events,run:function(t,e,i,n){this.stop(),this._el=t,this._inProgress=!0,this._newPos=e,this.fire("start"),t.style[o.DomUtil.TRANSITION]="all "+(i||.25)+"s cubic-bezier(0,0,"+(n||.5)+",1)",o.DomEvent.on(t,o.DomUtil.TRANSITION_END,this._onTransitionEnd,this),o.DomUtil.setPosition(t,e),o.Util.falseFn(t.offsetWidth),this._stepTimer=setInterval(o.bind(this._onStep,this),50)},stop:function(){this._inProgress&&(o.DomUtil.setPosition(this._el,this._getPos()),this._onTransitionEnd(),o.Util.falseFn(this._el.offsetWidth))},_onStep:function(){var t=this._getPos();return t?(this._el._leaflet_pos=t,this.fire("step"),void 0):(this._onTransitionEnd(),void 0)},_transformRe:/([-+]?(?:\d*\.)?\d+)\D*, ([-+]?(?:\d*\.)?\d+)\D*\)/,_getPos:function(){var e,i,n,s=this._el,a=t.getComputedStyle(s);if(o.Browser.any3d){if(n=a[o.DomUtil.TRANSFORM].match(this._transformRe),!n)return;e=parseFloat(n[1]),i=parseFloat(n[2])}else e=parseFloat(a.left),i=parseFloat(a.top);return new o.Point(e,i,!0)},_onTransitionEnd:function(){o.DomEvent.off(this._el,o.DomUtil.TRANSITION_END,this._onTransitionEnd,this),this._inProgress&&(this._inProgress=!1,this._el.style[o.DomUtil.TRANSITION]="",this._el._leaflet_pos=this._newPos,clearInterval(this._stepTimer),this.fire("step").fire("end"))}}),o.Map.include({setView:function(t,e,n){if(e=this._limitZoom(e),t=o.latLng(t),n=n||{},this._panAnim&&this._panAnim.stop(),this._loaded&&!n.reset&&n!==!0){n.animate!==i&&(n.zoom=o.extend({animate:n.animate},n.zoom),n.pan=o.extend({animate:n.animate},n.pan));var s=this._zoom!==e?this._tryAnimatedZoom&&this._tryAnimatedZoom(t,e,n.zoom):this._tryAnimatedPan(t,n.pan);if(s)return clearTimeout(this._sizeTimer),this}return this._resetView(t,e),this},panBy:function(t,e){if(t=o.point(t).round(),e=e||{},!t.x&&!t.y)return this;if(this._panAnim||(this._panAnim=new o.PosAnimation,this._panAnim.on({step:this._onPanTransitionStep,end:this._onPanTransitionEnd},this)),e.noMoveStart||this.fire("movestart"),e.animate!==!1){o.DomUtil.addClass(this._mapPane,"leaflet-pan-anim");var i=this._getMapPanePos().subtract(t);this._panAnim.run(this._mapPane,i,e.duration||.25,e.easeLinearity)}else this._rawPanBy(t),this.fire("move").fire("moveend");return this},_onPanTransitionStep:function(){this.fire("move")},_onPanTransitionEnd:function(){o.DomUtil.removeClass(this._mapPane,"leaflet-pan-anim"),this.fire("moveend")},_tryAnimatedPan:function(t,e){var i=this._getCenterOffset(t)._floor();return(e&&e.animate)===!0||this.getSize().contains(i)?(this.panBy(i,e),!0):!1}}),o.PosAnimation=o.DomUtil.TRANSITION?o.PosAnimation:o.PosAnimation.extend({run:function(t,e,i,n){this.stop(),this._el=t,this._inProgress=!0,this._duration=i||.25,this._easeOutPower=1/Math.max(n||.5,.2),this._startPos=o.DomUtil.getPosition(t),this._offset=e.subtract(this._startPos),this._startTime=+new Date,this.fire("start"),this._animate()},stop:function(){this._inProgress&&(this._step(),this._complete())},_animate:function(){this._animId=o.Util.requestAnimFrame(this._animate,this),this._step()},_step:function(){var t=+new Date-this._startTime,e=1e3*this._duration;e>t?this._runFrame(this._easeOut(t/e)):(this._runFrame(1),this._complete())},_runFrame:function(t){var e=this._startPos.add(this._offset.multiplyBy(t));o.DomUtil.setPosition(this._el,e),this.fire("step")},_complete:function(){o.Util.cancelAnimFrame(this._animId),this._inProgress=!1,this.fire("end")},_easeOut:function(t){return 1-Math.pow(1-t,this._easeOutPower)}}),o.Map.mergeOptions({zoomAnimation:!0,zoomAnimationThreshold:4}),o.DomUtil.TRANSITION&&o.Map.addInitHook(function(){this._zoomAnimated=this.options.zoomAnimation&&o.DomUtil.TRANSITION&&o.Browser.any3d&&!o.Browser.android23&&!o.Browser.mobileOpera,this._zoomAnimated&&o.DomEvent.on(this._mapPane,o.DomUtil.TRANSITION_END,this._catchTransitionEnd,this)}),o.Map.include(o.DomUtil.TRANSITION?{_catchTransitionEnd:function(){this._animatingZoom&&this._onZoomTransitionEnd()},_nothingToAnimate:function(){return!this._container.getElementsByClassName("leaflet-zoom-animated").length},_tryAnimatedZoom:function(t,e,i){if(this._animatingZoom)return!0;if(i=i||{},!this._zoomAnimated||i.animate===!1||this._nothingToAnimate()||Math.abs(e-this._zoom)>this.options.zoomAnimationThreshold)return!1;var n=this.getZoomScale(e),o=this._getCenterOffset(t)._divideBy(1-1/n),s=this._getCenterLayerPoint()._add(o);return i.animate===!0||this.getSize().contains(o)?(this.fire("movestart").fire("zoomstart"),this._animateZoom(t,e,s,n,null,!0),!0):!1},_animateZoom:function(t,e,i,n,s,a){this._animatingZoom=!0,o.DomUtil.addClass(this._mapPane,"leaflet-zoom-anim"),this._animateToCenter=t,this._animateToZoom=e,o.Draggable&&(o.Draggable._disabled=!0),this.fire("zoomanim",{center:t,zoom:e,origin:i,scale:n,delta:s,backwards:a})},_onZoomTransitionEnd:function(){this._animatingZoom=!1,o.DomUtil.removeClass(this._mapPane,"leaflet-zoom-anim"),this._resetView(this._animateToCenter,this._animateToZoom,!0,!0),o.Draggable&&(o.Draggable._disabled=!1)}}:{}),o.TileLayer.include({_animateZoom:function(t){this._animating||(this._animating=!0,this._prepareBgBuffer());var e=this._bgBuffer,i=o.DomUtil.TRANSFORM,n=t.delta?o.DomUtil.getTranslateString(t.delta):e.style[i],s=o.DomUtil.getScaleString(t.scale,t.origin);e.style[i]=t.backwards?s+" "+n:n+" "+s},_endZoomAnim:function(){var t=this._tileContainer,e=this._bgBuffer;t.style.visibility="",t.parentNode.appendChild(t),o.Util.falseFn(e.offsetWidth),this._animating=!1},_clearBgBuffer:function(){var t=this._map;!t||t._animatingZoom||t.touchZoom._zooming||(this._bgBuffer.innerHTML="",this._bgBuffer.style[o.DomUtil.TRANSFORM]="")},_prepareBgBuffer:function(){var t=this._tileContainer,e=this._bgBuffer,i=this._getLoadedTilesPercentage(e),n=this._getLoadedTilesPercentage(t);return e&&i>.5&&.5>n?(t.style.visibility="hidden",this._stopLoadingImages(t),void 0):(e.style.visibility="hidden",e.style[o.DomUtil.TRANSFORM]="",this._tileContainer=e,e=this._bgBuffer=t,this._stopLoadingImages(e),clearTimeout(this._clearBgBufferTimer),void 0)},_getLoadedTilesPercentage:function(t){var e,i,n=t.getElementsByTagName("img"),o=0;for(e=0,i=n.length;i>e;e++)n[e].complete&&o++;return o/i},_stopLoadingImages:function(t){var e,i,n,s=Array.prototype.slice.call(t.getElementsByTagName("img"));for(e=0,i=s.length;i>e;e++)n=s[e],n.complete||(n.onload=o.Util.falseFn,n.onerror=o.Util.falseFn,n.src=o.Util.emptyImageUrl,n.parentNode.removeChild(n))}}),o.Map.include({_defaultLocateOptions:{watch:!1,setView:!1,maxZoom:1/0,timeout:1e4,maximumAge:0,enableHighAccuracy:!1},locate:function(t){if(t=this._locateOptions=o.extend(this._defaultLocateOptions,t),!navigator.geolocation)return this._handleGeolocationError({code:0,message:"Geolocation not supported."}),this;var e=o.bind(this._handleGeolocationResponse,this),i=o.bind(this._handleGeolocationError,this);return t.watch?this._locationWatchId=navigator.geolocation.watchPosition(e,i,t):navigator.geolocation.getCurrentPosition(e,i,t),this},stopLocate:function(){return navigator.geolocation&&navigator.geolocation.clearWatch(this._locationWatchId),this._locateOptions&&(this._locateOptions.setView=!1),this},_handleGeolocationError:function(t){var e=t.code,i=t.message||(1===e?"permission denied":2===e?"position unavailable":"timeout");this._locateOptions.setView&&!this._loaded&&this.fitWorld(),this.fire("locationerror",{code:e,message:"Geolocation error: "+i+"."})},_handleGeolocationResponse:function(t){var e=t.coords.latitude,i=t.coords.longitude,n=new o.LatLng(e,i),s=180*t.coords.accuracy/40075017,a=s/Math.cos(o.LatLng.DEG_TO_RAD*e),r=o.latLngBounds([e-s,i-a],[e+s,i+a]),h=this._locateOptions;if(h.setView){var l=Math.min(this.getBoundsZoom(r),h.maxZoom);this.setView(n,l)}var u={latlng:n,bounds:r};for(var c in t.coords)"number"==typeof t.coords[c]&&(u[c]=t.coords[c]);this.fire("locationfound",u)}})}(window,document);
},{}],8:[function(require,module,exports){
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false*/

(function (root, factory) {
  if (typeof exports === "object" && exports) {
    module.exports = factory; // CommonJS
  } else if (typeof define === "function" && define.amd) {
    define(factory); // AMD
  } else {
    root.Mustache = factory; // <script>
  }
}(this, (function () {

  var exports = {};

  exports.name = "mustache.js";
  exports.version = "0.7.2";
  exports.tags = ["{{", "}}"];

  exports.Scanner = Scanner;
  exports.Context = Context;
  exports.Writer = Writer;

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var nonSpaceRe = /\S/;
  var eqRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  function testRe(re, string) {
    return RegExp.prototype.test.call(re, string);
  }

  function isWhitespace(string) {
    return !testRe(nonSpaceRe, string);
  }

  var isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };

  function escapeRe(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  exports.escape = escapeHtml;

  function Scanner(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function () {
    return this.tail === "";
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function (re) {
    var match = this.tail.match(re);

    if (match && match.index === 0) {
      this.tail = this.tail.substring(match[0].length);
      this.pos += match[0].length;
      return match[0];
    }

    return "";
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function (re) {
    var match, pos = this.tail.search(re);

    switch (pos) {
    case -1:
      match = this.tail;
      this.pos += this.tail.length;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, pos);
      this.tail = this.tail.substring(pos);
      this.pos += pos;
    }

    return match;
  };

  function Context(view, parent) {
    this.view = view;
    this.parent = parent;
    this.clearCache();
  }

  Context.make = function (view) {
    return (view instanceof Context) ? view : new Context(view);
  };

  Context.prototype.clearCache = function () {
    this._cache = {};
  };

  Context.prototype.push = function (view) {
    return new Context(view, this);
  };

  Context.prototype.lookup = function (name) {
    var value = this._cache[name];

    if (!value) {
      if (name === ".") {
        value = this.view;
      } else {
        var context = this;

        while (context) {
          if (name.indexOf(".") > 0) {
            var names = name.split("."), i = 0;

            value = context.view;

            while (value && i < names.length) {
              value = value[names[i++]];
            }
          } else {
            value = context.view[name];
          }

          if (value != null) {
            break;
          }

          context = context.parent;
        }
      }

      this._cache[name] = value;
    }

    if (typeof value === "function") {
      value = value.call(this.view);
    }

    return value;
  };

  function Writer() {
    this.clearCache();
  }

  Writer.prototype.clearCache = function () {
    this._cache = {};
    this._partialCache = {};
  };

  Writer.prototype.compile = function (template, tags) {
    var fn = this._cache[template];

    if (!fn) {
      var tokens = exports.parse(template, tags);
      fn = this._cache[template] = this.compileTokens(tokens, template);
    }

    return fn;
  };

  Writer.prototype.compilePartial = function (name, template, tags) {
    var fn = this.compile(template, tags);
    this._partialCache[name] = fn;
    return fn;
  };

  Writer.prototype.compileTokens = function (tokens, template) {
    var fn = compileTokens(tokens);
    var self = this;

    return function (view, partials) {
      if (partials) {
        if (typeof partials === "function") {
          self._loadPartial = partials;
        } else {
          for (var name in partials) {
            self.compilePartial(name, partials[name]);
          }
        }
      }

      return fn(self, Context.make(view), template);
    };
  };

  Writer.prototype.render = function (template, view, partials) {
    return this.compile(template)(view, partials);
  };

  Writer.prototype._section = function (name, context, text, callback) {
    var value = context.lookup(name);

    switch (typeof value) {
    case "object":
      if (isArray(value)) {
        var buffer = "";

        for (var i = 0, len = value.length; i < len; ++i) {
          buffer += callback(this, context.push(value[i]));
        }

        return buffer;
      }

      return value ? callback(this, context.push(value)) : "";
    case "function":
      var self = this;
      var scopedRender = function (template) {
        return self.render(template, context);
      };

      var result = value.call(context.view, text, scopedRender);
      return result != null ? result : "";
    default:
      if (value) {
        return callback(this, context);
      }
    }

    return "";
  };

  Writer.prototype._inverted = function (name, context, callback) {
    var value = context.lookup(name);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0)) {
      return callback(this, context);
    }

    return "";
  };

  Writer.prototype._partial = function (name, context) {
    if (!(name in this._partialCache) && this._loadPartial) {
      this.compilePartial(name, this._loadPartial(name));
    }

    var fn = this._partialCache[name];

    return fn ? fn(context) : "";
  };

  Writer.prototype._name = function (name, context) {
    var value = context.lookup(name);

    if (typeof value === "function") {
      value = value.call(context.view);
    }

    return (value == null) ? "" : String(value);
  };

  Writer.prototype._escaped = function (name, context) {
    return exports.escape(this._name(name, context));
  };

  /**
   * Low-level function that compiles the given `tokens` into a function
   * that accepts three arguments: a Writer, a Context, and the template.
   */
  function compileTokens(tokens) {
    var subRenders = {};

    function subRender(i, tokens, template) {
      if (!subRenders[i]) {
        var fn = compileTokens(tokens);
        subRenders[i] = function (writer, context) {
          return fn(writer, context, template);
        };
      }

      return subRenders[i];
    }

    return function (writer, context, template) {
      var buffer = "";
      var token, sectionText;

      for (var i = 0, len = tokens.length; i < len; ++i) {
        token = tokens[i];

        switch (token[0]) {
        case "#":
          sectionText = template.slice(token[3], token[5]);
          buffer += writer._section(token[1], context, sectionText, subRender(i, token[4], template));
          break;
        case "^":
          buffer += writer._inverted(token[1], context, subRender(i, token[4], template));
          break;
        case ">":
          buffer += writer._partial(token[1], context);
          break;
        case "&":
          buffer += writer._name(token[1], context);
          break;
        case "name":
          buffer += writer._escaped(token[1], context);
          break;
        case "text":
          buffer += token[1];
          break;
        }
      }

      return buffer;
    };
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens(tokens) {
    var tree = [];
    var collector = tree;
    var sections = [];

    var token;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      switch (token[0]) {
      case '#':
      case '^':
        sections.push(token);
        collector.push(token);
        collector = token[4] = [];
        break;
      case '/':
        var section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : tree;
        break;
      default:
        collector.push(token);
      }
    }

    return tree;
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens(tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];
      if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
        lastToken[1] += token[1];
        lastToken[3] = token[3];
      } else {
        lastToken = token;
        squashedTokens.push(token);
      }
    }

    return squashedTokens;
  }

  function escapeTags(tags) {
    return [
      new RegExp(escapeRe(tags[0]) + "\\s*"),
      new RegExp("\\s*" + escapeRe(tags[1]))
    ];
  }

  /**
   * Breaks up the given `template` string into a tree of token objects. If
   * `tags` is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. ["<%", "%>"]). Of
   * course, the default is to use mustaches (i.e. Mustache.tags).
   */
  exports.parse = function (template, tags) {
    template = template || '';
    tags = tags || exports.tags;

    if (typeof tags === 'string') tags = tags.split(spaceRe);
    if (tags.length !== 2) {
      throw new Error('Invalid tags: ' + tags.join(', '));
    }

    var tagRes = escapeTags(tags);
    var scanner = new Scanner(template);

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace() {
      if (hasTag && !nonSpace) {
        while (spaces.length) {
          tokens.splice(spaces.pop(), 1);
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var start, type, value, chr;
    while (!scanner.eos()) {
      start = scanner.pos;
      value = scanner.scanUntil(tagRes[0]);

      if (value) {
        for (var i = 0, len = value.length; i < len; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push(["text", chr, start, start + 1]);
          start += 1;

          if (chr === "\n") {
            stripSpace(); // Check for whitespace on the current line.
          }
        }
      }

      start = scanner.pos;

      // Match the opening tag.
      if (!scanner.scan(tagRes[0])) {
        break;
      }

      hasTag = true;
      type = scanner.scan(tagRe) || "name";

      // Skip any whitespace between tag and value.
      scanner.scan(whiteRe);

      // Extract the tag value.
      if (type === "=") {
        value = scanner.scanUntil(eqRe);
        scanner.scan(eqRe);
        scanner.scanUntil(tagRes[1]);
      } else if (type === "{") {
        var closeRe = new RegExp("\\s*" + escapeRe("}" + tags[1]));
        value = scanner.scanUntil(closeRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(tagRes[1]);
        type = "&";
      } else {
        value = scanner.scanUntil(tagRes[1]);
      }

      // Match the closing tag.
      if (!scanner.scan(tagRes[1])) {
        throw new Error('Unclosed tag at ' + scanner.pos);
      }

      // Check section nesting.
      if (type === '/') {
        if (sections.length === 0) {
          throw new Error('Unopened section "' + value + '" at ' + start);
        }

        var section = sections.pop();

        if (section[1] !== value) {
          throw new Error('Unclosed section "' + section[1] + '" at ' + start);
        }
      }

      var token = [type, value, start, scanner.pos];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === "name" || type === "{" || type === "&") {
        nonSpace = true;
      } else if (type === "=") {
        // Set the tags for the next time around.
        tags = value.split(spaceRe);

        if (tags.length !== 2) {
          throw new Error('Invalid tags at ' + start + ': ' + tags.join(', '));
        }

        tagRes = escapeTags(tags);
      }
    }

    // Make sure there are no open sections when we're done.
    var section = sections.pop();
    if (section) {
      throw new Error('Unclosed section "' + section[1] + '" at ' + scanner.pos);
    }

    return nestTokens(squashTokens(tokens));
  };

  // The high-level clearCache, compile, compilePartial, and render functions
  // use this default writer.
  var _writer = new Writer();

  /**
   * Clears all cached templates and partials in the default writer.
   */
  exports.clearCache = function () {
    return _writer.clearCache();
  };

  /**
   * Compiles the given `template` to a reusable function using the default
   * writer.
   */
  exports.compile = function (template, tags) {
    return _writer.compile(template, tags);
  };

  /**
   * Compiles the partial with the given `name` and `template` to a reusable
   * function using the default writer.
   */
  exports.compilePartial = function (name, template, tags) {
    return _writer.compilePartial(name, template, tags);
  };

  /**
   * Compiles the given array of tokens (the output of a parse) to a reusable
   * function using the default writer.
   */
  exports.compileTokens = function (tokens, template) {
    return _writer.compileTokens(tokens, template);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  exports.render = function (template, view, partials) {
    return _writer.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.
  exports.to_html = function (template, view, partials, send) {
    var result = exports.render(template, view, partials);

    if (typeof send === "function") {
      send(result);
    } else {
      return result;
    }
  };

  return exports;

}())));

},{}],9:[function(require,module,exports){
//     Underscore.js 1.5.1
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.1';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value == null ? _.identity : value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var result;
    var timeout = null;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}]},{},[1,2,3,4])
//@ sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvZGFsc2dhYXJkL0RldmVsb3BtZW50L1BsYXlncm91bmRab28vU2VydmVyL2NsaWVudC9saWIvZm9yZWNhc3QuanMiLCIvVXNlcnMvZGFsc2dhYXJkL0RldmVsb3BtZW50L1BsYXlncm91bmRab28vU2VydmVyL2NsaWVudC9saWIvbWFpbi5qcyIsIi9Vc2Vycy9kYWxzZ2FhcmQvRGV2ZWxvcG1lbnQvUGxheWdyb3VuZFpvby9TZXJ2ZXIvY2xpZW50L2xpYi9tYXAuanMiLCIvVXNlcnMvZGFsc2dhYXJkL0RldmVsb3BtZW50L1BsYXlncm91bmRab28vU2VydmVyL2NsaWVudC9saWIvbWFwX3V0aWxzLmpzIiwiL1VzZXJzL2RhbHNnYWFyZC9EZXZlbG9wbWVudC9QbGF5Z3JvdW5kWm9vL1NlcnZlci9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXF1ZXN0L2Rpc3QvZW5kZXIvcmVxdWVzdC5qcyIsIi9Vc2Vycy9kYWxzZ2FhcmQvRGV2ZWxvcG1lbnQvUGxheWdyb3VuZFpvby9TZXJ2ZXIvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcmVxdWVzdC9kaXN0L2VuZGVyL3htbGh0dHByZXF1ZXN0LmpzIiwiL1VzZXJzL2RhbHNnYWFyZC9EZXZlbG9wbWVudC9QbGF5Z3JvdW5kWm9vL1NlcnZlci9ub2RlX21vZHVsZXMvbGVhZmxldC9kaXN0L2xlYWZsZXQuanMiLCIvVXNlcnMvZGFsc2dhYXJkL0RldmVsb3BtZW50L1BsYXlncm91bmRab28vU2VydmVyL25vZGVfbW9kdWxlcy9tdXN0YWNoZS9tdXN0YWNoZS5qcyIsIi9Vc2Vycy9kYWxzZ2FhcmQvRGV2ZWxvcG1lbnQvUGxheWdyb3VuZFpvby9TZXJ2ZXIvbm9kZV9tb2R1bGVzL3VuZGVyc2NvcmUvdW5kZXJzY29yZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWpCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsbUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcbnZhciByZXF1ZXN0ID0gcmVxdWlyZSgnYnJvd3Nlci1yZXF1ZXN0Jyk7XG52YXIgbXVzdGFjaGUgPSByZXF1aXJlKCdtdXN0YWNoZScpO1xuXG52YXIgc3BvdFRlbXBsYXRlID0gbXVzdGFjaGUuY29tcGlsZShcIjxsaT48ZGl2Pnt7bmFtZX19PC9kaXY+PHVsIGNsYXNzPSdmb3JlY2FzdCc+PGxpPkxvYWRpbmcuLi48L2xpPjwvdWw+PC9saT5cIik7XG52YXIgZm9yZWNhc3RUZW1wbGF0ZSA9IG11c3RhY2hlLmNvbXBpbGUoXCI8bGk+e3tzcGVlZH19PC9saT5cIik7XG5cbmZ1bmN0aW9uIHdpdGhpbkRpcmVjdGlvbnMoZGlyZWN0aW9uLCBkaXJlY3Rpb25zKSB7XG5cdHZhciBpbnRlcnZhbCA9IGRpcmVjdGlvbnNbMF07XG5cdHZhciBmcm9tID0gaW50ZXJ2YWxbMF07XG5cdHZhciB0byA9IGludGVydmFsWzFdO1xuXHRjb25zb2xlLmxvZyhkaXJlY3Rpb24gKyAnOiAnICsgZnJvbSArICctPicgKyB0byk7XG5cdGlmIChmcm9tIDwgdG8pIHtcblx0XHRyZXR1cm4gZGlyZWN0aW9uID49IGZyb20gJiYgZGlyZWN0aW9uIDw9IHRvO1xuXHR9IGVsc2Uge1xuXHRcdHJldHVybiBkaXJlY3Rpb24gPj0gZnJvbSB8fCBkaXJlY3Rpb24gPD0gdG87XG5cdH1cbn1cblxuZnVuY3Rpb24gY29sb3IoZm9yZWNhc3QsIG1pblNwZWVkLCBkaXJlY3Rpb25zKSB7XG5cdHZhciB3aXRoaW4gPSB3aXRoaW5EaXJlY3Rpb25zKGZvcmVjYXN0LmRpcmVjdGlvbiwgZGlyZWN0aW9ucyk7XG5cdGNvbnNvbGUubG9nKHdpdGhpbik7XG5cdHZhciBzcGVlZCA9IGZvcmVjYXN0LnNwZWVkO1xuXHRpZiAoc3BlZWQgPCBtaW5TcGVlZCkge1xuXHRcdHZhciBpID0gTWF0aC5yb3VuZChzcGVlZCAvIG1pblNwZWVkICogMjU1KTtcblx0XHRpZiAod2l0aGluKSB7XG5cdFx0XHRyZXR1cm4gJ3JnYmEoMCwgJyArIGkgKyAnLCAyNTUsIDEpJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuICdyZ2JhKCcgKyBpICsgJywgMCwgMjU1LCAxKSc7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGlmICh3aXRoaW4pIHtcblx0XHRcdHJldHVybiAncmdiYSgwLCAyNTUsIDAsIDEpJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuICdyZ2JhKDI1NSwgMCwgMCwgMSknO1xuXHRcdH1cblx0fVxufVxuXG5mdW5jdGlvbiBGb3JlY2FzdCgpIHtcblx0dGhpcy5jb250YWluZXIgPSAkKCcjZm9yZWNhc3QnKTtcbn1cblxuRm9yZWNhc3QucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKHNwb3RzKSB7XG5cdHZhciB0aGF0ID0gdGhpcztcblx0dGhpcy5jb250YWluZXIuZW1wdHkoKTtcblx0Xy5lYWNoKHNwb3RzLCBmdW5jdGlvbihzcG90KSB7XG5cdFx0dmFyIGxpID0gJChzcG90VGVtcGxhdGUoc3BvdCkpO1xuXHRcdHZhciB1bCA9IGxpLmZpbmQoJ3VsJyk7XG5cdFx0dGhhdC5jb250YWluZXIuYXBwZW5kKGxpKTtcblx0XHR2YXIgdXJsID0gc3BvdC5mb3JlY2FzdC51cmw7XG5cdFx0cmVxdWVzdCh7bWV0aG9kOiAnR0VUJywgdXJsOiB1cmwsIGpzb246IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSwgYm9keSkge1xuXHRcdFx0Y29uc29sZS5kaXIoYm9keSk7XG5cdFx0XHR1bC5lbXB0eSgpO1xuXHRcdFx0Xy5lYWNoKGJvZHkuZm9yZWNhc3QsIGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIGxpID0gJChmb3JlY2FzdFRlbXBsYXRlKGUpKTtcblx0XHRcdFx0bGkuY3NzKCdiYWNrZ3JvdW5kLWNvbG9yJywgY29sb3IoZSwgNi4xLCBzcG90LmRpcmVjdGlvbnMpKTtcblx0XHRcdFx0dWwuYXBwZW5kKGxpKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9KTtcbn07XG5cbmV4cG9ydHMuRm9yZWNhc3QgPSBGb3JlY2FzdDsiLCJ2YXIgc3BvdE1hcCA9IHJlcXVpcmUoJy4vbWFwJyk7XG52YXIgRm9yZWNhc3QgPSByZXF1aXJlKCcuL2ZvcmVjYXN0JykuRm9yZWNhc3Q7XG5cbiQoZnVuY3Rpb24oKSB7XG5cblx0dmFyIG1hcCA9IG5ldyBzcG90TWFwLlNwb3RNYXAoKTtcblx0dmFyIGZvcmVjYXN0ID0gbmV3IEZvcmVjYXN0KCk7XG5cblx0JCgnI2J1dHRvbnMgbGkuY2VudGVyJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0bWFwLmNlbnRlck1hcmtlcigpO1xuXHR9KTtcblxuXHRtYXAub25TcG90c1VwZGF0ZWQgPSBmdW5jdGlvbihzcG90cykge1xuXHRcdGNvbnNvbGUuZGlyKHNwb3RzKTtcblx0XHRmb3JlY2FzdC51cGRhdGUoc3BvdHMpO1xuXHR9O1xuXG59KTtcbiIsInZhciBfID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xudmFyIHJlcXVlc3QgPSByZXF1aXJlKCdicm93c2VyLXJlcXVlc3QnKTtcbnZhciBsZWFmbGV0ID0gcmVxdWlyZSgnbGVhZmxldCcpO1xubGVhZmxldC5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoID0gJy4vaW1hZ2VzJztcblxudmFyIG1hcFV0aWxzID0gcmVxdWlyZSgnLi9tYXBfdXRpbHMnKTtcblxuZnVuY3Rpb24gU3BvdE1hcCgpIHtcblx0dGhpcy5tYXAgPSBsZWFmbGV0Lm1hcCgnbWFwJykuc2V0VmlldyhbNTYsIDguNV0sIDEwKTtcblx0bGVhZmxldC50aWxlTGF5ZXIoJ2h0dHA6Ly97c30udGlsZS5jbG91ZG1hZGUuY29tLzQwMjcyYTZmMDQ4NjRhMTE5YWM5NWY5YzAxMTk5ZmU0Lzk5Ny8yNTYve3p9L3t4fS97eX0ucG5nJywge1xuXHRcdG1heFpvb206IDE4LFxuXHRcdGF0dHJpYnV0aW9uOiAnTWFwIGRhdGEgJmNvcHk7IDxhIGhyZWY9XCJodHRwOi8vb3BlbnN0cmVldG1hcC5vcmdcIj5PcGVuU3RyZWV0TWFwPC9hPiBjb250cmlidXRvcnMsIDxhIGhyZWY9XCJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9saWNlbnNlcy9ieS1zYS8yLjAvXCI+Q0MtQlktU0E8L2E+LCBJbWFnZXJ5IMKpIDxhIGhyZWY9XCJodHRwOi8vY2xvdWRtYWRlLmNvbVwiPkNsb3VkTWFkZTwvYT4nXG5cdH0pLmFkZFRvKHRoaXMubWFwKTtcblxuXHR0aGlzLm1hcmtlciA9IGxlYWZsZXQubWFya2VyKFs1NiwgOC41XSwge2RyYWdnYWJsZTogdHJ1ZX0pO1xuXHR0aGlzLm1hcmtlci5hZGRUbyh0aGlzLm1hcCk7XG5cblx0dmFyIHRoYXQgPSB0aGlzO1xuXHR0aGlzLm1hcmtlci5vbignZHJhZ2VuZCcsIGZ1bmN0aW9uKGUpIHtcblx0XHRjb25zb2xlLmxvZyh0aGlzLmdldExhdExuZygpLnRvU3RyaW5nKCkpO1xuXHR9KTtcblx0dGhpcy5tYXAub24oJ21vdmVlbmQnLCBmdW5jdGlvbihlKSB7XG4gIFx0Y29uc29sZS5sb2codGhhdC5tYXAuZ2V0Qm91bmRzKCkudG9CQm94U3RyaW5nKCkpO1xuICBcdHRoYXQudXBkYXRlU3BvdHMoKTtcblx0fSk7XG5cblx0dGhpcy5zcG90TWFya2VycyA9IFtdO1xufVxuXG5TcG90TWFwLnByb3RvdHlwZS5jZW50ZXJNYXJrZXIgPSBmdW5jdGlvbigpIHtcblx0dGhpcy5tYXJrZXIuc2V0TGF0TG5nKHRoaXMubWFwLmdldENlbnRlcigpKTtcbn07XG5cblNwb3RNYXAucHJvdG90eXBlLnVwZGF0ZVNwb3RzID0gZnVuY3Rpb24oYmJveCkge1xuXHR2YXIgdGhhdCA9IHRoaXM7XG5cdHZhciB1cmwgPSAnL3Nwb3RzL2JveC8nICsgdGhpcy5tYXAuZ2V0Qm91bmRzKCkudG9CQm94U3RyaW5nKClcblx0cmVxdWVzdCh7bWV0aG9kOiAnR0VUJywgdXJsOiB1cmwsIGpzb246IHRydWV9LCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSwgYm9keSkge1xuXHRcdF8uZWFjaCh0aGF0LnNwb3RNYXJrZXJzLCBmdW5jdGlvbihtYXJrZXIpIHtcblx0XHRcdHRoYXQubWFwLnJlbW92ZUxheWVyKG1hcmtlcik7XG5cdFx0fSk7XG5cdFx0dGhhdC5zcG90TWFya2VycyA9IFtdO1xuXHRcdF8uZWFjaChib2R5LCBmdW5jdGlvbihzcG90KSB7XG5cdFx0XHR2YXIgY29vcmQgPSBzcG90LmxvY2F0aW9uLmNvb3JkaW5hdGVzXG5cdFx0XHRjb25zb2xlLmxvZyhjb29yZCk7XG5cdFx0XHR2YXIgbWFya2VyID0gbWFwVXRpbHMucG9pbnRUb01hcmtlcihzcG90LmxvY2F0aW9uKS5hZGRUbyh0aGF0Lm1hcCk7XG5cdFx0XHR0aGF0LnNwb3RNYXJrZXJzLnB1c2gobWFya2VyKTtcblx0XHR9KTtcblx0XHRpZiAodGhhdC5vblNwb3RzVXBkYXRlZCkge1xuXHRcdFx0dGhhdC5vblNwb3RzVXBkYXRlZChib2R5KTtcblx0XHR9XG5cdH0pO1xufTtcblxuZXhwb3J0cy5TcG90TWFwID0gU3BvdE1hcDtcbiIsInZhciBsZWFmbGV0ID0gcmVxdWlyZSgnbGVhZmxldCcpO1xuXG5mdW5jdGlvbiBwb2ludFRvTWFya2VyKHBvaW50KSB7XG5cdHZhciBjb29yZCA9IHBvaW50LmNvb3JkaW5hdGVzO1xuXHRyZXR1cm4gbGVhZmxldC5tYXJrZXIoW2Nvb3JkWzFdLCBjb29yZFswXV0pO1xufVxuXG5leHBvcnRzLnBvaW50VG9NYXJrZXIgPSBwb2ludFRvTWFya2VyOyIsIi8vIEJyb3dzZXIgUmVxdWVzdFxuLy9cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxudmFyIHhtbGh0dHByZXF1ZXN0ID0gcmVxdWlyZSgnLi94bWxodHRwcmVxdWVzdCcpXG5pZigheG1saHR0cHJlcXVlc3QgfHwgdHlwZW9mIHhtbGh0dHByZXF1ZXN0ICE9PSAnb2JqZWN0JylcbiAgdGhyb3cgbmV3IEVycm9yKCdDb3VsZCBub3QgZmluZCAuL3htbGh0dHByZXF1ZXN0JylcblxudmFyIFhIUiA9IHhtbGh0dHByZXF1ZXN0LlhNTEh0dHBSZXF1ZXN0XG5pZighWEhSKVxuICB0aHJvdyBuZXcgRXJyb3IoJ0JhZCB4bWxodHRwcmVxdWVzdC5YTUxIdHRwUmVxdWVzdCcpXG5pZighICgnX29iamVjdCcgaW4gKG5ldyBYSFIpKSlcbiAgdGhyb3cgbmV3IEVycm9yKCdUaGlzIGlzIG5vdCBwb3J0YWJsZSBYTUxIdHRwUmVxdWVzdCcpXG5cbm1vZHVsZS5leHBvcnRzID0gcmVxdWVzdFxucmVxdWVzdC5YTUxIdHRwUmVxdWVzdCA9IFhIUlxucmVxdWVzdC5sb2cgPSBnZXRMb2dnZXIoKVxuXG52YXIgREVGQVVMVF9USU1FT1VUID0gMyAqIDYwICogMTAwMCAvLyAzIG1pbnV0ZXNcblxuLy9cbi8vIHJlcXVlc3Rcbi8vXG5cbmZ1bmN0aW9uIHJlcXVlc3Qob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgLy8gVGhlIGVudHJ5LXBvaW50IHRvIHRoZSBBUEk6IHByZXAgdGhlIG9wdGlvbnMgb2JqZWN0IGFuZCBwYXNzIHRoZSByZWFsIHdvcmsgdG8gcnVuX3hoci5cbiAgaWYodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBFcnJvcignQmFkIGNhbGxiYWNrIGdpdmVuOiAnICsgY2FsbGJhY2spXG5cbiAgaWYoIW9wdGlvbnMpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBvcHRpb25zIGdpdmVuJylcblxuICB2YXIgb3B0aW9uc19vblJlc3BvbnNlID0gb3B0aW9ucy5vblJlc3BvbnNlOyAvLyBTYXZlIHRoaXMgZm9yIGxhdGVyLlxuXG4gIGlmKHR5cGVvZiBvcHRpb25zID09PSAnc3RyaW5nJylcbiAgICBvcHRpb25zID0geyd1cmknOm9wdGlvbnN9O1xuICBlbHNlXG4gICAgb3B0aW9ucyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpOyAvLyBVc2UgYSBkdXBsaWNhdGUgZm9yIG11dGF0aW5nLlxuXG4gIG9wdGlvbnMub25SZXNwb25zZSA9IG9wdGlvbnNfb25SZXNwb25zZSAvLyBBbmQgcHV0IGl0IGJhY2suXG5cbiAgaWYob3B0aW9ucy51cmwpIHtcbiAgICBvcHRpb25zLnVyaSA9IG9wdGlvbnMudXJsO1xuICAgIGRlbGV0ZSBvcHRpb25zLnVybDtcbiAgfVxuXG4gIGlmKCFvcHRpb25zLnVyaSAmJiBvcHRpb25zLnVyaSAhPT0gXCJcIilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnVyaSBpcyBhIHJlcXVpcmVkIGFyZ3VtZW50XCIpO1xuXG4gIGlmKHR5cGVvZiBvcHRpb25zLnVyaSAhPSBcInN0cmluZ1wiKVxuICAgIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMudXJpIG11c3QgYmUgYSBzdHJpbmdcIik7XG5cbiAgdmFyIHVuc3VwcG9ydGVkX29wdGlvbnMgPSBbJ3Byb3h5JywgJ19yZWRpcmVjdHNGb2xsb3dlZCcsICdtYXhSZWRpcmVjdHMnLCAnZm9sbG93UmVkaXJlY3QnXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVuc3VwcG9ydGVkX29wdGlvbnMubGVuZ3RoOyBpKyspXG4gICAgaWYob3B0aW9uc1sgdW5zdXBwb3J0ZWRfb3B0aW9uc1tpXSBdKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5cIiArIHVuc3VwcG9ydGVkX29wdGlvbnNbaV0gKyBcIiBpcyBub3Qgc3VwcG9ydGVkXCIpXG5cbiAgb3B0aW9ucy5jYWxsYmFjayA9IGNhbGxiYWNrXG4gIG9wdGlvbnMubWV0aG9kID0gb3B0aW9ucy5tZXRob2QgfHwgJ0dFVCc7XG4gIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgb3B0aW9ucy5ib2R5ICAgID0gb3B0aW9ucy5ib2R5IHx8IG51bGxcbiAgb3B0aW9ucy50aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0IHx8IHJlcXVlc3QuREVGQVVMVF9USU1FT1VUXG5cbiAgaWYob3B0aW9ucy5oZWFkZXJzLmhvc3QpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3B0aW9ucy5oZWFkZXJzLmhvc3QgaXMgbm90IHN1cHBvcnRlZFwiKTtcblxuICBpZihvcHRpb25zLmpzb24pIHtcbiAgICBvcHRpb25zLmhlYWRlcnMuYWNjZXB0ID0gb3B0aW9ucy5oZWFkZXJzLmFjY2VwdCB8fCAnYXBwbGljYXRpb24vanNvbidcbiAgICBpZihvcHRpb25zLm1ldGhvZCAhPT0gJ0dFVCcpXG4gICAgICBvcHRpb25zLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gJ2FwcGxpY2F0aW9uL2pzb24nXG5cbiAgICBpZih0eXBlb2Ygb3B0aW9ucy5qc29uICE9PSAnYm9vbGVhbicpXG4gICAgICBvcHRpb25zLmJvZHkgPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmpzb24pXG4gICAgZWxzZSBpZih0eXBlb2Ygb3B0aW9ucy5ib2R5ICE9PSAnc3RyaW5nJylcbiAgICAgIG9wdGlvbnMuYm9keSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuYm9keSlcbiAgfVxuXG4gIC8vIElmIG9uUmVzcG9uc2UgaXMgYm9vbGVhbiB0cnVlLCBjYWxsIGJhY2sgaW1tZWRpYXRlbHkgd2hlbiB0aGUgcmVzcG9uc2UgaXMga25vd24sXG4gIC8vIG5vdCB3aGVuIHRoZSBmdWxsIHJlcXVlc3QgaXMgY29tcGxldGUuXG4gIG9wdGlvbnMub25SZXNwb25zZSA9IG9wdGlvbnMub25SZXNwb25zZSB8fCBub29wXG4gIGlmKG9wdGlvbnMub25SZXNwb25zZSA9PT0gdHJ1ZSkge1xuICAgIG9wdGlvbnMub25SZXNwb25zZSA9IGNhbGxiYWNrXG4gICAgb3B0aW9ucy5jYWxsYmFjayA9IG5vb3BcbiAgfVxuXG4gIC8vIFhYWCBCcm93c2VycyBkbyBub3QgbGlrZSB0aGlzLlxuICAvL2lmKG9wdGlvbnMuYm9keSlcbiAgLy8gIG9wdGlvbnMuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSA9IG9wdGlvbnMuYm9keS5sZW5ndGg7XG5cbiAgLy8gSFRUUCBiYXNpYyBhdXRoZW50aWNhdGlvblxuICBpZighb3B0aW9ucy5oZWFkZXJzLmF1dGhvcml6YXRpb24gJiYgb3B0aW9ucy5hdXRoKVxuICAgIG9wdGlvbnMuaGVhZGVycy5hdXRob3JpemF0aW9uID0gJ0Jhc2ljICcgKyBiNjRfZW5jKG9wdGlvbnMuYXV0aC51c2VybmFtZSArICc6JyArIG9wdGlvbnMuYXV0aC5wYXNzd29yZCk7XG5cbiAgcmV0dXJuIHJ1bl94aHIob3B0aW9ucylcbn1cblxudmFyIHJlcV9zZXEgPSAwXG5mdW5jdGlvbiBydW5feGhyKG9wdGlvbnMpIHtcbiAgdmFyIHhociA9IG5ldyBYSFJcbiAgICAsIHRpbWVkX291dCA9IGZhbHNlXG4gICAgLCBpc19jb3JzID0gaXNfY3Jvc3NEb21haW4ob3B0aW9ucy51cmkpXG4gICAgLCBzdXBwb3J0c19jb3JzID0gKCd3aXRoQ3JlZGVudGlhbHMnIGluIHhoci5fb2JqZWN0KVxuXG4gIHJlcV9zZXEgKz0gMVxuICB4aHIuc2VxX2lkID0gcmVxX3NlcVxuICB4aHIuaWQgPSByZXFfc2VxICsgJzogJyArIG9wdGlvbnMubWV0aG9kICsgJyAnICsgb3B0aW9ucy51cmlcbiAgeGhyLl9pZCA9IHhoci5pZCAvLyBJIGtub3cgSSB3aWxsIHR5cGUgXCJfaWRcIiBmcm9tIGhhYml0IGFsbCB0aGUgdGltZS5cblxuICBpZihpc19jb3JzICYmICFzdXBwb3J0c19jb3JzKSB7XG4gICAgdmFyIGNvcnNfZXJyID0gbmV3IEVycm9yKCdCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgY3Jvc3Mtb3JpZ2luIHJlcXVlc3Q6ICcgKyBvcHRpb25zLnVyaSlcbiAgICBjb3JzX2Vyci5jb3JzID0gJ3Vuc3VwcG9ydGVkJ1xuICAgIHJldHVybiBvcHRpb25zLmNhbGxiYWNrKGNvcnNfZXJyLCB4aHIpXG4gIH1cblxuICB4aHIudGltZW91dFRpbWVyID0gc2V0VGltZW91dCh0b29fbGF0ZSwgb3B0aW9ucy50aW1lb3V0KVxuICBmdW5jdGlvbiB0b29fbGF0ZSgpIHtcbiAgICB0aW1lZF9vdXQgPSB0cnVlXG4gICAgdmFyIGVyID0gbmV3IEVycm9yKCdFVElNRURPVVQnKVxuICAgIGVyLmNvZGUgPSAnRVRJTUVET1VUJ1xuICAgIGVyLmR1cmF0aW9uID0gb3B0aW9ucy50aW1lb3V0XG5cbiAgICByZXF1ZXN0LmxvZy5lcnJvcignVGltZW91dCcsIHsgJ2lkJzp4aHIuX2lkLCAnbWlsbGlzZWNvbmRzJzpvcHRpb25zLnRpbWVvdXQgfSlcbiAgICByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhlciwgeGhyKVxuICB9XG5cbiAgLy8gU29tZSBzdGF0ZXMgY2FuIGJlIHNraXBwZWQgb3Zlciwgc28gcmVtZW1iZXIgd2hhdCBpcyBzdGlsbCBpbmNvbXBsZXRlLlxuICB2YXIgZGlkID0geydyZXNwb25zZSc6ZmFsc2UsICdsb2FkaW5nJzpmYWxzZSwgJ2VuZCc6ZmFsc2V9XG5cbiAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG9uX3N0YXRlX2NoYW5nZVxuICB4aHIub3BlbihvcHRpb25zLm1ldGhvZCwgb3B0aW9ucy51cmksIHRydWUpIC8vIGFzeW5jaHJvbm91c1xuICBpZihpc19jb3JzKVxuICAgIHhoci5fb2JqZWN0LndpdGhDcmVkZW50aWFscyA9ICEhIG9wdGlvbnMud2l0aENyZWRlbnRpYWxzXG4gIHhoci5zZW5kKG9wdGlvbnMuYm9keSlcbiAgcmV0dXJuIHhoclxuXG4gIGZ1bmN0aW9uIG9uX3N0YXRlX2NoYW5nZShldmVudCkge1xuICAgIGlmKHRpbWVkX291dClcbiAgICAgIHJldHVybiByZXF1ZXN0LmxvZy5kZWJ1ZygnSWdub3JpbmcgdGltZWQgb3V0IHN0YXRlIGNoYW5nZScsIHsnc3RhdGUnOnhoci5yZWFkeVN0YXRlLCAnaWQnOnhoci5pZH0pXG5cbiAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnU3RhdGUgY2hhbmdlJywgeydzdGF0ZSc6eGhyLnJlYWR5U3RhdGUsICdpZCc6eGhyLmlkLCAndGltZWRfb3V0Jzp0aW1lZF9vdXR9KVxuXG4gICAgaWYoeGhyLnJlYWR5U3RhdGUgPT09IFhIUi5PUEVORUQpIHtcbiAgICAgIHJlcXVlc3QubG9nLmRlYnVnKCdSZXF1ZXN0IHN0YXJ0ZWQnLCB7J2lkJzp4aHIuaWR9KVxuICAgICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMuaGVhZGVycylcbiAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoa2V5LCBvcHRpb25zLmhlYWRlcnNba2V5XSlcbiAgICB9XG5cbiAgICBlbHNlIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuSEVBREVSU19SRUNFSVZFRClcbiAgICAgIG9uX3Jlc3BvbnNlKClcblxuICAgIGVsc2UgaWYoeGhyLnJlYWR5U3RhdGUgPT09IFhIUi5MT0FESU5HKSB7XG4gICAgICBvbl9yZXNwb25zZSgpXG4gICAgICBvbl9sb2FkaW5nKClcbiAgICB9XG5cbiAgICBlbHNlIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuRE9ORSkge1xuICAgICAgb25fcmVzcG9uc2UoKVxuICAgICAgb25fbG9hZGluZygpXG4gICAgICBvbl9lbmQoKVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG9uX3Jlc3BvbnNlKCkge1xuICAgIGlmKGRpZC5yZXNwb25zZSlcbiAgICAgIHJldHVyblxuXG4gICAgZGlkLnJlc3BvbnNlID0gdHJ1ZVxuICAgIHJlcXVlc3QubG9nLmRlYnVnKCdHb3QgcmVzcG9uc2UnLCB7J2lkJzp4aHIuaWQsICdzdGF0dXMnOnhoci5zdGF0dXN9KVxuICAgIGNsZWFyVGltZW91dCh4aHIudGltZW91dFRpbWVyKVxuICAgIHhoci5zdGF0dXNDb2RlID0geGhyLnN0YXR1cyAvLyBOb2RlIHJlcXVlc3QgY29tcGF0aWJpbGl0eVxuXG4gICAgLy8gRGV0ZWN0IGZhaWxlZCBDT1JTIHJlcXVlc3RzLlxuICAgIGlmKGlzX2NvcnMgJiYgeGhyLnN0YXR1c0NvZGUgPT0gMCkge1xuICAgICAgdmFyIGNvcnNfZXJyID0gbmV3IEVycm9yKCdDT1JTIHJlcXVlc3QgcmVqZWN0ZWQ6ICcgKyBvcHRpb25zLnVyaSlcbiAgICAgIGNvcnNfZXJyLmNvcnMgPSAncmVqZWN0ZWQnXG5cbiAgICAgIC8vIERvIG5vdCBwcm9jZXNzIHRoaXMgcmVxdWVzdCBmdXJ0aGVyLlxuICAgICAgZGlkLmxvYWRpbmcgPSB0cnVlXG4gICAgICBkaWQuZW5kID0gdHJ1ZVxuXG4gICAgICByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhjb3JzX2VyciwgeGhyKVxuICAgIH1cblxuICAgIG9wdGlvbnMub25SZXNwb25zZShudWxsLCB4aHIpXG4gIH1cblxuICBmdW5jdGlvbiBvbl9sb2FkaW5nKCkge1xuICAgIGlmKGRpZC5sb2FkaW5nKVxuICAgICAgcmV0dXJuXG5cbiAgICBkaWQubG9hZGluZyA9IHRydWVcbiAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnUmVzcG9uc2UgYm9keSBsb2FkaW5nJywgeydpZCc6eGhyLmlkfSlcbiAgICAvLyBUT0RPOiBNYXliZSBzaW11bGF0ZSBcImRhdGFcIiBldmVudHMgYnkgd2F0Y2hpbmcgeGhyLnJlc3BvbnNlVGV4dFxuICB9XG5cbiAgZnVuY3Rpb24gb25fZW5kKCkge1xuICAgIGlmKGRpZC5lbmQpXG4gICAgICByZXR1cm5cblxuICAgIGRpZC5lbmQgPSB0cnVlXG4gICAgcmVxdWVzdC5sb2cuZGVidWcoJ1JlcXVlc3QgZG9uZScsIHsnaWQnOnhoci5pZH0pXG5cbiAgICB4aHIuYm9keSA9IHhoci5yZXNwb25zZVRleHRcbiAgICBpZihvcHRpb25zLmpzb24pIHtcbiAgICAgIHRyeSAgICAgICAgeyB4aHIuYm9keSA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCkgfVxuICAgICAgY2F0Y2ggKGVyKSB7IHJldHVybiBvcHRpb25zLmNhbGxiYWNrKGVyLCB4aHIpICAgICAgICB9XG4gICAgfVxuXG4gICAgb3B0aW9ucy5jYWxsYmFjayhudWxsLCB4aHIsIHhoci5ib2R5KVxuICB9XG5cbn0gLy8gcmVxdWVzdFxuXG5yZXF1ZXN0LndpdGhDcmVkZW50aWFscyA9IGZhbHNlO1xucmVxdWVzdC5ERUZBVUxUX1RJTUVPVVQgPSBERUZBVUxUX1RJTUVPVVQ7XG5cbi8vXG4vLyBIVFRQIG1ldGhvZCBzaG9ydGN1dHNcbi8vXG5cbnZhciBzaG9ydGN1dHMgPSBbICdnZXQnLCAncHV0JywgJ3Bvc3QnLCAnaGVhZCcgXTtcbnNob3J0Y3V0cy5mb3JFYWNoKGZ1bmN0aW9uKHNob3J0Y3V0KSB7XG4gIHZhciBtZXRob2QgPSBzaG9ydGN1dC50b1VwcGVyQ2FzZSgpO1xuICB2YXIgZnVuYyAgID0gc2hvcnRjdXQudG9Mb3dlckNhc2UoKTtcblxuICByZXF1ZXN0W2Z1bmNdID0gZnVuY3Rpb24ob3B0cykge1xuICAgIGlmKHR5cGVvZiBvcHRzID09PSAnc3RyaW5nJylcbiAgICAgIG9wdHMgPSB7J21ldGhvZCc6bWV0aG9kLCAndXJpJzpvcHRzfTtcbiAgICBlbHNlIHtcbiAgICAgIG9wdHMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wdHMpKTtcbiAgICAgIG9wdHMubWV0aG9kID0gbWV0aG9kO1xuICAgIH1cblxuICAgIHZhciBhcmdzID0gW29wdHNdLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYXJndW1lbnRzLCBbMV0pKTtcbiAgICByZXR1cm4gcmVxdWVzdC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxufSlcblxuLy9cbi8vIENvdWNoREIgc2hvcnRjdXRcbi8vXG5cbnJlcXVlc3QuY291Y2ggPSBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjaykge1xuICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpXG4gICAgb3B0aW9ucyA9IHsndXJpJzpvcHRpb25zfVxuXG4gIC8vIEp1c3QgdXNlIHRoZSByZXF1ZXN0IEFQSSB0byBkbyBKU09OLlxuICBvcHRpb25zLmpzb24gPSB0cnVlXG4gIGlmKG9wdGlvbnMuYm9keSlcbiAgICBvcHRpb25zLmpzb24gPSBvcHRpb25zLmJvZHlcbiAgZGVsZXRlIG9wdGlvbnMuYm9keVxuXG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgbm9vcFxuXG4gIHZhciB4aHIgPSByZXF1ZXN0KG9wdGlvbnMsIGNvdWNoX2hhbmRsZXIpXG4gIHJldHVybiB4aHJcblxuICBmdW5jdGlvbiBjb3VjaF9oYW5kbGVyKGVyLCByZXNwLCBib2R5KSB7XG4gICAgaWYoZXIpXG4gICAgICByZXR1cm4gY2FsbGJhY2soZXIsIHJlc3AsIGJvZHkpXG5cbiAgICBpZigocmVzcC5zdGF0dXNDb2RlIDwgMjAwIHx8IHJlc3Auc3RhdHVzQ29kZSA+IDI5OSkgJiYgYm9keS5lcnJvcikge1xuICAgICAgLy8gVGhlIGJvZHkgaXMgYSBDb3VjaCBKU09OIG9iamVjdCBpbmRpY2F0aW5nIHRoZSBlcnJvci5cbiAgICAgIGVyID0gbmV3IEVycm9yKCdDb3VjaERCIGVycm9yOiAnICsgKGJvZHkuZXJyb3IucmVhc29uIHx8IGJvZHkuZXJyb3IuZXJyb3IpKVxuICAgICAgZm9yICh2YXIga2V5IGluIGJvZHkpXG4gICAgICAgIGVyW2tleV0gPSBib2R5W2tleV1cbiAgICAgIHJldHVybiBjYWxsYmFjayhlciwgcmVzcCwgYm9keSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNhbGxiYWNrKGVyLCByZXNwLCBib2R5KTtcbiAgfVxufVxuXG4vL1xuLy8gVXRpbGl0eVxuLy9cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmZ1bmN0aW9uIGdldExvZ2dlcigpIHtcbiAgdmFyIGxvZ2dlciA9IHt9XG4gICAgLCBsZXZlbHMgPSBbJ3RyYWNlJywgJ2RlYnVnJywgJ2luZm8nLCAnd2FybicsICdlcnJvciddXG4gICAgLCBsZXZlbCwgaVxuXG4gIGZvcihpID0gMDsgaSA8IGxldmVscy5sZW5ndGg7IGkrKykge1xuICAgIGxldmVsID0gbGV2ZWxzW2ldXG5cbiAgICBsb2dnZXJbbGV2ZWxdID0gbm9vcFxuICAgIGlmKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlICYmIGNvbnNvbGVbbGV2ZWxdKVxuICAgICAgbG9nZ2VyW2xldmVsXSA9IGZvcm1hdHRlZChjb25zb2xlLCBsZXZlbClcbiAgfVxuXG4gIHJldHVybiBsb2dnZXJcbn1cblxuZnVuY3Rpb24gZm9ybWF0dGVkKG9iaiwgbWV0aG9kKSB7XG4gIHJldHVybiBmb3JtYXR0ZWRfbG9nZ2VyXG5cbiAgZnVuY3Rpb24gZm9ybWF0dGVkX2xvZ2dlcihzdHIsIGNvbnRleHQpIHtcbiAgICBpZih0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpXG4gICAgICBzdHIgKz0gJyAnICsgSlNPTi5zdHJpbmdpZnkoY29udGV4dClcblxuICAgIHJldHVybiBvYmpbbWV0aG9kXS5jYWxsKG9iaiwgc3RyKVxuICB9XG59XG5cbi8vIFJldHVybiB3aGV0aGVyIGEgVVJMIGlzIGEgY3Jvc3MtZG9tYWluIHJlcXVlc3QuXG5mdW5jdGlvbiBpc19jcm9zc0RvbWFpbih1cmwpIHtcbiAgdmFyIHJ1cmwgPSAvXihbXFx3XFwrXFwuXFwtXSs6KSg/OlxcL1xcLyhbXlxcLz8jOl0qKSg/OjooXFxkKykpPyk/L1xuXG4gIC8vIGpRdWVyeSAjODEzOCwgSUUgbWF5IHRocm93IGFuIGV4Y2VwdGlvbiB3aGVuIGFjY2Vzc2luZ1xuICAvLyBhIGZpZWxkIGZyb20gd2luZG93LmxvY2F0aW9uIGlmIGRvY3VtZW50LmRvbWFpbiBoYXMgYmVlbiBzZXRcbiAgdmFyIGFqYXhMb2NhdGlvblxuICB0cnkgeyBhamF4TG9jYXRpb24gPSBsb2NhdGlvbi5ocmVmIH1cbiAgY2F0Y2ggKGUpIHtcbiAgICAvLyBVc2UgdGhlIGhyZWYgYXR0cmlidXRlIG9mIGFuIEEgZWxlbWVudCBzaW5jZSBJRSB3aWxsIG1vZGlmeSBpdCBnaXZlbiBkb2N1bWVudC5sb2NhdGlvblxuICAgIGFqYXhMb2NhdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoIFwiYVwiICk7XG4gICAgYWpheExvY2F0aW9uLmhyZWYgPSBcIlwiO1xuICAgIGFqYXhMb2NhdGlvbiA9IGFqYXhMb2NhdGlvbi5ocmVmO1xuICB9XG5cbiAgdmFyIGFqYXhMb2NQYXJ0cyA9IHJ1cmwuZXhlYyhhamF4TG9jYXRpb24udG9Mb3dlckNhc2UoKSkgfHwgW11cbiAgICAsIHBhcnRzID0gcnVybC5leGVjKHVybC50b0xvd2VyQ2FzZSgpIClcblxuICB2YXIgcmVzdWx0ID0gISEoXG4gICAgcGFydHMgJiZcbiAgICAoICBwYXJ0c1sxXSAhPSBhamF4TG9jUGFydHNbMV1cbiAgICB8fCBwYXJ0c1syXSAhPSBhamF4TG9jUGFydHNbMl1cbiAgICB8fCAocGFydHNbM10gfHwgKHBhcnRzWzFdID09PSBcImh0dHA6XCIgPyA4MCA6IDQ0MykpICE9IChhamF4TG9jUGFydHNbM10gfHwgKGFqYXhMb2NQYXJ0c1sxXSA9PT0gXCJodHRwOlwiID8gODAgOiA0NDMpKVxuICAgIClcbiAgKVxuXG4gIC8vY29uc29sZS5kZWJ1ZygnaXNfY3Jvc3NEb21haW4oJyt1cmwrJykgLT4gJyArIHJlc3VsdClcbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vLyBNSVQgTGljZW5zZSBmcm9tIGh0dHA6Ly9waHBqcy5vcmcvZnVuY3Rpb25zL2Jhc2U2NF9lbmNvZGU6MzU4XG5mdW5jdGlvbiBiNjRfZW5jIChkYXRhKSB7XG4gICAgLy8gRW5jb2RlcyBzdHJpbmcgdXNpbmcgTUlNRSBiYXNlNjQgYWxnb3JpdGhtXG4gICAgdmFyIGI2NCA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIjtcbiAgICB2YXIgbzEsIG8yLCBvMywgaDEsIGgyLCBoMywgaDQsIGJpdHMsIGkgPSAwLCBhYyA9IDAsIGVuYz1cIlwiLCB0bXBfYXJyID0gW107XG5cbiAgICBpZiAoIWRhdGEpIHtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgLy8gYXNzdW1lIHV0ZjggZGF0YVxuICAgIC8vIGRhdGEgPSB0aGlzLnV0ZjhfZW5jb2RlKGRhdGErJycpO1xuXG4gICAgZG8geyAvLyBwYWNrIHRocmVlIG9jdGV0cyBpbnRvIGZvdXIgaGV4ZXRzXG4gICAgICAgIG8xID0gZGF0YS5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICAgIG8yID0gZGF0YS5jaGFyQ29kZUF0KGkrKyk7XG4gICAgICAgIG8zID0gZGF0YS5jaGFyQ29kZUF0KGkrKyk7XG5cbiAgICAgICAgYml0cyA9IG8xPDwxNiB8IG8yPDw4IHwgbzM7XG5cbiAgICAgICAgaDEgPSBiaXRzPj4xOCAmIDB4M2Y7XG4gICAgICAgIGgyID0gYml0cz4+MTIgJiAweDNmO1xuICAgICAgICBoMyA9IGJpdHM+PjYgJiAweDNmO1xuICAgICAgICBoNCA9IGJpdHMgJiAweDNmO1xuXG4gICAgICAgIC8vIHVzZSBoZXhldHMgdG8gaW5kZXggaW50byBiNjQsIGFuZCBhcHBlbmQgcmVzdWx0IHRvIGVuY29kZWQgc3RyaW5nXG4gICAgICAgIHRtcF9hcnJbYWMrK10gPSBiNjQuY2hhckF0KGgxKSArIGI2NC5jaGFyQXQoaDIpICsgYjY0LmNoYXJBdChoMykgKyBiNjQuY2hhckF0KGg0KTtcbiAgICB9IHdoaWxlIChpIDwgZGF0YS5sZW5ndGgpO1xuXG4gICAgZW5jID0gdG1wX2Fyci5qb2luKCcnKTtcblxuICAgIHN3aXRjaCAoZGF0YS5sZW5ndGggJSAzKSB7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgIGVuYyA9IGVuYy5zbGljZSgwLCAtMikgKyAnPT0nO1xuICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgZW5jID0gZW5jLnNsaWNlKDAsIC0xKSArICc9JztcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgcmV0dXJuIGVuYztcbn1cbiIsIlxuXG4hZnVuY3Rpb24od2luZG93KSB7XG4gIGlmKHR5cGVvZiBleHBvcnRzID09PSAndW5kZWZpbmVkJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Nhbm5vdCBmaW5kIGdsb2JhbCBcImV4cG9ydHNcIiBvYmplY3QuIElzIHRoaXMgcmVhbGx5IENvbW1vbkpTPycpXG4gIGlmKHR5cGVvZiBtb2R1bGUgPT09ICd1bmRlZmluZWQnKVxuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGZpbmQgZ2xvYmFsIFwibW9kdWxlXCIgb2JqZWN0LiBJcyB0aGlzIHJlYWxseSBDb21tb25KUz8nKVxuICBpZighbW9kdWxlLmV4cG9ydHMpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZmluZCBnbG9iYWwgXCJtb2R1bGUuZXhwb3J0c1wiIG9iamVjdC4gSXMgdGhpcyByZWFsbHkgQ29tbW9uSlM/JylcblxuICAvLyBEZWZpbmUgZ2xvYmFscyB0byBzaW11bGF0ZSBhIGJyb3dzZXIgZW52aXJvbm1lbnQuXG4gIHdpbmRvdyA9IHdpbmRvdyB8fCB7fVxuXG4gIHZhciBkb2N1bWVudCA9IHdpbmRvdy5kb2N1bWVudCB8fCB7fVxuICBpZighd2luZG93LmRvY3VtZW50KVxuICAgIHdpbmRvdy5kb2N1bWVudCA9IGRvY3VtZW50XG5cbiAgdmFyIG5hdmlnYXRvciA9IHdpbmRvdy5uYXZpZ2F0b3IgfHwge31cbiAgaWYoIXdpbmRvdy5uYXZpZ2F0b3IpXG4gICAgd2luZG93Lm5hdmlnYXRvciA9IG5hdmlnYXRvclxuXG4gIGlmKCFuYXZpZ2F0b3IudXNlckFnZW50KVxuICAgIG5hdmlnYXRvci51c2VyQWdlbnQgPSAnTW96aWxsYS81LjAgKE1hY2ludG9zaDsgSW50ZWwgTWFjIE9TIFggMTBfN18yKSBBcHBsZVdlYktpdC81MzQuNTEuMjIgKEtIVE1MLCBsaWtlIEdlY2tvKSBWZXJzaW9uLzUuMS4xIFNhZmFyaS81MzQuNTEuMjInO1xuXG4gIC8vIFJlbWVtYmVyIHRoZSBvbGQgdmFsdWVzIGluIHdpbmRvdy4gSWYgdGhlIGlubmVyIGNvZGUgY2hhbmdlcyBhbnl0aGluZywgZXhwb3J0IHRoYXQgYXMgYSBtb2R1bGUgYW5kIHJlc3RvcmUgdGhlIG9sZCB3aW5kb3cgdmFsdWUuXG4gIHZhciB3aW4gPSB7fVxuICAgICwga2V5XG5cbiAgZm9yIChrZXkgaW4gd2luZG93KVxuICAgIGlmKHdpbmRvdy5oYXNPd25Qcm9wZXJ0eShrZXkpKVxuICAgICAgd2luW2tleV0gPSB3aW5kb3dba2V5XVxuXG4gIHJ1bl9jb2RlKClcblxuICBmb3IgKGtleSBpbiB3aW5kb3cpXG4gICAgaWYod2luZG93Lmhhc093blByb3BlcnR5KGtleSkpXG4gICAgICBpZih3aW5kb3dba2V5XSAhPT0gd2luW2tleV0pIHtcbiAgICAgICAgZXhwb3J0c1trZXldID0gd2luZG93W2tleV1cbiAgICAgICAgd2luZG93W2tleV0gPSB3aW5ba2V5XVxuICAgICAgfVxuXG4gIGZ1bmN0aW9uIHJ1bl9jb2RlKCkge1xuICAgIC8vIEJlZ2luIGJyb3dzZXIgZmlsZTogWE1MSHR0cFJlcXVlc3QuanNcbi8qKlxuKiBYTUxIdHRwUmVxdWVzdC5qcyBDb3B5cmlnaHQgKEMpIDIwMTEgU2VyZ2V5IElsaW5za3kgKGh0dHA6Ly93d3cuaWxpbnNreS5jb20pXG4qXG4qIFRoaXMgd29yayBpcyBmcmVlIHNvZnR3YXJlOyB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4qIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAyLjEgb2YgdGhlIExpY2Vuc2UsIG9yXG4qIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4qXG4qIFRoaXMgd29yayBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuKiBidXQgd2l0aG91dCBhbnkgd2FycmFudHk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuKiBtZXJjaGFudGFiaWxpdHkgb3IgZml0bmVzcyBmb3IgYSBwYXJ0aWN1bGFyIHB1cnBvc2UuIFNlZSB0aGVcbiogR05VIExlc3NlciBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4qXG4qIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBMZXNzZXIgR2VuZXJhbCBQdWJsaWMgTGljZW5zZVxuKiBhbG9uZyB3aXRoIHRoaXMgbGlicmFyeTsgaWYgbm90LCB3cml0ZSB0byB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uLCBJbmMuLFxuKiA1OSBUZW1wbGUgUGxhY2UsIFN1aXRlIDMzMCwgQm9zdG9uLCBNQSAwMjExMS0xMzA3IFVTQVxuKi9cblxuKGZ1bmN0aW9uICgpIHtcblxuXHQvLyBTYXZlIHJlZmVyZW5jZSB0byBlYXJsaWVyIGRlZmluZWQgb2JqZWN0IGltcGxlbWVudGF0aW9uIChpZiBhbnkpXG5cdHZhciBvWE1MSHR0cFJlcXVlc3QgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q7XG5cblx0Ly8gRGVmaW5lIG9uIGJyb3dzZXIgdHlwZVxuXHR2YXIgYkdlY2tvICA9ICEhd2luZG93LmNvbnRyb2xsZXJzO1xuXHR2YXIgYklFICAgICA9ICEhd2luZG93LmRvY3VtZW50Lm5hbWVzcGFjZXM7XG5cdHZhciBiSUU3ICAgID0gYklFICYmIHdpbmRvdy5uYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9NU0lFIDcuMC8pO1xuXG5cdC8vIEVuYWJsZXMgXCJYTUxIdHRwUmVxdWVzdCgpXCIgY2FsbCBuZXh0IHRvIFwibmV3IFhNTEh0dHBSZXF1ZXN0KClcIlxuXHRmdW5jdGlvbiBmWE1MSHR0cFJlcXVlc3QoKSB7XG5cdFx0dGhpcy5fb2JqZWN0ICA9IG9YTUxIdHRwUmVxdWVzdCAmJiAhYklFNyA/IG5ldyBvWE1MSHR0cFJlcXVlc3QgOiBuZXcgd2luZG93LkFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKTtcblx0XHR0aGlzLl9saXN0ZW5lcnMgPSBbXTtcblx0fVxuXG5cdC8vIENvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIGNYTUxIdHRwUmVxdWVzdCgpIHtcblx0XHRyZXR1cm4gbmV3IGZYTUxIdHRwUmVxdWVzdDtcblx0fVxuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlID0gZlhNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZTtcblxuXHQvLyBCVUdGSVg6IEZpcmVmb3ggd2l0aCBGaXJlYnVnIGluc3RhbGxlZCB3b3VsZCBicmVhayBwYWdlcyBpZiBub3QgZXhlY3V0ZWRcblx0aWYgKGJHZWNrbyAmJiBvWE1MSHR0cFJlcXVlc3Qud3JhcHBlZCkge1xuXHRcdGNYTUxIdHRwUmVxdWVzdC53cmFwcGVkID0gb1hNTEh0dHBSZXF1ZXN0LndyYXBwZWQ7XG5cdH1cblxuXHQvLyBDb25zdGFudHNcblx0Y1hNTEh0dHBSZXF1ZXN0LlVOU0VOVCAgICAgICAgICAgID0gMDtcblx0Y1hNTEh0dHBSZXF1ZXN0Lk9QRU5FRCAgICAgICAgICAgID0gMTtcblx0Y1hNTEh0dHBSZXF1ZXN0LkhFQURFUlNfUkVDRUlWRUQgID0gMjtcblx0Y1hNTEh0dHBSZXF1ZXN0LkxPQURJTkcgICAgICAgICAgID0gMztcblx0Y1hNTEh0dHBSZXF1ZXN0LkRPTkUgICAgICAgICAgICAgID0gNDtcblxuXHQvLyBJbnRlcmZhY2UgbGV2ZWwgY29uc3RhbnRzXG5cdGNYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuVU5TRU5UICAgICAgICAgICAgPSBjWE1MSHR0cFJlcXVlc3QuVU5TRU5UO1xuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLk9QRU5FRCAgICAgICAgICAgID0gY1hNTEh0dHBSZXF1ZXN0Lk9QRU5FRDtcblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5IRUFERVJTX1JFQ0VJVkVEICA9IGNYTUxIdHRwUmVxdWVzdC5IRUFERVJTX1JFQ0VJVkVEO1xuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLkxPQURJTkcgICAgICAgICAgID0gY1hNTEh0dHBSZXF1ZXN0LkxPQURJTkc7XG5cdGNYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuRE9ORSAgICAgICAgICAgICAgPSBjWE1MSHR0cFJlcXVlc3QuRE9ORTtcblxuXHQvLyBQdWJsaWMgUHJvcGVydGllc1xuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLnJlYWR5U3RhdGUgICAgPSBjWE1MSHR0cFJlcXVlc3QuVU5TRU5UO1xuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLnJlc3BvbnNlVGV4dCAgPSAnJztcblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5yZXNwb25zZVhNTCAgID0gbnVsbDtcblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5zdGF0dXMgICAgICAgID0gMDtcblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5zdGF0dXNUZXh0ICAgID0gJyc7XG5cblx0Ly8gUHJpb3JpdHkgcHJvcG9zYWxcblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5wcmlvcml0eSAgICA9IFwiTk9STUFMXCI7XG5cblx0Ly8gSW5zdGFuY2UtbGV2ZWwgRXZlbnRzIEhhbmRsZXJzXG5cdGNYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUub25yZWFkeXN0YXRlY2hhbmdlICA9IG51bGw7XG5cblx0Ly8gQ2xhc3MtbGV2ZWwgRXZlbnRzIEhhbmRsZXJzXG5cdGNYTUxIdHRwUmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgID0gbnVsbDtcblx0Y1hNTEh0dHBSZXF1ZXN0Lm9ub3BlbiAgICAgICAgICAgICAgPSBudWxsO1xuXHRjWE1MSHR0cFJlcXVlc3Qub25zZW5kICAgICAgICAgICAgICA9IG51bGw7XG5cdGNYTUxIdHRwUmVxdWVzdC5vbmFib3J0ICAgICAgICAgICAgID0gbnVsbDtcblxuXHQvLyBQdWJsaWMgTWV0aG9kc1xuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLm9wZW4gID0gZnVuY3Rpb24oc01ldGhvZCwgc1VybCwgYkFzeW5jLCBzVXNlciwgc1Bhc3N3b3JkKSB7XG5cdFx0Ly8gaHR0cDovL3d3dy53My5vcmcvVFIvWE1MSHR0cFJlcXVlc3QvI3RoZS1vcGVuLW1ldGhvZFxuXHRcdHZhciBzTG93ZXJDYXNlTWV0aG9kID0gc01ldGhvZC50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmIChzTG93ZXJDYXNlTWV0aG9kID09IFwiY29ubmVjdFwiIHx8IHNMb3dlckNhc2VNZXRob2QgPT0gXCJ0cmFjZVwiIHx8IHNMb3dlckNhc2VNZXRob2QgPT0gXCJ0cmFja1wiKSB7XG5cdFx0XHQvLyBVc2luZyBhIGdlbmVyaWMgZXJyb3IgYW5kIGFuIGludCAtIG5vdCB0b28gc3VyZSBhbGwgYnJvd3NlcnMgc3VwcG9ydCBjb3JyZWN0bHlcblx0XHRcdC8vIGh0dHA6Ly9kdmNzLnczLm9yZy9oZy9kb21jb3JlL3Jhdy1maWxlL3RpcC9PdmVydmlldy5odG1sI3NlY3VyaXR5ZXJyb3IsIHNvLCB0aGlzIGlzIHNhZmVyXG5cdFx0XHQvLyBYWFggc2hvdWxkIGRvIGJldHRlciB0aGFuIHRoYXQsIGJ1dCB0aGlzIGlzIE9UIHRvIFhIUi5cblx0XHRcdHRocm93IG5ldyBFcnJvcigxOCk7XG5cdFx0fVxuXG5cdFx0Ly8gRGVsZXRlIGhlYWRlcnMsIHJlcXVpcmVkIHdoZW4gb2JqZWN0IGlzIHJldXNlZFxuXHRcdGRlbGV0ZSB0aGlzLl9oZWFkZXJzO1xuXG5cdFx0Ly8gV2hlbiBiQXN5bmMgcGFyYW1ldGVyIHZhbHVlIGlzIG9taXR0ZWQsIHVzZSB0cnVlIGFzIGRlZmF1bHRcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcblx0XHRcdGJBc3luYyAgPSB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIFNhdmUgYXN5bmMgcGFyYW1ldGVyIGZvciBmaXhpbmcgR2Vja28gYnVnIHdpdGggbWlzc2luZyByZWFkeXN0YXRlY2hhbmdlIGluIHN5bmNocm9ub3VzIHJlcXVlc3RzXG5cdFx0dGhpcy5fYXN5bmMgICA9IGJBc3luYztcblxuXHRcdC8vIFNldCB0aGUgb25yZWFkeXN0YXRlY2hhbmdlIGhhbmRsZXJcblx0XHR2YXIgb1JlcXVlc3QgID0gdGhpcztcblx0XHR2YXIgblN0YXRlICAgID0gdGhpcy5yZWFkeVN0YXRlO1xuXHRcdHZhciBmT25VbmxvYWQgPSBudWxsO1xuXG5cdFx0Ly8gQlVHRklYOiBJRSAtIG1lbW9yeSBsZWFrIG9uIHBhZ2UgdW5sb2FkIChpbnRlci1wYWdlIGxlYWspXG5cdFx0aWYgKGJJRSAmJiBiQXN5bmMpIHtcblx0XHRcdGZPblVubG9hZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoblN0YXRlICE9IGNYTUxIdHRwUmVxdWVzdC5ET05FKSB7XG5cdFx0XHRcdFx0ZkNsZWFuVHJhbnNwb3J0KG9SZXF1ZXN0KTtcblx0XHRcdFx0XHQvLyBTYWZlIHRvIGFib3J0IGhlcmUgc2luY2Ugb25yZWFkeXN0YXRlY2hhbmdlIGhhbmRsZXIgcmVtb3ZlZFxuXHRcdFx0XHRcdG9SZXF1ZXN0LmFib3J0KCk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR3aW5kb3cuYXR0YWNoRXZlbnQoXCJvbnVubG9hZFwiLCBmT25VbmxvYWQpO1xuXHRcdH1cblxuXHRcdC8vIEFkZCBtZXRob2Qgc25pZmZlclxuXHRcdGlmIChjWE1MSHR0cFJlcXVlc3Qub25vcGVuKSB7XG5cdFx0XHRjWE1MSHR0cFJlcXVlc3Qub25vcGVuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdFx0fVxuXG5cdFx0aWYgKGFyZ3VtZW50cy5sZW5ndGggPiA0KSB7XG5cdFx0XHR0aGlzLl9vYmplY3Qub3BlbihzTWV0aG9kLCBzVXJsLCBiQXN5bmMsIHNVc2VyLCBzUGFzc3dvcmQpO1xuXHRcdH0gZWxzZSBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcblx0XHRcdHRoaXMuX29iamVjdC5vcGVuKHNNZXRob2QsIHNVcmwsIGJBc3luYywgc1VzZXIpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9vYmplY3Qub3BlbihzTWV0aG9kLCBzVXJsLCBiQXN5bmMpO1xuXHRcdH1cblxuXHRcdHRoaXMucmVhZHlTdGF0ZSA9IGNYTUxIdHRwUmVxdWVzdC5PUEVORUQ7XG5cdFx0ZlJlYWR5U3RhdGVDaGFuZ2UodGhpcyk7XG5cblx0XHR0aGlzLl9vYmplY3Qub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoYkdlY2tvICYmICFiQXN5bmMpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTeW5jaHJvbml6ZSBzdGF0ZVxuXHRcdFx0b1JlcXVlc3QucmVhZHlTdGF0ZSAgID0gb1JlcXVlc3QuX29iamVjdC5yZWFkeVN0YXRlO1xuXHRcdFx0ZlN5bmNocm9uaXplVmFsdWVzKG9SZXF1ZXN0KTtcblxuXHRcdFx0Ly8gQlVHRklYOiBGaXJlZm94IGZpcmVzIHVubmVjZXNzYXJ5IERPTkUgd2hlbiBhYm9ydGluZ1xuXHRcdFx0aWYgKG9SZXF1ZXN0Ll9hYm9ydGVkKSB7XG5cdFx0XHRcdC8vIFJlc2V0IHJlYWR5U3RhdGUgdG8gVU5TRU5UXG5cdFx0XHRcdG9SZXF1ZXN0LnJlYWR5U3RhdGUgPSBjWE1MSHR0cFJlcXVlc3QuVU5TRU5UO1xuXG5cdFx0XHRcdC8vIFJldHVybiBub3dcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAob1JlcXVlc3QucmVhZHlTdGF0ZSA9PSBjWE1MSHR0cFJlcXVlc3QuRE9ORSkge1xuXHRcdFx0XHQvLyBGcmVlIHVwIHF1ZXVlXG5cdFx0XHRcdGRlbGV0ZSBvUmVxdWVzdC5fZGF0YTtcblxuXHRcdFx0XHQvLyBVbmNvbW1lbnQgdGhlc2UgbGluZXMgZm9yIGJBc3luY1xuXHRcdFx0XHQvKipcblx0XHRcdFx0ICogaWYgKGJBc3luYykge1xuXHRcdFx0XHQgKiBcdGZRdWV1ZV9yZW1vdmUob1JlcXVlc3QpO1xuXHRcdFx0XHQgKiB9XG5cdFx0XHRcdCAqL1xuXG5cdFx0XHRcdGZDbGVhblRyYW5zcG9ydChvUmVxdWVzdCk7XG5cblx0XHRcdFx0Ly8gVW5jb21tZW50IHRoaXMgYmxvY2sgaWYgeW91IG5lZWQgYSBmaXggZm9yIElFIGNhY2hlXG5cdFx0XHRcdC8qKlxuXHRcdFx0XHQgKiAvLyBCVUdGSVg6IElFIC0gY2FjaGUgaXNzdWVcblx0XHRcdFx0ICogaWYgKCFvUmVxdWVzdC5fb2JqZWN0LmdldFJlc3BvbnNlSGVhZGVyKFwiRGF0ZVwiKSkge1xuXHRcdFx0XHQgKiBcdC8vIFNhdmUgb2JqZWN0IHRvIGNhY2hlXG5cdFx0XHRcdCAqIFx0b1JlcXVlc3QuX2NhY2hlZCAgPSBvUmVxdWVzdC5fb2JqZWN0O1xuXHRcdFx0XHQgKlxuXHRcdFx0XHQgKiBcdC8vIEluc3RhbnRpYXRlIGEgbmV3IHRyYW5zcG9ydCBvYmplY3Rcblx0XHRcdFx0ICogXHRjWE1MSHR0cFJlcXVlc3QuY2FsbChvUmVxdWVzdCk7XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIFx0Ly8gUmUtc2VuZCByZXF1ZXN0XG5cdFx0XHRcdCAqIFx0aWYgKHNVc2VyKSB7XG5cdFx0XHRcdCAqIFx0XHRpZiAoc1Bhc3N3b3JkKSB7XG5cdFx0XHRcdCAqIFx0XHRcdG9SZXF1ZXN0Ll9vYmplY3Qub3BlbihzTWV0aG9kLCBzVXJsLCBiQXN5bmMsIHNVc2VyLCBzUGFzc3dvcmQpO1xuXHRcdFx0XHQgKiBcdFx0fSBlbHNlIHtcblx0XHRcdFx0ICogXHRcdFx0b1JlcXVlc3QuX29iamVjdC5vcGVuKHNNZXRob2QsIHNVcmwsIGJBc3luYyk7XG5cdFx0XHRcdCAqIFx0XHR9XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIFx0XHRvUmVxdWVzdC5fb2JqZWN0LnNldFJlcXVlc3RIZWFkZXIoXCJJZi1Nb2RpZmllZC1TaW5jZVwiLCBvUmVxdWVzdC5fY2FjaGVkLmdldFJlc3BvbnNlSGVhZGVyKFwiTGFzdC1Nb2RpZmllZFwiKSB8fCBuZXcgd2luZG93LkRhdGUoMCkpO1xuXHRcdFx0XHQgKiBcdFx0Ly8gQ29weSBoZWFkZXJzIHNldFxuXHRcdFx0XHQgKiBcdFx0aWYgKG9SZXF1ZXN0Ll9oZWFkZXJzKSB7XG5cdFx0XHRcdCAqIFx0XHRcdGZvciAodmFyIHNIZWFkZXIgaW4gb1JlcXVlc3QuX2hlYWRlcnMpIHtcblx0XHRcdFx0ICogXHRcdFx0XHQvLyBTb21lIGZyYW1ld29ya3MgcHJvdG90eXBlIG9iamVjdHMgd2l0aCBmdW5jdGlvbnNcblx0XHRcdFx0ICogXHRcdFx0XHRpZiAodHlwZW9mIG9SZXF1ZXN0Ll9oZWFkZXJzW3NIZWFkZXJdID09IFwic3RyaW5nXCIpIHtcblx0XHRcdFx0ICogXHRcdFx0XHRcdG9SZXF1ZXN0Ll9vYmplY3Quc2V0UmVxdWVzdEhlYWRlcihzSGVhZGVyLCBvUmVxdWVzdC5faGVhZGVyc1tzSGVhZGVyXSk7XG5cdFx0XHRcdCAqIFx0XHRcdFx0fVxuXHRcdFx0XHQgKiBcdFx0XHR9XG5cdFx0XHRcdCAqIFx0XHR9XG5cdFx0XHRcdCAqIFx0XHRvUmVxdWVzdC5fb2JqZWN0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQgKiBcdFx0XHQvLyBTeW5jaHJvbml6ZSBzdGF0ZVxuXHRcdFx0XHQgKiBcdFx0XHRvUmVxdWVzdC5yZWFkeVN0YXRlICAgPSBvUmVxdWVzdC5fb2JqZWN0LnJlYWR5U3RhdGU7XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIFx0XHRcdGlmIChvUmVxdWVzdC5fYWJvcnRlZCkge1xuXHRcdFx0XHQgKiBcdFx0XHRcdC8vXG5cdFx0XHRcdCAqIFx0XHRcdFx0b1JlcXVlc3QucmVhZHlTdGF0ZSA9IGNYTUxIdHRwUmVxdWVzdC5VTlNFTlQ7XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIFx0XHRcdFx0Ly8gUmV0dXJuXG5cdFx0XHRcdCAqIFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHQgKiBcdFx0XHR9XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIFx0XHRcdGlmIChvUmVxdWVzdC5yZWFkeVN0YXRlID09IGNYTUxIdHRwUmVxdWVzdC5ET05FKSB7XG5cdFx0XHRcdCAqIFx0XHRcdFx0Ly8gQ2xlYW4gT2JqZWN0XG5cdFx0XHRcdCAqIFx0XHRcdFx0ZkNsZWFuVHJhbnNwb3J0KG9SZXF1ZXN0KTtcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogXHRcdFx0XHQvLyBnZXQgY2FjaGVkIHJlcXVlc3Rcblx0XHRcdFx0ICogXHRcdFx0XHRpZiAob1JlcXVlc3Quc3RhdHVzID09IDMwNCkge1xuXHRcdFx0XHQgKiBcdFx0XHRcdFx0b1JlcXVlc3QuX29iamVjdCAgPSBvUmVxdWVzdC5fY2FjaGVkO1xuXHRcdFx0XHQgKiBcdFx0XHRcdH1cblx0XHRcdFx0ICpcblx0XHRcdFx0ICogXHRcdFx0XHQvL1xuXHRcdFx0XHQgKiBcdFx0XHRcdGRlbGV0ZSBvUmVxdWVzdC5fY2FjaGVkO1xuXHRcdFx0XHQgKlxuXHRcdFx0XHQgKiBcdFx0XHRcdC8vXG5cdFx0XHRcdCAqIFx0XHRcdFx0ZlN5bmNocm9uaXplVmFsdWVzKG9SZXF1ZXN0KTtcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogXHRcdFx0XHQvL1xuXHRcdFx0XHQgKiBcdFx0XHRcdGZSZWFkeVN0YXRlQ2hhbmdlKG9SZXF1ZXN0KTtcblx0XHRcdFx0ICpcblx0XHRcdFx0ICogXHRcdFx0XHQvLyBCVUdGSVg6IElFIC0gbWVtb3J5IGxlYWsgaW4gaW50ZXJydXB0ZWRcblx0XHRcdFx0ICogXHRcdFx0XHRpZiAoYklFICYmIGJBc3luYykge1xuXHRcdFx0XHQgKiBcdFx0XHRcdFx0d2luZG93LmRldGFjaEV2ZW50KFwib251bmxvYWRcIiwgZk9uVW5sb2FkKTtcblx0XHRcdFx0ICogXHRcdFx0XHR9XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIFx0XHRcdH1cblx0XHRcdFx0ICogXHRcdH07XG5cdFx0XHRcdCAqIFx0XHRvUmVxdWVzdC5fb2JqZWN0LnNlbmQobnVsbCk7XG5cdFx0XHRcdCAqXG5cdFx0XHRcdCAqIFx0XHQvLyBSZXR1cm4gbm93IC0gd2FpdCB1bnRpbCByZS1zZW50IHJlcXVlc3QgaXMgZmluaXNoZWRcblx0XHRcdFx0ICogXHRcdHJldHVybjtcblx0XHRcdFx0ICogXHR9O1xuXHRcdFx0XHQgKi9cblxuXHRcdFx0XHQvLyBCVUdGSVg6IElFIC0gbWVtb3J5IGxlYWsgaW4gaW50ZXJydXB0ZWRcblx0XHRcdFx0aWYgKGJJRSAmJiBiQXN5bmMpIHtcblx0XHRcdFx0XHR3aW5kb3cuZGV0YWNoRXZlbnQoXCJvbnVubG9hZFwiLCBmT25VbmxvYWQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQlVHRklYOiBTb21lIGJyb3dzZXJzIChJbnRlcm5ldCBFeHBsb3JlciwgR2Vja28pIGZpcmUgT1BFTiByZWFkeXN0YXRlIHR3aWNlXG5cdFx0XHRcdGlmIChuU3RhdGUgIT0gb1JlcXVlc3QucmVhZHlTdGF0ZSkge1xuXHRcdFx0XHRcdGZSZWFkeVN0YXRlQ2hhbmdlKG9SZXF1ZXN0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdG5TdGF0ZSAgPSBvUmVxdWVzdC5yZWFkeVN0YXRlO1xuXHRcdFx0fVxuXHRcdH07XG5cdH07XG5cblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24odkRhdGEpIHtcblx0XHQvLyBBZGQgbWV0aG9kIHNuaWZmZXJcblx0XHRpZiAoY1hNTEh0dHBSZXF1ZXN0Lm9uc2VuZCkge1xuXHRcdFx0Y1hNTEh0dHBSZXF1ZXN0Lm9uc2VuZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXHRcdH1cblxuXHRcdGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuXHRcdFx0dkRhdGEgPSBudWxsO1xuXHRcdH1cblxuXHRcdC8vIEJVR0ZJWDogU2FmYXJpIC0gZmFpbHMgc2VuZGluZyBkb2N1bWVudHMgY3JlYXRlZC9tb2RpZmllZCBkeW5hbWljYWxseSwgc28gYW4gZXhwbGljaXQgc2VyaWFsaXphdGlvbiByZXF1aXJlZFxuXHRcdC8vIEJVR0ZJWDogSUUgLSByZXdyaXRlcyBhbnkgY3VzdG9tIG1pbWUtdHlwZSB0byBcInRleHQveG1sXCIgaW4gY2FzZSBhbiBYTUxOb2RlIGlzIHNlbnRcblx0XHQvLyBCVUdGSVg6IEdlY2tvIC0gZmFpbHMgc2VuZGluZyBFbGVtZW50ICh0aGlzIGlzIHVwIHRvIHRoZSBpbXBsZW1lbnRhdGlvbiBlaXRoZXIgdG8gc3RhbmRhcmQpXG5cdFx0aWYgKHZEYXRhICYmIHZEYXRhLm5vZGVUeXBlKSB7XG5cdFx0XHR2RGF0YSA9IHdpbmRvdy5YTUxTZXJpYWxpemVyID8gbmV3IHdpbmRvdy5YTUxTZXJpYWxpemVyKCkuc2VyaWFsaXplVG9TdHJpbmcodkRhdGEpIDogdkRhdGEueG1sO1xuXHRcdFx0aWYgKCF0aGlzLl9oZWFkZXJzW1wiQ29udGVudC1UeXBlXCJdKSB7XG5cdFx0XHRcdHRoaXMuX29iamVjdC5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24veG1sXCIpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX2RhdGEgPSB2RGF0YTtcblxuXHRcdC8qKlxuXHRcdCAqIC8vIEFkZCB0byBxdWV1ZVxuXHRcdCAqIGlmICh0aGlzLl9hc3luYykge1xuXHRcdCAqIFx0ZlF1ZXVlX2FkZCh0aGlzKTtcblx0XHQgKiB9IGVsc2UgeyAqL1xuXHRcdGZYTUxIdHRwUmVxdWVzdF9zZW5kKHRoaXMpO1xuXHRcdCAvKipcblx0XHQgKiB9XG5cdFx0ICovXG5cdH07XG5cblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5hYm9ydCA9IGZ1bmN0aW9uKCkge1xuXHRcdC8vIEFkZCBtZXRob2Qgc25pZmZlclxuXHRcdGlmIChjWE1MSHR0cFJlcXVlc3Qub25hYm9ydCkge1xuXHRcdFx0Y1hNTEh0dHBSZXF1ZXN0Lm9uYWJvcnQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHR9XG5cblx0XHQvLyBCVUdGSVg6IEdlY2tvIC0gdW5uZWNlc3NhcnkgRE9ORSB3aGVuIGFib3J0aW5nXG5cdFx0aWYgKHRoaXMucmVhZHlTdGF0ZSA+IGNYTUxIdHRwUmVxdWVzdC5VTlNFTlQpIHtcblx0XHRcdHRoaXMuX2Fib3J0ZWQgPSB0cnVlO1xuXHRcdH1cblxuXHRcdHRoaXMuX29iamVjdC5hYm9ydCgpO1xuXG5cdFx0Ly8gQlVHRklYOiBJRSAtIG1lbW9yeSBsZWFrXG5cdFx0ZkNsZWFuVHJhbnNwb3J0KHRoaXMpO1xuXG5cdFx0dGhpcy5yZWFkeVN0YXRlID0gY1hNTEh0dHBSZXF1ZXN0LlVOU0VOVDtcblxuXHRcdGRlbGV0ZSB0aGlzLl9kYXRhO1xuXG5cdFx0LyogaWYgKHRoaXMuX2FzeW5jKSB7XG5cdCBcdCogXHRmUXVldWVfcmVtb3ZlKHRoaXMpO1xuXHQgXHQqIH1cblx0IFx0Ki9cblx0fTtcblxuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLmdldEFsbFJlc3BvbnNlSGVhZGVycyA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9vYmplY3QuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCk7XG5cdH07XG5cblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5nZXRSZXNwb25zZUhlYWRlciA9IGZ1bmN0aW9uKHNOYW1lKSB7XG5cdFx0cmV0dXJuIHRoaXMuX29iamVjdC5nZXRSZXNwb25zZUhlYWRlcihzTmFtZSk7XG5cdH07XG5cblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS5zZXRSZXF1ZXN0SGVhZGVyICA9IGZ1bmN0aW9uKHNOYW1lLCBzVmFsdWUpIHtcblx0XHQvLyBCVUdGSVg6IElFIC0gY2FjaGUgaXNzdWVcblx0XHRpZiAoIXRoaXMuX2hlYWRlcnMpIHtcblx0XHRcdHRoaXMuX2hlYWRlcnMgPSB7fTtcblx0XHR9XG5cblx0XHR0aGlzLl9oZWFkZXJzW3NOYW1lXSAgPSBzVmFsdWU7XG5cblx0XHRyZXR1cm4gdGhpcy5fb2JqZWN0LnNldFJlcXVlc3RIZWFkZXIoc05hbWUsIHNWYWx1ZSk7XG5cdH07XG5cblx0Ly8gRXZlbnRUYXJnZXQgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG5cdGNYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciAgPSBmdW5jdGlvbihzTmFtZSwgZkhhbmRsZXIsIGJVc2VDYXB0dXJlKSB7XG5cdFx0Zm9yICh2YXIgbkluZGV4ID0gMCwgb0xpc3RlbmVyOyBvTGlzdGVuZXIgPSB0aGlzLl9saXN0ZW5lcnNbbkluZGV4XTsgbkluZGV4KyspIHtcblx0XHRcdGlmIChvTGlzdGVuZXJbMF0gPT0gc05hbWUgJiYgb0xpc3RlbmVyWzFdID09IGZIYW5kbGVyICYmIG9MaXN0ZW5lclsyXSA9PSBiVXNlQ2FwdHVyZSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gQWRkIGxpc3RlbmVyXG5cdFx0dGhpcy5fbGlzdGVuZXJzLnB1c2goW3NOYW1lLCBmSGFuZGxlciwgYlVzZUNhcHR1cmVdKTtcblx0fTtcblxuXHRjWE1MSHR0cFJlcXVlc3QucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihzTmFtZSwgZkhhbmRsZXIsIGJVc2VDYXB0dXJlKSB7XG5cdFx0Zm9yICh2YXIgbkluZGV4ID0gMCwgb0xpc3RlbmVyOyBvTGlzdGVuZXIgPSB0aGlzLl9saXN0ZW5lcnNbbkluZGV4XTsgbkluZGV4KyspIHtcblx0XHRcdGlmIChvTGlzdGVuZXJbMF0gPT0gc05hbWUgJiYgb0xpc3RlbmVyWzFdID09IGZIYW5kbGVyICYmIG9MaXN0ZW5lclsyXSA9PSBiVXNlQ2FwdHVyZSkge1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBSZW1vdmUgbGlzdGVuZXJcblx0XHRpZiAob0xpc3RlbmVyKSB7XG5cdFx0XHR0aGlzLl9saXN0ZW5lcnMuc3BsaWNlKG5JbmRleCwgMSk7XG5cdFx0fVxuXHR9O1xuXG5cdGNYTUxIdHRwUmVxdWVzdC5wcm90b3R5cGUuZGlzcGF0Y2hFdmVudCA9IGZ1bmN0aW9uKG9FdmVudCkge1xuXHRcdHZhciBvRXZlbnRQc2V1ZG8gID0ge1xuXHRcdFx0J3R5cGUnOiAgICAgICAgICAgICBvRXZlbnQudHlwZSxcblx0XHRcdCd0YXJnZXQnOiAgICAgICAgICAgdGhpcyxcblx0XHRcdCdjdXJyZW50VGFyZ2V0JzogICAgdGhpcyxcblx0XHRcdCdldmVudFBoYXNlJzogICAgICAgMixcblx0XHRcdCdidWJibGVzJzogICAgICAgICAgb0V2ZW50LmJ1YmJsZXMsXG5cdFx0XHQnY2FuY2VsYWJsZSc6ICAgICAgIG9FdmVudC5jYW5jZWxhYmxlLFxuXHRcdFx0J3RpbWVTdGFtcCc6ICAgICAgICBvRXZlbnQudGltZVN0YW1wLFxuXHRcdFx0J3N0b3BQcm9wYWdhdGlvbic6ICBmdW5jdGlvbigpIHt9LCAgLy8gVGhlcmUgaXMgbm8gZmxvd1xuXHRcdFx0J3ByZXZlbnREZWZhdWx0JzogICBmdW5jdGlvbigpIHt9LCAgLy8gVGhlcmUgaXMgbm8gZGVmYXVsdCBhY3Rpb25cblx0XHRcdCdpbml0RXZlbnQnOiAgICAgICAgZnVuY3Rpb24oKSB7fSAgIC8vIE9yaWdpbmFsIGV2ZW50IG9iamVjdCBzaG91bGQgYmUgaW5pdGlhbGl6ZWRcblx0XHR9O1xuXG5cdFx0Ly8gRXhlY3V0ZSBvbnJlYWR5c3RhdGVjaGFuZ2Vcblx0XHRpZiAob0V2ZW50UHNldWRvLnR5cGUgPT0gXCJyZWFkeXN0YXRlY2hhbmdlXCIgJiYgdGhpcy5vbnJlYWR5c3RhdGVjaGFuZ2UpIHtcblx0XHRcdCh0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZS5oYW5kbGVFdmVudCB8fCB0aGlzLm9ucmVhZHlzdGF0ZWNoYW5nZSkuYXBwbHkodGhpcywgW29FdmVudFBzZXVkb10pO1xuXHRcdH1cblxuXG5cdFx0Ly8gRXhlY3V0ZSBsaXN0ZW5lcnNcblx0XHRmb3IgKHZhciBuSW5kZXggPSAwLCBvTGlzdGVuZXI7IG9MaXN0ZW5lciA9IHRoaXMuX2xpc3RlbmVyc1tuSW5kZXhdOyBuSW5kZXgrKykge1xuXHRcdFx0aWYgKG9MaXN0ZW5lclswXSA9PSBvRXZlbnRQc2V1ZG8udHlwZSAmJiAhb0xpc3RlbmVyWzJdKSB7XG5cdFx0XHRcdChvTGlzdGVuZXJbMV0uaGFuZGxlRXZlbnQgfHwgb0xpc3RlbmVyWzFdKS5hcHBseSh0aGlzLCBbb0V2ZW50UHNldWRvXSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdH07XG5cblx0Ly9cblx0Y1hNTEh0dHBSZXF1ZXN0LnByb3RvdHlwZS50b1N0cmluZyAgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJ1snICsgXCJvYmplY3RcIiArICcgJyArIFwiWE1MSHR0cFJlcXVlc3RcIiArICddJztcblx0fTtcblxuXHRjWE1MSHR0cFJlcXVlc3QudG9TdHJpbmcgID0gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuICdbJyArIFwiWE1MSHR0cFJlcXVlc3RcIiArICddJztcblx0fTtcblxuXHQvKipcblx0ICogLy8gUXVldWUgbWFuYWdlclxuXHQgKiB2YXIgb1F1ZXVlUGVuZGluZyA9IHtcIkNSSVRJQ0FMXCI6W10sXCJISUdIXCI6W10sXCJOT1JNQUxcIjpbXSxcIkxPV1wiOltdLFwiTE9XRVNUXCI6W119LFxuXHQgKiBhUXVldWVSdW5uaW5nID0gW107XG5cdCAqIGZ1bmN0aW9uIGZRdWV1ZV9hZGQob1JlcXVlc3QpIHtcblx0ICogXHRvUXVldWVQZW5kaW5nW29SZXF1ZXN0LnByaW9yaXR5IGluIG9RdWV1ZVBlbmRpbmcgPyBvUmVxdWVzdC5wcmlvcml0eSA6IFwiTk9STUFMXCJdLnB1c2gob1JlcXVlc3QpO1xuXHQgKiBcdC8vXG5cdCAqIFx0c2V0VGltZW91dChmUXVldWVfcHJvY2Vzcyk7XG5cdCAqIH07XG5cdCAqXG5cdCAqIGZ1bmN0aW9uIGZRdWV1ZV9yZW1vdmUob1JlcXVlc3QpIHtcblx0ICogXHRmb3IgKHZhciBuSW5kZXggPSAwLCBiRm91bmQgPSBmYWxzZTsgbkluZGV4IDwgYVF1ZXVlUnVubmluZy5sZW5ndGg7IG5JbmRleCsrKVxuXHQgKiBcdGlmIChiRm91bmQpIHtcblx0ICogXHRcdGFRdWV1ZVJ1bm5pbmdbbkluZGV4IC0gMV0gPSBhUXVldWVSdW5uaW5nW25JbmRleF07XG5cdCAqIFx0fSBlbHNlIHtcblx0ICogXHRcdGlmIChhUXVldWVSdW5uaW5nW25JbmRleF0gPT0gb1JlcXVlc3QpIHtcblx0ICogXHRcdFx0YkZvdW5kICA9IHRydWU7XG5cdCAqIFx0XHR9XG5cdCAqIH1cblx0ICpcblx0ICogXHRpZiAoYkZvdW5kKSB7XG5cdCAqIFx0XHRhUXVldWVSdW5uaW5nLmxlbmd0aC0tO1xuXHQgKiBcdH1cblx0ICpcblx0ICpcblx0ICogXHQvL1xuXHQgKiBcdHNldFRpbWVvdXQoZlF1ZXVlX3Byb2Nlc3MpO1xuXHQgKiB9O1xuXHQgKlxuXHQgKiBmdW5jdGlvbiBmUXVldWVfcHJvY2VzcygpIHtcblx0ICogaWYgKGFRdWV1ZVJ1bm5pbmcubGVuZ3RoIDwgNikge1xuXHQgKiBmb3IgKHZhciBzUHJpb3JpdHkgaW4gb1F1ZXVlUGVuZGluZykge1xuXHQgKiBpZiAob1F1ZXVlUGVuZGluZ1tzUHJpb3JpdHldLmxlbmd0aCkge1xuXHQgKiB2YXIgb1JlcXVlc3QgID0gb1F1ZXVlUGVuZGluZ1tzUHJpb3JpdHldWzBdO1xuXHQgKiBvUXVldWVQZW5kaW5nW3NQcmlvcml0eV0gID0gb1F1ZXVlUGVuZGluZ1tzUHJpb3JpdHldLnNsaWNlKDEpO1xuXHQgKiAvL1xuXHQgKiBhUXVldWVSdW5uaW5nLnB1c2gob1JlcXVlc3QpO1xuXHQgKiAvLyBTZW5kIHJlcXVlc3Rcblx0ICogZlhNTEh0dHBSZXF1ZXN0X3NlbmQob1JlcXVlc3QpO1xuXHQgKiBicmVhaztcblx0ICogfVxuXHQgKiB9XG5cdCAqIH1cblx0ICogfTtcblx0ICovXG5cblx0Ly8gSGVscGVyIGZ1bmN0aW9uXG5cdGZ1bmN0aW9uIGZYTUxIdHRwUmVxdWVzdF9zZW5kKG9SZXF1ZXN0KSB7XG5cdFx0b1JlcXVlc3QuX29iamVjdC5zZW5kKG9SZXF1ZXN0Ll9kYXRhKTtcblxuXHRcdC8vIEJVR0ZJWDogR2Vja28gLSBtaXNzaW5nIHJlYWR5c3RhdGVjaGFuZ2UgY2FsbHMgaW4gc3luY2hyb25vdXMgcmVxdWVzdHNcblx0XHRpZiAoYkdlY2tvICYmICFvUmVxdWVzdC5fYXN5bmMpIHtcblx0XHRcdG9SZXF1ZXN0LnJlYWR5U3RhdGUgPSBjWE1MSHR0cFJlcXVlc3QuT1BFTkVEO1xuXG5cdFx0XHQvLyBTeW5jaHJvbml6ZSBzdGF0ZVxuXHRcdFx0ZlN5bmNocm9uaXplVmFsdWVzKG9SZXF1ZXN0KTtcblxuXHRcdFx0Ly8gU2ltdWxhdGUgbWlzc2luZyBzdGF0ZXNcblx0XHRcdHdoaWxlIChvUmVxdWVzdC5yZWFkeVN0YXRlIDwgY1hNTEh0dHBSZXF1ZXN0LkRPTkUpIHtcblx0XHRcdFx0b1JlcXVlc3QucmVhZHlTdGF0ZSsrO1xuXHRcdFx0XHRmUmVhZHlTdGF0ZUNoYW5nZShvUmVxdWVzdCk7XG5cdFx0XHRcdC8vIENoZWNrIGlmIHdlIGFyZSBhYm9ydGVkXG5cdFx0XHRcdGlmIChvUmVxdWVzdC5fYWJvcnRlZCkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGZSZWFkeVN0YXRlQ2hhbmdlKG9SZXF1ZXN0KSB7XG5cdFx0Ly8gU25pZmZpbmcgY29kZVxuXHRcdGlmIChjWE1MSHR0cFJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlKXtcblx0XHRcdGNYTUxIdHRwUmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UuYXBwbHkob1JlcXVlc3QpO1xuXHRcdH1cblxuXG5cdFx0Ly8gRmFrZSBldmVudFxuXHRcdG9SZXF1ZXN0LmRpc3BhdGNoRXZlbnQoe1xuXHRcdFx0J3R5cGUnOiAgICAgICBcInJlYWR5c3RhdGVjaGFuZ2VcIixcblx0XHRcdCdidWJibGVzJzogICAgZmFsc2UsXG5cdFx0XHQnY2FuY2VsYWJsZSc6IGZhbHNlLFxuXHRcdFx0J3RpbWVTdGFtcCc6ICBuZXcgRGF0ZSArIDBcblx0XHR9KTtcblx0fVxuXG5cdGZ1bmN0aW9uIGZHZXREb2N1bWVudChvUmVxdWVzdCkge1xuXHRcdHZhciBvRG9jdW1lbnQgPSBvUmVxdWVzdC5yZXNwb25zZVhNTDtcblx0XHR2YXIgc1Jlc3BvbnNlID0gb1JlcXVlc3QucmVzcG9uc2VUZXh0O1xuXHRcdC8vIFRyeSBwYXJzaW5nIHJlc3BvbnNlVGV4dFxuXHRcdGlmIChiSUUgJiYgc1Jlc3BvbnNlICYmIG9Eb2N1bWVudCAmJiAhb0RvY3VtZW50LmRvY3VtZW50RWxlbWVudCAmJiBvUmVxdWVzdC5nZXRSZXNwb25zZUhlYWRlcihcIkNvbnRlbnQtVHlwZVwiKS5tYXRjaCgvW15cXC9dK1xcL1teXFwrXStcXCt4bWwvKSkge1xuXHRcdFx0b0RvY3VtZW50ID0gbmV3IHdpbmRvdy5BY3RpdmVYT2JqZWN0KFwiTWljcm9zb2Z0LlhNTERPTVwiKTtcblx0XHRcdG9Eb2N1bWVudC5hc3luYyAgICAgICA9IGZhbHNlO1xuXHRcdFx0b0RvY3VtZW50LnZhbGlkYXRlT25QYXJzZSA9IGZhbHNlO1xuXHRcdFx0b0RvY3VtZW50LmxvYWRYTUwoc1Jlc3BvbnNlKTtcblx0XHR9XG5cblx0XHQvLyBDaGVjayBpZiB0aGVyZSBpcyBubyBlcnJvciBpbiBkb2N1bWVudFxuXHRcdGlmIChvRG9jdW1lbnQpe1xuXHRcdFx0aWYgKChiSUUgJiYgb0RvY3VtZW50LnBhcnNlRXJyb3IgIT09IDApIHx8ICFvRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50IHx8IChvRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmIG9Eb2N1bWVudC5kb2N1bWVudEVsZW1lbnQudGFnTmFtZSA9PSBcInBhcnNlcmVycm9yXCIpKSB7XG5cdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gb0RvY3VtZW50O1xuXHR9XG5cblx0ZnVuY3Rpb24gZlN5bmNocm9uaXplVmFsdWVzKG9SZXF1ZXN0KSB7XG5cdFx0dHJ5IHsgb1JlcXVlc3QucmVzcG9uc2VUZXh0ID0gb1JlcXVlc3QuX29iamVjdC5yZXNwb25zZVRleHQ7ICB9IGNhdGNoIChlKSB7fVxuXHRcdHRyeSB7IG9SZXF1ZXN0LnJlc3BvbnNlWE1MICA9IGZHZXREb2N1bWVudChvUmVxdWVzdC5fb2JqZWN0KTsgfSBjYXRjaCAoZSkge31cblx0XHR0cnkgeyBvUmVxdWVzdC5zdGF0dXMgICAgICAgPSBvUmVxdWVzdC5fb2JqZWN0LnN0YXR1czsgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG5cdFx0dHJ5IHsgb1JlcXVlc3Quc3RhdHVzVGV4dCAgID0gb1JlcXVlc3QuX29iamVjdC5zdGF0dXNUZXh0OyAgICB9IGNhdGNoIChlKSB7fVxuXHR9XG5cblx0ZnVuY3Rpb24gZkNsZWFuVHJhbnNwb3J0KG9SZXF1ZXN0KSB7XG5cdFx0Ly8gQlVHRklYOiBJRSAtIG1lbW9yeSBsZWFrIChvbi1wYWdlIGxlYWspXG5cdFx0b1JlcXVlc3QuX29iamVjdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBuZXcgd2luZG93LkZ1bmN0aW9uO1xuXHR9XG5cblx0Ly8gSW50ZXJuZXQgRXhwbG9yZXIgNS4wIChtaXNzaW5nIGFwcGx5KVxuXHRpZiAoIXdpbmRvdy5GdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkpIHtcblx0XHR3aW5kb3cuRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5ID0gZnVuY3Rpb24ob1JlcXVlc3QsIG9Bcmd1bWVudHMpIHtcblx0XHRcdGlmICghb0FyZ3VtZW50cykge1xuXHRcdFx0XHRvQXJndW1lbnRzICA9IFtdO1xuXHRcdFx0fVxuXHRcdFx0b1JlcXVlc3QuX19mdW5jID0gdGhpcztcblx0XHRcdG9SZXF1ZXN0Ll9fZnVuYyhvQXJndW1lbnRzWzBdLCBvQXJndW1lbnRzWzFdLCBvQXJndW1lbnRzWzJdLCBvQXJndW1lbnRzWzNdLCBvQXJndW1lbnRzWzRdKTtcblx0XHRcdGRlbGV0ZSBvUmVxdWVzdC5fX2Z1bmM7XG5cdFx0fTtcblx0fVxuXG5cdC8vIFJlZ2lzdGVyIG5ldyBvYmplY3Qgd2l0aCB3aW5kb3dcblx0d2luZG93LlhNTEh0dHBSZXF1ZXN0ID0gY1hNTEh0dHBSZXF1ZXN0O1xuXG59KSgpO1xuXG4gICAgLy8gRW5kIGJyb3dzZXIgZmlsZTogWE1MSHR0cFJlcXVlc3QuanNcbiAgfVxufSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9KTtcbiIsIi8qXG4gTGVhZmxldCwgYSBKYXZhU2NyaXB0IGxpYnJhcnkgZm9yIG1vYmlsZS1mcmllbmRseSBpbnRlcmFjdGl2ZSBtYXBzLiBodHRwOi8vbGVhZmxldGpzLmNvbVxuIChjKSAyMDEwLTIwMTMsIFZsYWRpbWlyIEFnYWZvbmtpblxuIChjKSAyMDEwLTIwMTEsIENsb3VkTWFkZVxuKi9cbiFmdW5jdGlvbih0LGUsaSl7dmFyIG49dC5MLG89e307by52ZXJzaW9uPVwiMC42LjRcIixcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlJiZcIm9iamVjdFwiPT10eXBlb2YgbW9kdWxlLmV4cG9ydHM/bW9kdWxlLmV4cG9ydHM9bzpcImZ1bmN0aW9uXCI9PXR5cGVvZiBkZWZpbmUmJmRlZmluZS5hbWQmJmRlZmluZShvKSxvLm5vQ29uZmxpY3Q9ZnVuY3Rpb24oKXtyZXR1cm4gdC5MPW4sdGhpc30sdC5MPW8sby5VdGlsPXtleHRlbmQ6ZnVuY3Rpb24odCl7dmFyIGUsaSxuLG8scz1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSk7Zm9yKGk9MCxuPXMubGVuZ3RoO24+aTtpKyspe289c1tpXXx8e307Zm9yKGUgaW4gbylvLmhhc093blByb3BlcnR5KGUpJiYodFtlXT1vW2VdKX1yZXR1cm4gdH0sYmluZDpmdW5jdGlvbih0LGUpe3ZhciBpPWFyZ3VtZW50cy5sZW5ndGg+Mj9BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMik6bnVsbDtyZXR1cm4gZnVuY3Rpb24oKXtyZXR1cm4gdC5hcHBseShlLGl8fGFyZ3VtZW50cyl9fSxzdGFtcDpmdW5jdGlvbigpe3ZhciB0PTAsZT1cIl9sZWFmbGV0X2lkXCI7cmV0dXJuIGZ1bmN0aW9uKGkpe3JldHVybiBpW2VdPWlbZV18fCsrdCxpW2VdfX0oKSxpbnZva2VFYWNoOmZ1bmN0aW9uKHQsZSxpKXt2YXIgbixvO2lmKFwib2JqZWN0XCI9PXR5cGVvZiB0KXtvPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywzKTtmb3IobiBpbiB0KWUuYXBwbHkoaSxbbix0W25dXS5jb25jYXQobykpO3JldHVybiEwfXJldHVybiExfSxsaW1pdEV4ZWNCeUludGVydmFsOmZ1bmN0aW9uKHQsZSxpKXt2YXIgbixvO3JldHVybiBmdW5jdGlvbiBzKCl7dmFyIGE9YXJndW1lbnRzO3JldHVybiBuPyhvPSEwLHZvaWQgMCk6KG49ITAsc2V0VGltZW91dChmdW5jdGlvbigpe249ITEsbyYmKHMuYXBwbHkoaSxhKSxvPSExKX0sZSksdC5hcHBseShpLGEpLHZvaWQgMCl9fSxmYWxzZUZuOmZ1bmN0aW9uKCl7cmV0dXJuITF9LGZvcm1hdE51bTpmdW5jdGlvbih0LGUpe3ZhciBpPU1hdGgucG93KDEwLGV8fDUpO3JldHVybiBNYXRoLnJvdW5kKHQqaSkvaX0sdHJpbTpmdW5jdGlvbih0KXtyZXR1cm4gdC50cmltP3QudHJpbSgpOnQucmVwbGFjZSgvXlxccyt8XFxzKyQvZyxcIlwiKX0sc3BsaXRXb3JkczpmdW5jdGlvbih0KXtyZXR1cm4gby5VdGlsLnRyaW0odCkuc3BsaXQoL1xccysvKX0sc2V0T3B0aW9uczpmdW5jdGlvbih0LGUpe3JldHVybiB0Lm9wdGlvbnM9by5leHRlbmQoe30sdC5vcHRpb25zLGUpLHQub3B0aW9uc30sZ2V0UGFyYW1TdHJpbmc6ZnVuY3Rpb24odCxlLGkpe3ZhciBuPVtdO2Zvcih2YXIgbyBpbiB0KW4ucHVzaChlbmNvZGVVUklDb21wb25lbnQoaT9vLnRvVXBwZXJDYXNlKCk6bykrXCI9XCIrZW5jb2RlVVJJQ29tcG9uZW50KHRbb10pKTtyZXR1cm4oZSYmLTEhPT1lLmluZGV4T2YoXCI/XCIpP1wiJlwiOlwiP1wiKStuLmpvaW4oXCImXCIpfSx0ZW1wbGF0ZTpmdW5jdGlvbih0LGUpe3JldHVybiB0LnJlcGxhY2UoL1xceyAqKFtcXHdfXSspICpcXH0vZyxmdW5jdGlvbih0LG4pe3ZhciBvPWVbbl07aWYobz09PWkpdGhyb3cgbmV3IEVycm9yKFwiTm8gdmFsdWUgcHJvdmlkZWQgZm9yIHZhcmlhYmxlIFwiK3QpO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIG8mJihvPW8oZSkpLG99KX0saXNBcnJheTpmdW5jdGlvbih0KXtyZXR1cm5cIltvYmplY3QgQXJyYXldXCI9PT1PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodCl9LGVtcHR5SW1hZ2VVcmw6XCJkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhBUUFCQUFEL0FDd0FBQUFBQVFBQkFBQUNBRHM9XCJ9LGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZShlKXt2YXIgaSxuLG89W1wid2Via2l0XCIsXCJtb3pcIixcIm9cIixcIm1zXCJdO2ZvcihpPTA7aTxvLmxlbmd0aCYmIW47aSsrKW49dFtvW2ldK2VdO3JldHVybiBufWZ1bmN0aW9uIGkoZSl7dmFyIGk9K25ldyBEYXRlLG89TWF0aC5tYXgoMCwxNi0oaS1uKSk7cmV0dXJuIG49aStvLHQuc2V0VGltZW91dChlLG8pfXZhciBuPTAscz10LnJlcXVlc3RBbmltYXRpb25GcmFtZXx8ZShcIlJlcXVlc3RBbmltYXRpb25GcmFtZVwiKXx8aSxhPXQuY2FuY2VsQW5pbWF0aW9uRnJhbWV8fGUoXCJDYW5jZWxBbmltYXRpb25GcmFtZVwiKXx8ZShcIkNhbmNlbFJlcXVlc3RBbmltYXRpb25GcmFtZVwiKXx8ZnVuY3Rpb24oZSl7dC5jbGVhclRpbWVvdXQoZSl9O28uVXRpbC5yZXF1ZXN0QW5pbUZyYW1lPWZ1bmN0aW9uKGUsbixhLHIpe3JldHVybiBlPW8uYmluZChlLG4pLGEmJnM9PT1pPyhlKCksdm9pZCAwKTpzLmNhbGwodCxlLHIpfSxvLlV0aWwuY2FuY2VsQW5pbUZyYW1lPWZ1bmN0aW9uKGUpe2UmJmEuY2FsbCh0LGUpfX0oKSxvLmV4dGVuZD1vLlV0aWwuZXh0ZW5kLG8uYmluZD1vLlV0aWwuYmluZCxvLnN0YW1wPW8uVXRpbC5zdGFtcCxvLnNldE9wdGlvbnM9by5VdGlsLnNldE9wdGlvbnMsby5DbGFzcz1mdW5jdGlvbigpe30sby5DbGFzcy5leHRlbmQ9ZnVuY3Rpb24odCl7dmFyIGU9ZnVuY3Rpb24oKXt0aGlzLmluaXRpYWxpemUmJnRoaXMuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyksdGhpcy5faW5pdEhvb2tzJiZ0aGlzLmNhbGxJbml0SG9va3MoKX0saT1mdW5jdGlvbigpe307aS5wcm90b3R5cGU9dGhpcy5wcm90b3R5cGU7dmFyIG49bmV3IGk7bi5jb25zdHJ1Y3Rvcj1lLGUucHJvdG90eXBlPW47Zm9yKHZhciBzIGluIHRoaXMpdGhpcy5oYXNPd25Qcm9wZXJ0eShzKSYmXCJwcm90b3R5cGVcIiE9PXMmJihlW3NdPXRoaXNbc10pO3Quc3RhdGljcyYmKG8uZXh0ZW5kKGUsdC5zdGF0aWNzKSxkZWxldGUgdC5zdGF0aWNzKSx0LmluY2x1ZGVzJiYoby5VdGlsLmV4dGVuZC5hcHBseShudWxsLFtuXS5jb25jYXQodC5pbmNsdWRlcykpLGRlbGV0ZSB0LmluY2x1ZGVzKSx0Lm9wdGlvbnMmJm4ub3B0aW9ucyYmKHQub3B0aW9ucz1vLmV4dGVuZCh7fSxuLm9wdGlvbnMsdC5vcHRpb25zKSksby5leHRlbmQobix0KSxuLl9pbml0SG9va3M9W107dmFyIGE9dGhpcztyZXR1cm4gZS5fX3N1cGVyX189YS5wcm90b3R5cGUsbi5jYWxsSW5pdEhvb2tzPWZ1bmN0aW9uKCl7aWYoIXRoaXMuX2luaXRIb29rc0NhbGxlZCl7YS5wcm90b3R5cGUuY2FsbEluaXRIb29rcyYmYS5wcm90b3R5cGUuY2FsbEluaXRIb29rcy5jYWxsKHRoaXMpLHRoaXMuX2luaXRIb29rc0NhbGxlZD0hMDtmb3IodmFyIHQ9MCxlPW4uX2luaXRIb29rcy5sZW5ndGg7ZT50O3QrKyluLl9pbml0SG9va3NbdF0uY2FsbCh0aGlzKX19LGV9LG8uQ2xhc3MuaW5jbHVkZT1mdW5jdGlvbih0KXtvLmV4dGVuZCh0aGlzLnByb3RvdHlwZSx0KX0sby5DbGFzcy5tZXJnZU9wdGlvbnM9ZnVuY3Rpb24odCl7by5leHRlbmQodGhpcy5wcm90b3R5cGUub3B0aW9ucyx0KX0sby5DbGFzcy5hZGRJbml0SG9vaz1mdW5jdGlvbih0KXt2YXIgZT1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMSksaT1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0P3Q6ZnVuY3Rpb24oKXt0aGlzW3RdLmFwcGx5KHRoaXMsZSl9O3RoaXMucHJvdG90eXBlLl9pbml0SG9va3M9dGhpcy5wcm90b3R5cGUuX2luaXRIb29rc3x8W10sdGhpcy5wcm90b3R5cGUuX2luaXRIb29rcy5wdXNoKGkpfTt2YXIgcz1cIl9sZWFmbGV0X2V2ZW50c1wiO28uTWl4aW49e30sby5NaXhpbi5FdmVudHM9e2FkZEV2ZW50TGlzdGVuZXI6ZnVuY3Rpb24odCxlLGkpe2lmKG8uVXRpbC5pbnZva2VFYWNoKHQsdGhpcy5hZGRFdmVudExpc3RlbmVyLHRoaXMsZSxpKSlyZXR1cm4gdGhpczt2YXIgbixhLHIsaCxsLHUsYyxkPXRoaXNbc109dGhpc1tzXXx8e30scD1pJiZvLnN0YW1wKGkpO2Zvcih0PW8uVXRpbC5zcGxpdFdvcmRzKHQpLG49MCxhPXQubGVuZ3RoO2E+bjtuKyspcj17YWN0aW9uOmUsY29udGV4dDppfHx0aGlzfSxoPXRbbl0saT8obD1oK1wiX2lkeFwiLHU9bCtcIl9sZW5cIixjPWRbbF09ZFtsXXx8e30sY1twXXx8KGNbcF09W10sZFt1XT0oZFt1XXx8MCkrMSksY1twXS5wdXNoKHIpKTooZFtoXT1kW2hdfHxbXSxkW2hdLnB1c2gocikpO3JldHVybiB0aGlzfSxoYXNFdmVudExpc3RlbmVyczpmdW5jdGlvbih0KXt2YXIgZT10aGlzW3NdO3JldHVybiEhZSYmKHQgaW4gZSYmZVt0XS5sZW5ndGg+MHx8dCtcIl9pZHhcImluIGUmJmVbdCtcIl9pZHhfbGVuXCJdPjApfSxyZW1vdmVFdmVudExpc3RlbmVyOmZ1bmN0aW9uKHQsZSxpKXtpZighdGhpc1tzXSlyZXR1cm4gdGhpcztpZighdClyZXR1cm4gdGhpcy5jbGVhckFsbEV2ZW50TGlzdGVuZXJzKCk7aWYoby5VdGlsLmludm9rZUVhY2godCx0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIsdGhpcyxlLGkpKXJldHVybiB0aGlzO3ZhciBuLGEscixoLGwsdSxjLGQscCxfPXRoaXNbc10sbT1pJiZvLnN0YW1wKGkpO2Zvcih0PW8uVXRpbC5zcGxpdFdvcmRzKHQpLG49MCxhPXQubGVuZ3RoO2E+bjtuKyspaWYocj10W25dLHU9citcIl9pZHhcIixjPXUrXCJfbGVuXCIsZD1fW3VdLGUpe2lmKGg9aSYmZD9kW21dOl9bcl0pe2ZvcihsPWgubGVuZ3RoLTE7bD49MDtsLS0paFtsXS5hY3Rpb24hPT1lfHxpJiZoW2xdLmNvbnRleHQhPT1pfHwocD1oLnNwbGljZShsLDEpLHBbMF0uYWN0aW9uPW8uVXRpbC5mYWxzZUZuKTtpJiZkJiYwPT09aC5sZW5ndGgmJihkZWxldGUgZFttXSxfW2NdLS0pfX1lbHNlIGRlbGV0ZSBfW3JdLGRlbGV0ZSBfW3VdO3JldHVybiB0aGlzfSxjbGVhckFsbEV2ZW50TGlzdGVuZXJzOmZ1bmN0aW9uKCl7cmV0dXJuIGRlbGV0ZSB0aGlzW3NdLHRoaXN9LGZpcmVFdmVudDpmdW5jdGlvbih0LGUpe2lmKCF0aGlzLmhhc0V2ZW50TGlzdGVuZXJzKHQpKXJldHVybiB0aGlzO3ZhciBpLG4sYSxyLGgsbD1vLlV0aWwuZXh0ZW5kKHt9LGUse3R5cGU6dCx0YXJnZXQ6dGhpc30pLHU9dGhpc1tzXTtpZih1W3RdKWZvcihpPXVbdF0uc2xpY2UoKSxuPTAsYT1pLmxlbmd0aDthPm47bisrKWlbbl0uYWN0aW9uLmNhbGwoaVtuXS5jb250ZXh0fHx0aGlzLGwpO3I9dVt0K1wiX2lkeFwiXTtmb3IoaCBpbiByKWlmKGk9cltoXS5zbGljZSgpKWZvcihuPTAsYT1pLmxlbmd0aDthPm47bisrKWlbbl0uYWN0aW9uLmNhbGwoaVtuXS5jb250ZXh0fHx0aGlzLGwpO3JldHVybiB0aGlzfSxhZGRPbmVUaW1lRXZlbnRMaXN0ZW5lcjpmdW5jdGlvbih0LGUsaSl7aWYoby5VdGlsLmludm9rZUVhY2godCx0aGlzLmFkZE9uZVRpbWVFdmVudExpc3RlbmVyLHRoaXMsZSxpKSlyZXR1cm4gdGhpczt2YXIgbj1vLmJpbmQoZnVuY3Rpb24oKXt0aGlzLnJlbW92ZUV2ZW50TGlzdGVuZXIodCxlLGkpLnJlbW92ZUV2ZW50TGlzdGVuZXIodCxuLGkpfSx0aGlzKTtyZXR1cm4gdGhpcy5hZGRFdmVudExpc3RlbmVyKHQsZSxpKS5hZGRFdmVudExpc3RlbmVyKHQsbixpKX19LG8uTWl4aW4uRXZlbnRzLm9uPW8uTWl4aW4uRXZlbnRzLmFkZEV2ZW50TGlzdGVuZXIsby5NaXhpbi5FdmVudHMub2ZmPW8uTWl4aW4uRXZlbnRzLnJlbW92ZUV2ZW50TGlzdGVuZXIsby5NaXhpbi5FdmVudHMub25jZT1vLk1peGluLkV2ZW50cy5hZGRPbmVUaW1lRXZlbnRMaXN0ZW5lcixvLk1peGluLkV2ZW50cy5maXJlPW8uTWl4aW4uRXZlbnRzLmZpcmVFdmVudCxmdW5jdGlvbigpe3ZhciBuPSEhdC5BY3RpdmVYT2JqZWN0LHM9biYmIXQuWE1MSHR0cFJlcXVlc3QsYT1uJiYhZS5xdWVyeVNlbGVjdG9yLHI9biYmIWUuYWRkRXZlbnRMaXN0ZW5lcixoPW5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKSxsPS0xIT09aC5pbmRleE9mKFwid2Via2l0XCIpLHU9LTEhPT1oLmluZGV4T2YoXCJjaHJvbWVcIiksYz0tMSE9PWguaW5kZXhPZihcInBoYW50b21cIiksZD0tMSE9PWguaW5kZXhPZihcImFuZHJvaWRcIikscD0tMSE9PWguc2VhcmNoKFwiYW5kcm9pZCBbMjNdXCIpLF89dHlwZW9mIG9yaWVudGF0aW9uIT1pK1wiXCIsbT10Lm5hdmlnYXRvciYmdC5uYXZpZ2F0b3IubXNQb2ludGVyRW5hYmxlZCYmdC5uYXZpZ2F0b3IubXNNYXhUb3VjaFBvaW50cyxmPVwiZGV2aWNlUGl4ZWxSYXRpb1wiaW4gdCYmdC5kZXZpY2VQaXhlbFJhdGlvPjF8fFwibWF0Y2hNZWRpYVwiaW4gdCYmdC5tYXRjaE1lZGlhKFwiKG1pbi1yZXNvbHV0aW9uOjE0NGRwaSlcIikmJnQubWF0Y2hNZWRpYShcIihtaW4tcmVzb2x1dGlvbjoxNDRkcGkpXCIpLm1hdGNoZXMsZz1lLmRvY3VtZW50RWxlbWVudCx2PW4mJlwidHJhbnNpdGlvblwiaW4gZy5zdHlsZSx5PVwiV2ViS2l0Q1NTTWF0cml4XCJpbiB0JiZcIm0xMVwiaW4gbmV3IHQuV2ViS2l0Q1NTTWF0cml4LEw9XCJNb3pQZXJzcGVjdGl2ZVwiaW4gZy5zdHlsZSxQPVwiT1RyYW5zaXRpb25cImluIGcuc3R5bGUseD0hdC5MX0RJU0FCTEVfM0QmJih2fHx5fHxMfHxQKSYmIWMsdz0hdC5MX05PX1RPVUNIJiYhYyYmZnVuY3Rpb24oKXt2YXIgdD1cIm9udG91Y2hzdGFydFwiO2lmKG18fHQgaW4gZylyZXR1cm4hMDt2YXIgaT1lLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksbj0hMTtyZXR1cm4gaS5zZXRBdHRyaWJ1dGU/KGkuc2V0QXR0cmlidXRlKHQsXCJyZXR1cm47XCIpLFwiZnVuY3Rpb25cIj09dHlwZW9mIGlbdF0mJihuPSEwKSxpLnJlbW92ZUF0dHJpYnV0ZSh0KSxpPW51bGwsbik6ITF9KCk7by5Ccm93c2VyPXtpZTpuLGllNjpzLGllNzphLGllbHQ5OnIsd2Via2l0OmwsYW5kcm9pZDpkLGFuZHJvaWQyMzpwLGNocm9tZTp1LGllM2Q6dix3ZWJraXQzZDp5LGdlY2tvM2Q6TCxvcGVyYTNkOlAsYW55M2Q6eCxtb2JpbGU6Xyxtb2JpbGVXZWJraXQ6XyYmbCxtb2JpbGVXZWJraXQzZDpfJiZ5LG1vYmlsZU9wZXJhOl8mJnQub3BlcmEsdG91Y2g6dyxtc1RvdWNoOm0scmV0aW5hOmZ9fSgpLG8uUG9pbnQ9ZnVuY3Rpb24odCxlLGkpe3RoaXMueD1pP01hdGgucm91bmQodCk6dCx0aGlzLnk9aT9NYXRoLnJvdW5kKGUpOmV9LG8uUG9pbnQucHJvdG90eXBlPXtjbG9uZTpmdW5jdGlvbigpe3JldHVybiBuZXcgby5Qb2ludCh0aGlzLngsdGhpcy55KX0sYWRkOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmNsb25lKCkuX2FkZChvLnBvaW50KHQpKX0sX2FkZDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy54Kz10LngsdGhpcy55Kz10LnksdGhpc30sc3VidHJhY3Q6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuY2xvbmUoKS5fc3VidHJhY3Qoby5wb2ludCh0KSl9LF9zdWJ0cmFjdDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy54LT10LngsdGhpcy55LT10LnksdGhpc30sZGl2aWRlQnk6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuY2xvbmUoKS5fZGl2aWRlQnkodCl9LF9kaXZpZGVCeTpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy54Lz10LHRoaXMueS89dCx0aGlzfSxtdWx0aXBseUJ5OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmNsb25lKCkuX211bHRpcGx5QnkodCl9LF9tdWx0aXBseUJ5OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLngqPXQsdGhpcy55Kj10LHRoaXN9LHJvdW5kOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuY2xvbmUoKS5fcm91bmQoKX0sX3JvdW5kOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMueD1NYXRoLnJvdW5kKHRoaXMueCksdGhpcy55PU1hdGgucm91bmQodGhpcy55KSx0aGlzfSxmbG9vcjpmdW5jdGlvbigpe3JldHVybiB0aGlzLmNsb25lKCkuX2Zsb29yKCl9LF9mbG9vcjpmdW5jdGlvbigpe3JldHVybiB0aGlzLng9TWF0aC5mbG9vcih0aGlzLngpLHRoaXMueT1NYXRoLmZsb29yKHRoaXMueSksdGhpc30sZGlzdGFuY2VUbzpmdW5jdGlvbih0KXt0PW8ucG9pbnQodCk7dmFyIGU9dC54LXRoaXMueCxpPXQueS10aGlzLnk7cmV0dXJuIE1hdGguc3FydChlKmUraSppKX0sZXF1YWxzOmZ1bmN0aW9uKHQpe3JldHVybiB0PW8ucG9pbnQodCksdC54PT09dGhpcy54JiZ0Lnk9PT10aGlzLnl9LGNvbnRhaW5zOmZ1bmN0aW9uKHQpe3JldHVybiB0PW8ucG9pbnQodCksTWF0aC5hYnModC54KTw9TWF0aC5hYnModGhpcy54KSYmTWF0aC5hYnModC55KTw9TWF0aC5hYnModGhpcy55KX0sdG9TdHJpbmc6ZnVuY3Rpb24oKXtyZXR1cm5cIlBvaW50KFwiK28uVXRpbC5mb3JtYXROdW0odGhpcy54KStcIiwgXCIrby5VdGlsLmZvcm1hdE51bSh0aGlzLnkpK1wiKVwifX0sby5wb2ludD1mdW5jdGlvbih0LGUsbil7cmV0dXJuIHQgaW5zdGFuY2VvZiBvLlBvaW50P3Q6by5VdGlsLmlzQXJyYXkodCk/bmV3IG8uUG9pbnQodFswXSx0WzFdKTp0PT09aXx8bnVsbD09PXQ/dDpuZXcgby5Qb2ludCh0LGUsbil9LG8uQm91bmRzPWZ1bmN0aW9uKHQsZSl7aWYodClmb3IodmFyIGk9ZT9bdCxlXTp0LG49MCxvPWkubGVuZ3RoO28+bjtuKyspdGhpcy5leHRlbmQoaVtuXSl9LG8uQm91bmRzLnByb3RvdHlwZT17ZXh0ZW5kOmZ1bmN0aW9uKHQpe3JldHVybiB0PW8ucG9pbnQodCksdGhpcy5taW58fHRoaXMubWF4Pyh0aGlzLm1pbi54PU1hdGgubWluKHQueCx0aGlzLm1pbi54KSx0aGlzLm1heC54PU1hdGgubWF4KHQueCx0aGlzLm1heC54KSx0aGlzLm1pbi55PU1hdGgubWluKHQueSx0aGlzLm1pbi55KSx0aGlzLm1heC55PU1hdGgubWF4KHQueSx0aGlzLm1heC55KSk6KHRoaXMubWluPXQuY2xvbmUoKSx0aGlzLm1heD10LmNsb25lKCkpLHRoaXN9LGdldENlbnRlcjpmdW5jdGlvbih0KXtyZXR1cm4gbmV3IG8uUG9pbnQoKHRoaXMubWluLngrdGhpcy5tYXgueCkvMiwodGhpcy5taW4ueSt0aGlzLm1heC55KS8yLHQpfSxnZXRCb3R0b21MZWZ0OmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBvLlBvaW50KHRoaXMubWluLngsdGhpcy5tYXgueSl9LGdldFRvcFJpZ2h0OmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBvLlBvaW50KHRoaXMubWF4LngsdGhpcy5taW4ueSl9LGdldFNpemU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5tYXguc3VidHJhY3QodGhpcy5taW4pfSxjb250YWluczpmdW5jdGlvbih0KXt2YXIgZSxpO3JldHVybiB0PVwibnVtYmVyXCI9PXR5cGVvZiB0WzBdfHx0IGluc3RhbmNlb2Ygby5Qb2ludD9vLnBvaW50KHQpOm8uYm91bmRzKHQpLHQgaW5zdGFuY2VvZiBvLkJvdW5kcz8oZT10Lm1pbixpPXQubWF4KTplPWk9dCxlLng+PXRoaXMubWluLngmJmkueDw9dGhpcy5tYXgueCYmZS55Pj10aGlzLm1pbi55JiZpLnk8PXRoaXMubWF4Lnl9LGludGVyc2VjdHM6ZnVuY3Rpb24odCl7dD1vLmJvdW5kcyh0KTt2YXIgZT10aGlzLm1pbixpPXRoaXMubWF4LG49dC5taW4scz10Lm1heCxhPXMueD49ZS54JiZuLng8PWkueCxyPXMueT49ZS55JiZuLnk8PWkueTtyZXR1cm4gYSYmcn0saXNWYWxpZDpmdW5jdGlvbigpe3JldHVybiEoIXRoaXMubWlufHwhdGhpcy5tYXgpfX0sby5ib3VuZHM9ZnVuY3Rpb24odCxlKXtyZXR1cm4hdHx8dCBpbnN0YW5jZW9mIG8uQm91bmRzP3Q6bmV3IG8uQm91bmRzKHQsZSl9LG8uVHJhbnNmb3JtYXRpb249ZnVuY3Rpb24odCxlLGksbil7dGhpcy5fYT10LHRoaXMuX2I9ZSx0aGlzLl9jPWksdGhpcy5fZD1ufSxvLlRyYW5zZm9ybWF0aW9uLnByb3RvdHlwZT17dHJhbnNmb3JtOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX3RyYW5zZm9ybSh0LmNsb25lKCksZSl9LF90cmFuc2Zvcm06ZnVuY3Rpb24odCxlKXtyZXR1cm4gZT1lfHwxLHQueD1lKih0aGlzLl9hKnQueCt0aGlzLl9iKSx0Lnk9ZSoodGhpcy5fYyp0LnkrdGhpcy5fZCksdH0sdW50cmFuc2Zvcm06ZnVuY3Rpb24odCxlKXtyZXR1cm4gZT1lfHwxLG5ldyBvLlBvaW50KCh0LngvZS10aGlzLl9iKS90aGlzLl9hLCh0LnkvZS10aGlzLl9kKS90aGlzLl9jKX19LG8uRG9tVXRpbD17Z2V0OmZ1bmN0aW9uKHQpe3JldHVyblwic3RyaW5nXCI9PXR5cGVvZiB0P2UuZ2V0RWxlbWVudEJ5SWQodCk6dH0sZ2V0U3R5bGU6ZnVuY3Rpb24odCxpKXt2YXIgbj10LnN0eWxlW2ldO2lmKCFuJiZ0LmN1cnJlbnRTdHlsZSYmKG49dC5jdXJyZW50U3R5bGVbaV0pLCghbnx8XCJhdXRvXCI9PT1uKSYmZS5kZWZhdWx0Vmlldyl7dmFyIG89ZS5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKHQsbnVsbCk7bj1vP29baV06bnVsbH1yZXR1cm5cImF1dG9cIj09PW4/bnVsbDpufSxnZXRWaWV3cG9ydE9mZnNldDpmdW5jdGlvbih0KXt2YXIgaSxuPTAscz0wLGE9dCxyPWUuYm9keSxoPWUuZG9jdW1lbnRFbGVtZW50LGw9by5Ccm93c2VyLmllNztkb3tpZihuKz1hLm9mZnNldFRvcHx8MCxzKz1hLm9mZnNldExlZnR8fDAsbis9cGFyc2VJbnQoby5Eb21VdGlsLmdldFN0eWxlKGEsXCJib3JkZXJUb3BXaWR0aFwiKSwxMCl8fDAscys9cGFyc2VJbnQoby5Eb21VdGlsLmdldFN0eWxlKGEsXCJib3JkZXJMZWZ0V2lkdGhcIiksMTApfHwwLGk9by5Eb21VdGlsLmdldFN0eWxlKGEsXCJwb3NpdGlvblwiKSxhLm9mZnNldFBhcmVudD09PXImJlwiYWJzb2x1dGVcIj09PWkpYnJlYWs7aWYoXCJmaXhlZFwiPT09aSl7bis9ci5zY3JvbGxUb3B8fGguc2Nyb2xsVG9wfHwwLHMrPXIuc2Nyb2xsTGVmdHx8aC5zY3JvbGxMZWZ0fHwwO2JyZWFrfWlmKFwicmVsYXRpdmVcIj09PWkmJiFhLm9mZnNldExlZnQpe3ZhciB1PW8uRG9tVXRpbC5nZXRTdHlsZShhLFwid2lkdGhcIiksYz1vLkRvbVV0aWwuZ2V0U3R5bGUoYSxcIm1heC13aWR0aFwiKSxkPWEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7KFwibm9uZVwiIT09dXx8XCJub25lXCIhPT1jKSYmKHMrPWQubGVmdCthLmNsaWVudExlZnQpLG4rPWQudG9wKyhyLnNjcm9sbFRvcHx8aC5zY3JvbGxUb3B8fDApO2JyZWFrfWE9YS5vZmZzZXRQYXJlbnR9d2hpbGUoYSk7YT10O2Rve2lmKGE9PT1yKWJyZWFrO24tPWEuc2Nyb2xsVG9wfHwwLHMtPWEuc2Nyb2xsTGVmdHx8MCxvLkRvbVV0aWwuZG9jdW1lbnRJc0x0cigpfHwhby5Ccm93c2VyLndlYmtpdCYmIWx8fChzKz1hLnNjcm9sbFdpZHRoLWEuY2xpZW50V2lkdGgsbCYmXCJoaWRkZW5cIiE9PW8uRG9tVXRpbC5nZXRTdHlsZShhLFwib3ZlcmZsb3cteVwiKSYmXCJoaWRkZW5cIiE9PW8uRG9tVXRpbC5nZXRTdHlsZShhLFwib3ZlcmZsb3dcIikmJihzKz0xNykpLGE9YS5wYXJlbnROb2RlfXdoaWxlKGEpO3JldHVybiBuZXcgby5Qb2ludChzLG4pfSxkb2N1bWVudElzTHRyOmZ1bmN0aW9uKCl7cmV0dXJuIG8uRG9tVXRpbC5fZG9jSXNMdHJDYWNoZWR8fChvLkRvbVV0aWwuX2RvY0lzTHRyQ2FjaGVkPSEwLG8uRG9tVXRpbC5fZG9jSXNMdHI9XCJsdHJcIj09PW8uRG9tVXRpbC5nZXRTdHlsZShlLmJvZHksXCJkaXJlY3Rpb25cIikpLG8uRG9tVXRpbC5fZG9jSXNMdHJ9LGNyZWF0ZTpmdW5jdGlvbih0LGksbil7dmFyIG89ZS5jcmVhdGVFbGVtZW50KHQpO3JldHVybiBvLmNsYXNzTmFtZT1pLG4mJm4uYXBwZW5kQ2hpbGQobyksb30saGFzQ2xhc3M6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdC5jbGFzc05hbWUubGVuZ3RoPjAmJm5ldyBSZWdFeHAoXCIoXnxcXFxccylcIitlK1wiKFxcXFxzfCQpXCIpLnRlc3QodC5jbGFzc05hbWUpfSxhZGRDbGFzczpmdW5jdGlvbih0LGUpe28uRG9tVXRpbC5oYXNDbGFzcyh0LGUpfHwodC5jbGFzc05hbWUrPSh0LmNsYXNzTmFtZT9cIiBcIjpcIlwiKStlKX0scmVtb3ZlQ2xhc3M6ZnVuY3Rpb24odCxlKXt0LmNsYXNzTmFtZT1vLlV0aWwudHJpbSgoXCIgXCIrdC5jbGFzc05hbWUrXCIgXCIpLnJlcGxhY2UoXCIgXCIrZStcIiBcIixcIiBcIikpfSxzZXRPcGFjaXR5OmZ1bmN0aW9uKHQsZSl7aWYoXCJvcGFjaXR5XCJpbiB0LnN0eWxlKXQuc3R5bGUub3BhY2l0eT1lO2Vsc2UgaWYoXCJmaWx0ZXJcImluIHQuc3R5bGUpe3ZhciBpPSExLG49XCJEWEltYWdlVHJhbnNmb3JtLk1pY3Jvc29mdC5BbHBoYVwiO3RyeXtpPXQuZmlsdGVycy5pdGVtKG4pfWNhdGNoKG8pe2lmKDE9PT1lKXJldHVybn1lPU1hdGgucm91bmQoMTAwKmUpLGk/KGkuRW5hYmxlZD0xMDAhPT1lLGkuT3BhY2l0eT1lKTp0LnN0eWxlLmZpbHRlcis9XCIgcHJvZ2lkOlwiK24rXCIob3BhY2l0eT1cIitlK1wiKVwifX0sdGVzdFByb3A6ZnVuY3Rpb24odCl7Zm9yKHZhciBpPWUuZG9jdW1lbnRFbGVtZW50LnN0eWxlLG49MDtuPHQubGVuZ3RoO24rKylpZih0W25daW4gaSlyZXR1cm4gdFtuXTtyZXR1cm4hMX0sZ2V0VHJhbnNsYXRlU3RyaW5nOmZ1bmN0aW9uKHQpe3ZhciBlPW8uQnJvd3Nlci53ZWJraXQzZCxpPVwidHJhbnNsYXRlXCIrKGU/XCIzZFwiOlwiXCIpK1wiKFwiLG49KGU/XCIsMFwiOlwiXCIpK1wiKVwiO3JldHVybiBpK3QueCtcInB4LFwiK3QueStcInB4XCIrbn0sZ2V0U2NhbGVTdHJpbmc6ZnVuY3Rpb24odCxlKXt2YXIgaT1vLkRvbVV0aWwuZ2V0VHJhbnNsYXRlU3RyaW5nKGUuYWRkKGUubXVsdGlwbHlCeSgtMSp0KSkpLG49XCIgc2NhbGUoXCIrdCtcIikgXCI7cmV0dXJuIGkrbn0sc2V0UG9zaXRpb246ZnVuY3Rpb24odCxlLGkpe3QuX2xlYWZsZXRfcG9zPWUsIWkmJm8uQnJvd3Nlci5hbnkzZD8odC5zdHlsZVtvLkRvbVV0aWwuVFJBTlNGT1JNXT1vLkRvbVV0aWwuZ2V0VHJhbnNsYXRlU3RyaW5nKGUpLG8uQnJvd3Nlci5tb2JpbGVXZWJraXQzZCYmKHQuc3R5bGUuV2Via2l0QmFja2ZhY2VWaXNpYmlsaXR5PVwiaGlkZGVuXCIpKToodC5zdHlsZS5sZWZ0PWUueCtcInB4XCIsdC5zdHlsZS50b3A9ZS55K1wicHhcIil9LGdldFBvc2l0aW9uOmZ1bmN0aW9uKHQpe3JldHVybiB0Ll9sZWFmbGV0X3Bvc319LG8uRG9tVXRpbC5UUkFOU0ZPUk09by5Eb21VdGlsLnRlc3RQcm9wKFtcInRyYW5zZm9ybVwiLFwiV2Via2l0VHJhbnNmb3JtXCIsXCJPVHJhbnNmb3JtXCIsXCJNb3pUcmFuc2Zvcm1cIixcIm1zVHJhbnNmb3JtXCJdKSxvLkRvbVV0aWwuVFJBTlNJVElPTj1vLkRvbVV0aWwudGVzdFByb3AoW1wid2Via2l0VHJhbnNpdGlvblwiLFwidHJhbnNpdGlvblwiLFwiT1RyYW5zaXRpb25cIixcIk1velRyYW5zaXRpb25cIixcIm1zVHJhbnNpdGlvblwiXSksby5Eb21VdGlsLlRSQU5TSVRJT05fRU5EPVwid2Via2l0VHJhbnNpdGlvblwiPT09by5Eb21VdGlsLlRSQU5TSVRJT058fFwiT1RyYW5zaXRpb25cIj09PW8uRG9tVXRpbC5UUkFOU0lUSU9OP28uRG9tVXRpbC5UUkFOU0lUSU9OK1wiRW5kXCI6XCJ0cmFuc2l0aW9uZW5kXCIsZnVuY3Rpb24oKXt2YXIgaT1vLkRvbVV0aWwudGVzdFByb3AoW1widXNlclNlbGVjdFwiLFwiV2Via2l0VXNlclNlbGVjdFwiLFwiT1VzZXJTZWxlY3RcIixcIk1velVzZXJTZWxlY3RcIixcIm1zVXNlclNlbGVjdFwiXSk7by5leHRlbmQoby5Eb21VdGlsLHtkaXNhYmxlVGV4dFNlbGVjdGlvbjpmdW5jdGlvbigpe2lmKG8uRG9tRXZlbnQub24odCxcInNlbGVjdHN0YXJ0XCIsby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCksaSl7dmFyIG49ZS5kb2N1bWVudEVsZW1lbnQuc3R5bGU7dGhpcy5fdXNlclNlbGVjdD1uW2ldLG5baV09XCJub25lXCJ9fSxlbmFibGVUZXh0U2VsZWN0aW9uOmZ1bmN0aW9uKCl7by5Eb21FdmVudC5vZmYodCxcInNlbGVjdHN0YXJ0XCIsby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCksaSYmKGUuZG9jdW1lbnRFbGVtZW50LnN0eWxlW2ldPXRoaXMuX3VzZXJTZWxlY3QsZGVsZXRlIHRoaXMuX3VzZXJTZWxlY3QpfSxkaXNhYmxlSW1hZ2VEcmFnOmZ1bmN0aW9uKCl7by5Eb21FdmVudC5vbih0LFwiZHJhZ3N0YXJ0XCIsby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCl9LGVuYWJsZUltYWdlRHJhZzpmdW5jdGlvbigpe28uRG9tRXZlbnQub2ZmKHQsXCJkcmFnc3RhcnRcIixvLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KX19KX0oKSxvLkxhdExuZz1mdW5jdGlvbih0LGUpe3ZhciBpPXBhcnNlRmxvYXQodCksbj1wYXJzZUZsb2F0KGUpO2lmKGlzTmFOKGkpfHxpc05hTihuKSl0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIExhdExuZyBvYmplY3Q6IChcIit0K1wiLCBcIitlK1wiKVwiKTt0aGlzLmxhdD1pLHRoaXMubG5nPW59LG8uZXh0ZW5kKG8uTGF0TG5nLHtERUdfVE9fUkFEOk1hdGguUEkvMTgwLFJBRF9UT19ERUc6MTgwL01hdGguUEksTUFYX01BUkdJTjoxZS05fSksby5MYXRMbmcucHJvdG90eXBlPXtlcXVhbHM6ZnVuY3Rpb24odCl7aWYoIXQpcmV0dXJuITE7dD1vLmxhdExuZyh0KTt2YXIgZT1NYXRoLm1heChNYXRoLmFicyh0aGlzLmxhdC10LmxhdCksTWF0aC5hYnModGhpcy5sbmctdC5sbmcpKTtyZXR1cm4gZTw9by5MYXRMbmcuTUFYX01BUkdJTn0sdG9TdHJpbmc6ZnVuY3Rpb24odCl7cmV0dXJuXCJMYXRMbmcoXCIrby5VdGlsLmZvcm1hdE51bSh0aGlzLmxhdCx0KStcIiwgXCIrby5VdGlsLmZvcm1hdE51bSh0aGlzLmxuZyx0KStcIilcIn0sZGlzdGFuY2VUbzpmdW5jdGlvbih0KXt0PW8ubGF0TG5nKHQpO3ZhciBlPTYzNzgxMzcsaT1vLkxhdExuZy5ERUdfVE9fUkFELG49KHQubGF0LXRoaXMubGF0KSppLHM9KHQubG5nLXRoaXMubG5nKSppLGE9dGhpcy5sYXQqaSxyPXQubGF0KmksaD1NYXRoLnNpbihuLzIpLGw9TWF0aC5zaW4ocy8yKSx1PWgqaCtsKmwqTWF0aC5jb3MoYSkqTWF0aC5jb3Mocik7cmV0dXJuIDIqZSpNYXRoLmF0YW4yKE1hdGguc3FydCh1KSxNYXRoLnNxcnQoMS11KSl9LHdyYXA6ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLmxuZztyZXR1cm4gdD10fHwtMTgwLGU9ZXx8MTgwLGk9KGkrZSklKGUtdCkrKHQ+aXx8aT09PWU/ZTp0KSxuZXcgby5MYXRMbmcodGhpcy5sYXQsaSl9fSxvLmxhdExuZz1mdW5jdGlvbih0LGUpe3JldHVybiB0IGluc3RhbmNlb2Ygby5MYXRMbmc/dDpvLlV0aWwuaXNBcnJheSh0KT9uZXcgby5MYXRMbmcodFswXSx0WzFdKTp0PT09aXx8bnVsbD09PXQ/dDpcIm9iamVjdFwiPT10eXBlb2YgdCYmXCJsYXRcImluIHQ/bmV3IG8uTGF0TG5nKHQubGF0LFwibG5nXCJpbiB0P3QubG5nOnQubG9uKTpuZXcgby5MYXRMbmcodCxlKX0sby5MYXRMbmdCb3VuZHM9ZnVuY3Rpb24odCxlKXtpZih0KWZvcih2YXIgaT1lP1t0LGVdOnQsbj0wLG89aS5sZW5ndGg7bz5uO24rKyl0aGlzLmV4dGVuZChpW25dKX0sby5MYXRMbmdCb3VuZHMucHJvdG90eXBlPXtleHRlbmQ6ZnVuY3Rpb24odCl7cmV0dXJuIHQ/KHQ9XCJudW1iZXJcIj09dHlwZW9mIHRbMF18fFwic3RyaW5nXCI9PXR5cGVvZiB0WzBdfHx0IGluc3RhbmNlb2Ygby5MYXRMbmc/by5sYXRMbmcodCk6by5sYXRMbmdCb3VuZHModCksdCBpbnN0YW5jZW9mIG8uTGF0TG5nP3RoaXMuX3NvdXRoV2VzdHx8dGhpcy5fbm9ydGhFYXN0Pyh0aGlzLl9zb3V0aFdlc3QubGF0PU1hdGgubWluKHQubGF0LHRoaXMuX3NvdXRoV2VzdC5sYXQpLHRoaXMuX3NvdXRoV2VzdC5sbmc9TWF0aC5taW4odC5sbmcsdGhpcy5fc291dGhXZXN0LmxuZyksdGhpcy5fbm9ydGhFYXN0LmxhdD1NYXRoLm1heCh0LmxhdCx0aGlzLl9ub3J0aEVhc3QubGF0KSx0aGlzLl9ub3J0aEVhc3QubG5nPU1hdGgubWF4KHQubG5nLHRoaXMuX25vcnRoRWFzdC5sbmcpKToodGhpcy5fc291dGhXZXN0PW5ldyBvLkxhdExuZyh0LmxhdCx0LmxuZyksdGhpcy5fbm9ydGhFYXN0PW5ldyBvLkxhdExuZyh0LmxhdCx0LmxuZykpOnQgaW5zdGFuY2VvZiBvLkxhdExuZ0JvdW5kcyYmKHRoaXMuZXh0ZW5kKHQuX3NvdXRoV2VzdCksdGhpcy5leHRlbmQodC5fbm9ydGhFYXN0KSksdGhpcyk6dGhpc30scGFkOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX3NvdXRoV2VzdCxpPXRoaXMuX25vcnRoRWFzdCxuPU1hdGguYWJzKGUubGF0LWkubGF0KSp0LHM9TWF0aC5hYnMoZS5sbmctaS5sbmcpKnQ7cmV0dXJuIG5ldyBvLkxhdExuZ0JvdW5kcyhuZXcgby5MYXRMbmcoZS5sYXQtbixlLmxuZy1zKSxuZXcgby5MYXRMbmcoaS5sYXQrbixpLmxuZytzKSl9LGdldENlbnRlcjpmdW5jdGlvbigpe3JldHVybiBuZXcgby5MYXRMbmcoKHRoaXMuX3NvdXRoV2VzdC5sYXQrdGhpcy5fbm9ydGhFYXN0LmxhdCkvMiwodGhpcy5fc291dGhXZXN0LmxuZyt0aGlzLl9ub3J0aEVhc3QubG5nKS8yKX0sZ2V0U291dGhXZXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3NvdXRoV2VzdH0sZ2V0Tm9ydGhFYXN0OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX25vcnRoRWFzdH0sZ2V0Tm9ydGhXZXN0OmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBvLkxhdExuZyh0aGlzLmdldE5vcnRoKCksdGhpcy5nZXRXZXN0KCkpfSxnZXRTb3V0aEVhc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gbmV3IG8uTGF0TG5nKHRoaXMuZ2V0U291dGgoKSx0aGlzLmdldEVhc3QoKSl9LGdldFdlc3Q6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fc291dGhXZXN0LmxuZ30sZ2V0U291dGg6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fc291dGhXZXN0LmxhdH0sZ2V0RWFzdDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9ub3J0aEVhc3QubG5nfSxnZXROb3J0aDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9ub3J0aEVhc3QubGF0fSxjb250YWluczpmdW5jdGlvbih0KXt0PVwibnVtYmVyXCI9PXR5cGVvZiB0WzBdfHx0IGluc3RhbmNlb2Ygby5MYXRMbmc/by5sYXRMbmcodCk6by5sYXRMbmdCb3VuZHModCk7dmFyIGUsaSxuPXRoaXMuX3NvdXRoV2VzdCxzPXRoaXMuX25vcnRoRWFzdDtyZXR1cm4gdCBpbnN0YW5jZW9mIG8uTGF0TG5nQm91bmRzPyhlPXQuZ2V0U291dGhXZXN0KCksaT10LmdldE5vcnRoRWFzdCgpKTplPWk9dCxlLmxhdD49bi5sYXQmJmkubGF0PD1zLmxhdCYmZS5sbmc+PW4ubG5nJiZpLmxuZzw9cy5sbmd9LGludGVyc2VjdHM6ZnVuY3Rpb24odCl7dD1vLmxhdExuZ0JvdW5kcyh0KTt2YXIgZT10aGlzLl9zb3V0aFdlc3QsaT10aGlzLl9ub3J0aEVhc3Qsbj10LmdldFNvdXRoV2VzdCgpLHM9dC5nZXROb3J0aEVhc3QoKSxhPXMubGF0Pj1lLmxhdCYmbi5sYXQ8PWkubGF0LHI9cy5sbmc+PWUubG5nJiZuLmxuZzw9aS5sbmc7cmV0dXJuIGEmJnJ9LHRvQkJveFN0cmluZzpmdW5jdGlvbigpe3JldHVyblt0aGlzLmdldFdlc3QoKSx0aGlzLmdldFNvdXRoKCksdGhpcy5nZXRFYXN0KCksdGhpcy5nZXROb3J0aCgpXS5qb2luKFwiLFwiKX0sZXF1YWxzOmZ1bmN0aW9uKHQpe3JldHVybiB0Pyh0PW8ubGF0TG5nQm91bmRzKHQpLHRoaXMuX3NvdXRoV2VzdC5lcXVhbHModC5nZXRTb3V0aFdlc3QoKSkmJnRoaXMuX25vcnRoRWFzdC5lcXVhbHModC5nZXROb3J0aEVhc3QoKSkpOiExfSxpc1ZhbGlkOmZ1bmN0aW9uKCl7cmV0dXJuISghdGhpcy5fc291dGhXZXN0fHwhdGhpcy5fbm9ydGhFYXN0KX19LG8ubGF0TG5nQm91bmRzPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIXR8fHQgaW5zdGFuY2VvZiBvLkxhdExuZ0JvdW5kcz90Om5ldyBvLkxhdExuZ0JvdW5kcyh0LGUpfSxvLlByb2plY3Rpb249e30sby5Qcm9qZWN0aW9uLlNwaGVyaWNhbE1lcmNhdG9yPXtNQVhfTEFUSVRVREU6ODUuMDUxMTI4Nzc5OCxwcm9qZWN0OmZ1bmN0aW9uKHQpe3ZhciBlPW8uTGF0TG5nLkRFR19UT19SQUQsaT10aGlzLk1BWF9MQVRJVFVERSxuPU1hdGgubWF4KE1hdGgubWluKGksdC5sYXQpLC1pKSxzPXQubG5nKmUsYT1uKmU7cmV0dXJuIGE9TWF0aC5sb2coTWF0aC50YW4oTWF0aC5QSS80K2EvMikpLG5ldyBvLlBvaW50KHMsYSl9LHVucHJvamVjdDpmdW5jdGlvbih0KXt2YXIgZT1vLkxhdExuZy5SQURfVE9fREVHLGk9dC54KmUsbj0oMipNYXRoLmF0YW4oTWF0aC5leHAodC55KSktTWF0aC5QSS8yKSplO3JldHVybiBuZXcgby5MYXRMbmcobixpKX19LG8uUHJvamVjdGlvbi5Mb25MYXQ9e3Byb2plY3Q6ZnVuY3Rpb24odCl7cmV0dXJuIG5ldyBvLlBvaW50KHQubG5nLHQubGF0KX0sdW5wcm9qZWN0OmZ1bmN0aW9uKHQpe3JldHVybiBuZXcgby5MYXRMbmcodC55LHQueCl9fSxvLkNSUz17bGF0TG5nVG9Qb2ludDpmdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMucHJvamVjdGlvbi5wcm9qZWN0KHQpLG49dGhpcy5zY2FsZShlKTtyZXR1cm4gdGhpcy50cmFuc2Zvcm1hdGlvbi5fdHJhbnNmb3JtKGksbil9LHBvaW50VG9MYXRMbmc6ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLnNjYWxlKGUpLG49dGhpcy50cmFuc2Zvcm1hdGlvbi51bnRyYW5zZm9ybSh0LGkpO3JldHVybiB0aGlzLnByb2plY3Rpb24udW5wcm9qZWN0KG4pfSxwcm9qZWN0OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLnByb2plY3Rpb24ucHJvamVjdCh0KX0sc2NhbGU6ZnVuY3Rpb24odCl7cmV0dXJuIDI1NipNYXRoLnBvdygyLHQpfX0sby5DUlMuU2ltcGxlPW8uZXh0ZW5kKHt9LG8uQ1JTLHtwcm9qZWN0aW9uOm8uUHJvamVjdGlvbi5Mb25MYXQsdHJhbnNmb3JtYXRpb246bmV3IG8uVHJhbnNmb3JtYXRpb24oMSwwLC0xLDApLHNjYWxlOmZ1bmN0aW9uKHQpe3JldHVybiBNYXRoLnBvdygyLHQpfX0pLG8uQ1JTLkVQU0czODU3PW8uZXh0ZW5kKHt9LG8uQ1JTLHtjb2RlOlwiRVBTRzozODU3XCIscHJvamVjdGlvbjpvLlByb2plY3Rpb24uU3BoZXJpY2FsTWVyY2F0b3IsdHJhbnNmb3JtYXRpb246bmV3IG8uVHJhbnNmb3JtYXRpb24oLjUvTWF0aC5QSSwuNSwtLjUvTWF0aC5QSSwuNSkscHJvamVjdDpmdW5jdGlvbih0KXt2YXIgZT10aGlzLnByb2plY3Rpb24ucHJvamVjdCh0KSxpPTYzNzgxMzc7cmV0dXJuIGUubXVsdGlwbHlCeShpKX19KSxvLkNSUy5FUFNHOTAwOTEzPW8uZXh0ZW5kKHt9LG8uQ1JTLkVQU0czODU3LHtjb2RlOlwiRVBTRzo5MDA5MTNcIn0pLG8uQ1JTLkVQU0c0MzI2PW8uZXh0ZW5kKHt9LG8uQ1JTLHtjb2RlOlwiRVBTRzo0MzI2XCIscHJvamVjdGlvbjpvLlByb2plY3Rpb24uTG9uTGF0LHRyYW5zZm9ybWF0aW9uOm5ldyBvLlRyYW5zZm9ybWF0aW9uKDEvMzYwLC41LC0xLzM2MCwuNSl9KSxvLk1hcD1vLkNsYXNzLmV4dGVuZCh7aW5jbHVkZXM6by5NaXhpbi5FdmVudHMsb3B0aW9uczp7Y3JzOm8uQ1JTLkVQU0czODU3LGZhZGVBbmltYXRpb246by5Eb21VdGlsLlRSQU5TSVRJT04mJiFvLkJyb3dzZXIuYW5kcm9pZDIzLHRyYWNrUmVzaXplOiEwLG1hcmtlclpvb21BbmltYXRpb246by5Eb21VdGlsLlRSQU5TSVRJT04mJm8uQnJvd3Nlci5hbnkzZH0saW5pdGlhbGl6ZTpmdW5jdGlvbih0LGUpe2U9by5zZXRPcHRpb25zKHRoaXMsZSksdGhpcy5faW5pdENvbnRhaW5lcih0KSx0aGlzLl9pbml0TGF5b3V0KCksdGhpcy5faW5pdEV2ZW50cygpLGUubWF4Qm91bmRzJiZ0aGlzLnNldE1heEJvdW5kcyhlLm1heEJvdW5kcyksZS5jZW50ZXImJmUuem9vbSE9PWkmJnRoaXMuc2V0VmlldyhvLmxhdExuZyhlLmNlbnRlciksZS56b29tLHtyZXNldDohMH0pLHRoaXMuX2hhbmRsZXJzPVtdLHRoaXMuX2xheWVycz17fSx0aGlzLl96b29tQm91bmRMYXllcnM9e30sdGhpcy5fdGlsZUxheWVyc051bT0wLHRoaXMuY2FsbEluaXRIb29rcygpLHRoaXMuX2FkZExheWVycyhlLmxheWVycyl9LHNldFZpZXc6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5fcmVzZXRWaWV3KG8ubGF0TG5nKHQpLHRoaXMuX2xpbWl0Wm9vbShlKSksdGhpc30sc2V0Wm9vbTpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnNldFZpZXcodGhpcy5nZXRDZW50ZXIoKSx0LHt6b29tOmV9KX0sem9vbUluOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuc2V0Wm9vbSh0aGlzLl96b29tKyh0fHwxKSxlKX0sem9vbU91dDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLnNldFpvb20odGhpcy5fem9vbS0odHx8MSksZSl9LHNldFpvb21Bcm91bmQ6ZnVuY3Rpb24odCxlLGkpe3ZhciBuPXRoaXMuZ2V0Wm9vbVNjYWxlKGUpLHM9dGhpcy5nZXRTaXplKCkuZGl2aWRlQnkoMiksYT10IGluc3RhbmNlb2Ygby5Qb2ludD90OnRoaXMubGF0TG5nVG9Db250YWluZXJQb2ludCh0KSxyPWEuc3VidHJhY3QocykubXVsdGlwbHlCeSgxLTEvbiksaD10aGlzLmNvbnRhaW5lclBvaW50VG9MYXRMbmcocy5hZGQocikpO3JldHVybiB0aGlzLnNldFZpZXcoaCxlLHt6b29tOml9KX0sZml0Qm91bmRzOmZ1bmN0aW9uKHQsZSl7ZT1lfHx7fSx0PXQuZ2V0Qm91bmRzP3QuZ2V0Qm91bmRzKCk6by5sYXRMbmdCb3VuZHModCk7dmFyIGk9by5wb2ludChlLnBhZGRpbmdUb3BMZWZ0fHxlLnBhZGRpbmd8fFswLDBdKSxuPW8ucG9pbnQoZS5wYWRkaW5nQm90dG9tUmlnaHR8fGUucGFkZGluZ3x8WzAsMF0pLHM9dGhpcy5nZXRCb3VuZHNab29tKHQsITEsaS5hZGQobikpLGE9bi5zdWJ0cmFjdChpKS5kaXZpZGVCeSgyKSxyPXRoaXMucHJvamVjdCh0LmdldFNvdXRoV2VzdCgpLHMpLGg9dGhpcy5wcm9qZWN0KHQuZ2V0Tm9ydGhFYXN0KCkscyksbD10aGlzLnVucHJvamVjdChyLmFkZChoKS5kaXZpZGVCeSgyKS5hZGQoYSkscyk7cmV0dXJuIHRoaXMuc2V0VmlldyhsLHMsZSl9LGZpdFdvcmxkOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpdEJvdW5kcyhbWy05MCwtMTgwXSxbOTAsMTgwXV0sdCl9LHBhblRvOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuc2V0Vmlldyh0LHRoaXMuX3pvb20se3BhbjplfSl9LHBhbkJ5OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmZpcmUoXCJtb3Zlc3RhcnRcIiksdGhpcy5fcmF3UGFuQnkoby5wb2ludCh0KSksdGhpcy5maXJlKFwibW92ZVwiKSx0aGlzLmZpcmUoXCJtb3ZlZW5kXCIpfSxzZXRNYXhCb3VuZHM6ZnVuY3Rpb24odCxlKXtpZih0PW8ubGF0TG5nQm91bmRzKHQpLHRoaXMub3B0aW9ucy5tYXhCb3VuZHM9dCwhdClyZXR1cm4gdGhpcy5fYm91bmRzTWluWm9vbT1udWxsLHRoaXMub2ZmKFwibW92ZWVuZFwiLHRoaXMuX3Bhbkluc2lkZU1heEJvdW5kcyx0aGlzKSx0aGlzO3ZhciBpPXRoaXMuZ2V0Qm91bmRzWm9vbSh0LCEwKTtyZXR1cm4gdGhpcy5fYm91bmRzTWluWm9vbT1pLHRoaXMuX2xvYWRlZCYmKHRoaXMuX3pvb208aT90aGlzLnNldFZpZXcodC5nZXRDZW50ZXIoKSxpLGUpOnRoaXMucGFuSW5zaWRlQm91bmRzKHQpKSx0aGlzLm9uKFwibW92ZWVuZFwiLHRoaXMuX3Bhbkluc2lkZU1heEJvdW5kcyx0aGlzKSx0aGlzfSxwYW5JbnNpZGVCb3VuZHM6ZnVuY3Rpb24odCl7dD1vLmxhdExuZ0JvdW5kcyh0KTt2YXIgZT10aGlzLmdldFBpeGVsQm91bmRzKCksaT1lLmdldEJvdHRvbUxlZnQoKSxuPWUuZ2V0VG9wUmlnaHQoKSxzPXRoaXMucHJvamVjdCh0LmdldFNvdXRoV2VzdCgpKSxhPXRoaXMucHJvamVjdCh0LmdldE5vcnRoRWFzdCgpKSxyPTAsaD0wO3JldHVybiBuLnk8YS55JiYoaD1NYXRoLmNlaWwoYS55LW4ueSkpLG4ueD5hLngmJihyPU1hdGguZmxvb3IoYS54LW4ueCkpLGkueT5zLnkmJihoPU1hdGguZmxvb3Iocy55LWkueSkpLGkueDxzLngmJihyPU1hdGguY2VpbChzLngtaS54KSkscnx8aD90aGlzLnBhbkJ5KFtyLGhdKTp0aGlzfSxhZGRMYXllcjpmdW5jdGlvbih0KXt2YXIgZT1vLnN0YW1wKHQpO3JldHVybiB0aGlzLl9sYXllcnNbZV0/dGhpczoodGhpcy5fbGF5ZXJzW2VdPXQsIXQub3B0aW9uc3x8aXNOYU4odC5vcHRpb25zLm1heFpvb20pJiZpc05hTih0Lm9wdGlvbnMubWluWm9vbSl8fCh0aGlzLl96b29tQm91bmRMYXllcnNbZV09dCx0aGlzLl91cGRhdGVab29tTGV2ZWxzKCkpLHRoaXMub3B0aW9ucy56b29tQW5pbWF0aW9uJiZvLlRpbGVMYXllciYmdCBpbnN0YW5jZW9mIG8uVGlsZUxheWVyJiYodGhpcy5fdGlsZUxheWVyc051bSsrLHRoaXMuX3RpbGVMYXllcnNUb0xvYWQrKyx0Lm9uKFwibG9hZFwiLHRoaXMuX29uVGlsZUxheWVyTG9hZCx0aGlzKSksdGhpcy5fbG9hZGVkJiZ0aGlzLl9sYXllckFkZCh0KSx0aGlzKX0scmVtb3ZlTGF5ZXI6ZnVuY3Rpb24odCl7dmFyIGU9by5zdGFtcCh0KTtpZih0aGlzLl9sYXllcnNbZV0pcmV0dXJuIHRoaXMuX2xvYWRlZCYmdC5vblJlbW92ZSh0aGlzKSxkZWxldGUgdGhpcy5fbGF5ZXJzW2VdLHRoaXMuX2xvYWRlZCYmdGhpcy5maXJlKFwibGF5ZXJyZW1vdmVcIix7bGF5ZXI6dH0pLHRoaXMuX3pvb21Cb3VuZExheWVyc1tlXSYmKGRlbGV0ZSB0aGlzLl96b29tQm91bmRMYXllcnNbZV0sdGhpcy5fdXBkYXRlWm9vbUxldmVscygpKSx0aGlzLm9wdGlvbnMuem9vbUFuaW1hdGlvbiYmby5UaWxlTGF5ZXImJnQgaW5zdGFuY2VvZiBvLlRpbGVMYXllciYmKHRoaXMuX3RpbGVMYXllcnNOdW0tLSx0aGlzLl90aWxlTGF5ZXJzVG9Mb2FkLS0sdC5vZmYoXCJsb2FkXCIsdGhpcy5fb25UaWxlTGF5ZXJMb2FkLHRoaXMpKSx0aGlzfSxoYXNMYXllcjpmdW5jdGlvbih0KXtyZXR1cm4gdD9vLnN0YW1wKHQpaW4gdGhpcy5fbGF5ZXJzOiExfSxlYWNoTGF5ZXI6ZnVuY3Rpb24odCxlKXtmb3IodmFyIGkgaW4gdGhpcy5fbGF5ZXJzKXQuY2FsbChlLHRoaXMuX2xheWVyc1tpXSk7cmV0dXJuIHRoaXN9LGludmFsaWRhdGVTaXplOmZ1bmN0aW9uKHQpe3Q9by5leHRlbmQoe2FuaW1hdGU6ITEscGFuOiEwfSx0PT09ITA/e2FuaW1hdGU6ITB9OnQpO3ZhciBlPXRoaXMuZ2V0U2l6ZSgpO2lmKHRoaXMuX3NpemVDaGFuZ2VkPSEwLHRoaXMub3B0aW9ucy5tYXhCb3VuZHMmJnRoaXMuc2V0TWF4Qm91bmRzKHRoaXMub3B0aW9ucy5tYXhCb3VuZHMpLCF0aGlzLl9sb2FkZWQpcmV0dXJuIHRoaXM7dmFyIGk9dGhpcy5nZXRTaXplKCksbj1lLnN1YnRyYWN0KGkpLmRpdmlkZUJ5KDIpLnJvdW5kKCk7cmV0dXJuIG4ueHx8bi55Pyh0LmFuaW1hdGUmJnQucGFuP3RoaXMucGFuQnkobik6KHQucGFuJiZ0aGlzLl9yYXdQYW5CeShuKSx0aGlzLmZpcmUoXCJtb3ZlXCIpLGNsZWFyVGltZW91dCh0aGlzLl9zaXplVGltZXIpLHRoaXMuX3NpemVUaW1lcj1zZXRUaW1lb3V0KG8uYmluZCh0aGlzLmZpcmUsdGhpcyxcIm1vdmVlbmRcIiksMjAwKSksdGhpcy5maXJlKFwicmVzaXplXCIse29sZFNpemU6ZSxuZXdTaXplOml9KSk6dGhpc30sYWRkSGFuZGxlcjpmdW5jdGlvbih0LGUpe2lmKGUpe3ZhciBpPXRoaXNbdF09bmV3IGUodGhpcyk7cmV0dXJuIHRoaXMuX2hhbmRsZXJzLnB1c2goaSksdGhpcy5vcHRpb25zW3RdJiZpLmVuYWJsZSgpLHRoaXN9fSxyZW1vdmU6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbG9hZGVkJiZ0aGlzLmZpcmUoXCJ1bmxvYWRcIiksdGhpcy5faW5pdEV2ZW50cyhcIm9mZlwiKSxkZWxldGUgdGhpcy5fY29udGFpbmVyLl9sZWFmbGV0LHRoaXMuX2NsZWFyUGFuZXMoKSx0aGlzLl9jbGVhckNvbnRyb2xQb3MmJnRoaXMuX2NsZWFyQ29udHJvbFBvcygpLHRoaXMuX2NsZWFySGFuZGxlcnMoKSx0aGlzfSxnZXRDZW50ZXI6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fY2hlY2tJZkxvYWRlZCgpLHRoaXMuX21vdmVkKCk/dGhpcy5sYXllclBvaW50VG9MYXRMbmcodGhpcy5fZ2V0Q2VudGVyTGF5ZXJQb2ludCgpKTp0aGlzLl9pbml0aWFsQ2VudGVyfSxnZXRab29tOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX3pvb219LGdldEJvdW5kczpmdW5jdGlvbigpe3ZhciB0PXRoaXMuZ2V0UGl4ZWxCb3VuZHMoKSxlPXRoaXMudW5wcm9qZWN0KHQuZ2V0Qm90dG9tTGVmdCgpKSxpPXRoaXMudW5wcm9qZWN0KHQuZ2V0VG9wUmlnaHQoKSk7cmV0dXJuIG5ldyBvLkxhdExuZ0JvdW5kcyhlLGkpfSxnZXRNaW5ab29tOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbGF5ZXJzTWluWm9vbT09PWk/MDp0aGlzLl9sYXllcnNNaW5ab29tLGU9dGhpcy5fYm91bmRzTWluWm9vbT09PWk/MDp0aGlzLl9ib3VuZHNNaW5ab29tO3JldHVybiB0aGlzLm9wdGlvbnMubWluWm9vbT09PWk/TWF0aC5tYXgodCxlKTp0aGlzLm9wdGlvbnMubWluWm9vbX0sZ2V0TWF4Wm9vbTpmdW5jdGlvbigpe3JldHVybiB0aGlzLm9wdGlvbnMubWF4Wm9vbT09PWk/dGhpcy5fbGF5ZXJzTWF4Wm9vbT09PWk/MS8wOnRoaXMuX2xheWVyc01heFpvb206dGhpcy5vcHRpb25zLm1heFpvb219LGdldEJvdW5kc1pvb206ZnVuY3Rpb24odCxlLGkpe3Q9by5sYXRMbmdCb3VuZHModCk7dmFyIG4scz10aGlzLmdldE1pblpvb20oKS0oZT8xOjApLGE9dGhpcy5nZXRNYXhab29tKCkscj10aGlzLmdldFNpemUoKSxoPXQuZ2V0Tm9ydGhXZXN0KCksbD10LmdldFNvdXRoRWFzdCgpLHU9ITA7aT1vLnBvaW50KGl8fFswLDBdKTtkbyBzKyssbj10aGlzLnByb2plY3QobCxzKS5zdWJ0cmFjdCh0aGlzLnByb2plY3QoaCxzKSkuYWRkKGkpLHU9ZT9uLng8ci54fHxuLnk8ci55OnIuY29udGFpbnMobik7d2hpbGUodSYmYT49cyk7cmV0dXJuIHUmJmU/bnVsbDplP3M6cy0xfSxnZXRTaXplOmZ1bmN0aW9uKCl7cmV0dXJuKCF0aGlzLl9zaXplfHx0aGlzLl9zaXplQ2hhbmdlZCkmJih0aGlzLl9zaXplPW5ldyBvLlBvaW50KHRoaXMuX2NvbnRhaW5lci5jbGllbnRXaWR0aCx0aGlzLl9jb250YWluZXIuY2xpZW50SGVpZ2h0KSx0aGlzLl9zaXplQ2hhbmdlZD0hMSksdGhpcy5fc2l6ZS5jbG9uZSgpfSxnZXRQaXhlbEJvdW5kczpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX2dldFRvcExlZnRQb2ludCgpO3JldHVybiBuZXcgby5Cb3VuZHModCx0LmFkZCh0aGlzLmdldFNpemUoKSkpfSxnZXRQaXhlbE9yaWdpbjpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9jaGVja0lmTG9hZGVkKCksdGhpcy5faW5pdGlhbFRvcExlZnRQb2ludH0sZ2V0UGFuZXM6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fcGFuZXN9LGdldENvbnRhaW5lcjpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9jb250YWluZXJ9LGdldFpvb21TY2FsZTpmdW5jdGlvbih0KXt2YXIgZT10aGlzLm9wdGlvbnMuY3JzO3JldHVybiBlLnNjYWxlKHQpL2Uuc2NhbGUodGhpcy5fem9vbSl9LGdldFNjYWxlWm9vbTpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fem9vbStNYXRoLmxvZyh0KS9NYXRoLkxOMn0scHJvamVjdDpmdW5jdGlvbih0LGUpe3JldHVybiBlPWU9PT1pP3RoaXMuX3pvb206ZSx0aGlzLm9wdGlvbnMuY3JzLmxhdExuZ1RvUG9pbnQoby5sYXRMbmcodCksZSl9LHVucHJvamVjdDpmdW5jdGlvbih0LGUpe3JldHVybiBlPWU9PT1pP3RoaXMuX3pvb206ZSx0aGlzLm9wdGlvbnMuY3JzLnBvaW50VG9MYXRMbmcoby5wb2ludCh0KSxlKX0sbGF5ZXJQb2ludFRvTGF0TG5nOmZ1bmN0aW9uKHQpe3ZhciBlPW8ucG9pbnQodCkuYWRkKHRoaXMuZ2V0UGl4ZWxPcmlnaW4oKSk7cmV0dXJuIHRoaXMudW5wcm9qZWN0KGUpfSxsYXRMbmdUb0xheWVyUG9pbnQ6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5wcm9qZWN0KG8ubGF0TG5nKHQpKS5fcm91bmQoKTtyZXR1cm4gZS5fc3VidHJhY3QodGhpcy5nZXRQaXhlbE9yaWdpbigpKX0sY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQ6ZnVuY3Rpb24odCl7cmV0dXJuIG8ucG9pbnQodCkuc3VidHJhY3QodGhpcy5fZ2V0TWFwUGFuZVBvcygpKX0sbGF5ZXJQb2ludFRvQ29udGFpbmVyUG9pbnQ6ZnVuY3Rpb24odCl7cmV0dXJuIG8ucG9pbnQodCkuYWRkKHRoaXMuX2dldE1hcFBhbmVQb3MoKSl9LGNvbnRhaW5lclBvaW50VG9MYXRMbmc6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChvLnBvaW50KHQpKTtyZXR1cm4gdGhpcy5sYXllclBvaW50VG9MYXRMbmcoZSl9LGxhdExuZ1RvQ29udGFpbmVyUG9pbnQ6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMubGF5ZXJQb2ludFRvQ29udGFpbmVyUG9pbnQodGhpcy5sYXRMbmdUb0xheWVyUG9pbnQoby5sYXRMbmcodCkpKX0sbW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQ6ZnVuY3Rpb24odCl7cmV0dXJuIG8uRG9tRXZlbnQuZ2V0TW91c2VQb3NpdGlvbih0LHRoaXMuX2NvbnRhaW5lcil9LG1vdXNlRXZlbnRUb0xheWVyUG9pbnQ6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQodGhpcy5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludCh0KSl9LG1vdXNlRXZlbnRUb0xhdExuZzpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5sYXllclBvaW50VG9MYXRMbmcodGhpcy5tb3VzZUV2ZW50VG9MYXllclBvaW50KHQpKX0sX2luaXRDb250YWluZXI6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5fY29udGFpbmVyPW8uRG9tVXRpbC5nZXQodCk7aWYoIWUpdGhyb3cgbmV3IEVycm9yKFwiTWFwIGNvbnRhaW5lciBub3QgZm91bmQuXCIpO2lmKGUuX2xlYWZsZXQpdGhyb3cgbmV3IEVycm9yKFwiTWFwIGNvbnRhaW5lciBpcyBhbHJlYWR5IGluaXRpYWxpemVkLlwiKTtlLl9sZWFmbGV0PSEwfSxfaW5pdExheW91dDpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX2NvbnRhaW5lcjtvLkRvbVV0aWwuYWRkQ2xhc3ModCxcImxlYWZsZXQtY29udGFpbmVyXCIrKG8uQnJvd3Nlci50b3VjaD9cIiBsZWFmbGV0LXRvdWNoXCI6XCJcIikrKG8uQnJvd3Nlci5yZXRpbmE/XCIgbGVhZmxldC1yZXRpbmFcIjpcIlwiKSsodGhpcy5vcHRpb25zLmZhZGVBbmltYXRpb24/XCIgbGVhZmxldC1mYWRlLWFuaW1cIjpcIlwiKSk7dmFyIGU9by5Eb21VdGlsLmdldFN0eWxlKHQsXCJwb3NpdGlvblwiKTtcImFic29sdXRlXCIhPT1lJiZcInJlbGF0aXZlXCIhPT1lJiZcImZpeGVkXCIhPT1lJiYodC5zdHlsZS5wb3NpdGlvbj1cInJlbGF0aXZlXCIpLHRoaXMuX2luaXRQYW5lcygpLHRoaXMuX2luaXRDb250cm9sUG9zJiZ0aGlzLl9pbml0Q29udHJvbFBvcygpfSxfaW5pdFBhbmVzOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fcGFuZXM9e307dGhpcy5fbWFwUGFuZT10Lm1hcFBhbmU9dGhpcy5fY3JlYXRlUGFuZShcImxlYWZsZXQtbWFwLXBhbmVcIix0aGlzLl9jb250YWluZXIpLHRoaXMuX3RpbGVQYW5lPXQudGlsZVBhbmU9dGhpcy5fY3JlYXRlUGFuZShcImxlYWZsZXQtdGlsZS1wYW5lXCIsdGhpcy5fbWFwUGFuZSksdC5vYmplY3RzUGFuZT10aGlzLl9jcmVhdGVQYW5lKFwibGVhZmxldC1vYmplY3RzLXBhbmVcIix0aGlzLl9tYXBQYW5lKSx0LnNoYWRvd1BhbmU9dGhpcy5fY3JlYXRlUGFuZShcImxlYWZsZXQtc2hhZG93LXBhbmVcIiksdC5vdmVybGF5UGFuZT10aGlzLl9jcmVhdGVQYW5lKFwibGVhZmxldC1vdmVybGF5LXBhbmVcIiksdC5tYXJrZXJQYW5lPXRoaXMuX2NyZWF0ZVBhbmUoXCJsZWFmbGV0LW1hcmtlci1wYW5lXCIpLHQucG9wdXBQYW5lPXRoaXMuX2NyZWF0ZVBhbmUoXCJsZWFmbGV0LXBvcHVwLXBhbmVcIik7dmFyIGU9XCIgbGVhZmxldC16b29tLWhpZGVcIjt0aGlzLm9wdGlvbnMubWFya2VyWm9vbUFuaW1hdGlvbnx8KG8uRG9tVXRpbC5hZGRDbGFzcyh0Lm1hcmtlclBhbmUsZSksby5Eb21VdGlsLmFkZENsYXNzKHQuc2hhZG93UGFuZSxlKSxvLkRvbVV0aWwuYWRkQ2xhc3ModC5wb3B1cFBhbmUsZSkpfSxfY3JlYXRlUGFuZTpmdW5jdGlvbih0LGUpe3JldHVybiBvLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsdCxlfHx0aGlzLl9wYW5lcy5vYmplY3RzUGFuZSl9LF9jbGVhclBhbmVzOmZ1bmN0aW9uKCl7dGhpcy5fY29udGFpbmVyLnJlbW92ZUNoaWxkKHRoaXMuX21hcFBhbmUpfSxfYWRkTGF5ZXJzOmZ1bmN0aW9uKHQpe3Q9dD9vLlV0aWwuaXNBcnJheSh0KT90Olt0XTpbXTtmb3IodmFyIGU9MCxpPXQubGVuZ3RoO2k+ZTtlKyspdGhpcy5hZGRMYXllcih0W2VdKX0sX3Jlc2V0VmlldzpmdW5jdGlvbih0LGUsaSxuKXt2YXIgcz10aGlzLl96b29tIT09ZTtufHwodGhpcy5maXJlKFwibW92ZXN0YXJ0XCIpLHMmJnRoaXMuZmlyZShcInpvb21zdGFydFwiKSksdGhpcy5fem9vbT1lLHRoaXMuX2luaXRpYWxDZW50ZXI9dCx0aGlzLl9pbml0aWFsVG9wTGVmdFBvaW50PXRoaXMuX2dldE5ld1RvcExlZnRQb2ludCh0KSxpP3RoaXMuX2luaXRpYWxUb3BMZWZ0UG9pbnQuX2FkZCh0aGlzLl9nZXRNYXBQYW5lUG9zKCkpOm8uRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9tYXBQYW5lLG5ldyBvLlBvaW50KDAsMCkpLHRoaXMuX3RpbGVMYXllcnNUb0xvYWQ9dGhpcy5fdGlsZUxheWVyc051bTt2YXIgYT0hdGhpcy5fbG9hZGVkO3RoaXMuX2xvYWRlZD0hMCxhJiYodGhpcy5maXJlKFwibG9hZFwiKSx0aGlzLmVhY2hMYXllcih0aGlzLl9sYXllckFkZCx0aGlzKSksdGhpcy5maXJlKFwidmlld3Jlc2V0XCIse2hhcmQ6IWl9KSx0aGlzLmZpcmUoXCJtb3ZlXCIpLChzfHxuKSYmdGhpcy5maXJlKFwiem9vbWVuZFwiKSx0aGlzLmZpcmUoXCJtb3ZlZW5kXCIse2hhcmQ6IWl9KX0sX3Jhd1BhbkJ5OmZ1bmN0aW9uKHQpe28uRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9tYXBQYW5lLHRoaXMuX2dldE1hcFBhbmVQb3MoKS5zdWJ0cmFjdCh0KSl9LF9nZXRab29tU3BhbjpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldE1heFpvb20oKS10aGlzLmdldE1pblpvb20oKX0sX3VwZGF0ZVpvb21MZXZlbHM6ZnVuY3Rpb24oKXt2YXIgdCxlPTEvMCxuPS0xLzAsbz10aGlzLl9nZXRab29tU3BhbigpO2Zvcih0IGluIHRoaXMuX3pvb21Cb3VuZExheWVycyl7dmFyIHM9dGhpcy5fem9vbUJvdW5kTGF5ZXJzW3RdO2lzTmFOKHMub3B0aW9ucy5taW5ab29tKXx8KGU9TWF0aC5taW4oZSxzLm9wdGlvbnMubWluWm9vbSkpLGlzTmFOKHMub3B0aW9ucy5tYXhab29tKXx8KG49TWF0aC5tYXgobixzLm9wdGlvbnMubWF4Wm9vbSkpfXQ9PT1pP3RoaXMuX2xheWVyc01heFpvb209dGhpcy5fbGF5ZXJzTWluWm9vbT1pOih0aGlzLl9sYXllcnNNYXhab29tPW4sdGhpcy5fbGF5ZXJzTWluWm9vbT1lKSxvIT09dGhpcy5fZ2V0Wm9vbVNwYW4oKSYmdGhpcy5maXJlKFwiem9vbWxldmVsc2NoYW5nZVwiKX0sX3Bhbkluc2lkZU1heEJvdW5kczpmdW5jdGlvbigpe3RoaXMucGFuSW5zaWRlQm91bmRzKHRoaXMub3B0aW9ucy5tYXhCb3VuZHMpfSxfY2hlY2tJZkxvYWRlZDpmdW5jdGlvbigpe2lmKCF0aGlzLl9sb2FkZWQpdGhyb3cgbmV3IEVycm9yKFwiU2V0IG1hcCBjZW50ZXIgYW5kIHpvb20gZmlyc3QuXCIpfSxfaW5pdEV2ZW50czpmdW5jdGlvbihlKXtpZihvLkRvbUV2ZW50KXtlPWV8fFwib25cIixvLkRvbUV2ZW50W2VdKHRoaXMuX2NvbnRhaW5lcixcImNsaWNrXCIsdGhpcy5fb25Nb3VzZUNsaWNrLHRoaXMpO3ZhciBpLG4scz1bXCJkYmxjbGlja1wiLFwibW91c2Vkb3duXCIsXCJtb3VzZXVwXCIsXCJtb3VzZWVudGVyXCIsXCJtb3VzZWxlYXZlXCIsXCJtb3VzZW1vdmVcIixcImNvbnRleHRtZW51XCJdO2ZvcihpPTAsbj1zLmxlbmd0aDtuPmk7aSsrKW8uRG9tRXZlbnRbZV0odGhpcy5fY29udGFpbmVyLHNbaV0sdGhpcy5fZmlyZU1vdXNlRXZlbnQsdGhpcyk7dGhpcy5vcHRpb25zLnRyYWNrUmVzaXplJiZvLkRvbUV2ZW50W2VdKHQsXCJyZXNpemVcIix0aGlzLl9vblJlc2l6ZSx0aGlzKX19LF9vblJlc2l6ZTpmdW5jdGlvbigpe28uVXRpbC5jYW5jZWxBbmltRnJhbWUodGhpcy5fcmVzaXplUmVxdWVzdCksdGhpcy5fcmVzaXplUmVxdWVzdD1vLlV0aWwucmVxdWVzdEFuaW1GcmFtZSh0aGlzLmludmFsaWRhdGVTaXplLHRoaXMsITEsdGhpcy5fY29udGFpbmVyKX0sX29uTW91c2VDbGljazpmdW5jdGlvbih0KXshdGhpcy5fbG9hZGVkfHwhdC5fc2ltdWxhdGVkJiZ0aGlzLmRyYWdnaW5nJiZ0aGlzLmRyYWdnaW5nLm1vdmVkKCl8fG8uRG9tRXZlbnQuX3NraXBwZWQodCl8fCh0aGlzLmZpcmUoXCJwcmVjbGlja1wiKSx0aGlzLl9maXJlTW91c2VFdmVudCh0KSl9LF9maXJlTW91c2VFdmVudDpmdW5jdGlvbih0KXtpZih0aGlzLl9sb2FkZWQmJiFvLkRvbUV2ZW50Ll9za2lwcGVkKHQpKXt2YXIgZT10LnR5cGU7aWYoZT1cIm1vdXNlZW50ZXJcIj09PWU/XCJtb3VzZW92ZXJcIjpcIm1vdXNlbGVhdmVcIj09PWU/XCJtb3VzZW91dFwiOmUsdGhpcy5oYXNFdmVudExpc3RlbmVycyhlKSl7XCJjb250ZXh0bWVudVwiPT09ZSYmby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCh0KTt2YXIgaT10aGlzLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KHQpLG49dGhpcy5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChpKSxzPXRoaXMubGF5ZXJQb2ludFRvTGF0TG5nKG4pO3RoaXMuZmlyZShlLHtsYXRsbmc6cyxsYXllclBvaW50Om4sY29udGFpbmVyUG9pbnQ6aSxvcmlnaW5hbEV2ZW50OnR9KX19fSxfb25UaWxlTGF5ZXJMb2FkOmZ1bmN0aW9uKCl7dGhpcy5fdGlsZUxheWVyc1RvTG9hZC0tLHRoaXMuX3RpbGVMYXllcnNOdW0mJiF0aGlzLl90aWxlTGF5ZXJzVG9Mb2FkJiZ0aGlzLmZpcmUoXCJ0aWxlbGF5ZXJzbG9hZFwiKX0sX2NsZWFySGFuZGxlcnM6ZnVuY3Rpb24oKXtmb3IodmFyIHQ9MCxlPXRoaXMuX2hhbmRsZXJzLmxlbmd0aDtlPnQ7dCsrKXRoaXMuX2hhbmRsZXJzW3RdLmRpc2FibGUoKX0sd2hlblJlYWR5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2xvYWRlZD90LmNhbGwoZXx8dGhpcyx0aGlzKTp0aGlzLm9uKFwibG9hZFwiLHQsZSksdGhpc30sX2xheWVyQWRkOmZ1bmN0aW9uKHQpe3Qub25BZGQodGhpcyksdGhpcy5maXJlKFwibGF5ZXJhZGRcIix7bGF5ZXI6dH0pfSxfZ2V0TWFwUGFuZVBvczpmdW5jdGlvbigpe3JldHVybiBvLkRvbVV0aWwuZ2V0UG9zaXRpb24odGhpcy5fbWFwUGFuZSl9LF9tb3ZlZDpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX2dldE1hcFBhbmVQb3MoKTtyZXR1cm4gdCYmIXQuZXF1YWxzKFswLDBdKX0sX2dldFRvcExlZnRQb2ludDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmdldFBpeGVsT3JpZ2luKCkuc3VidHJhY3QodGhpcy5fZ2V0TWFwUGFuZVBvcygpKX0sX2dldE5ld1RvcExlZnRQb2ludDpmdW5jdGlvbih0LGUpe3ZhciBpPXRoaXMuZ2V0U2l6ZSgpLl9kaXZpZGVCeSgyKTtyZXR1cm4gdGhpcy5wcm9qZWN0KHQsZSkuX3N1YnRyYWN0KGkpLl9yb3VuZCgpfSxfbGF0TG5nVG9OZXdMYXllclBvaW50OmZ1bmN0aW9uKHQsZSxpKXt2YXIgbj10aGlzLl9nZXROZXdUb3BMZWZ0UG9pbnQoaSxlKS5hZGQodGhpcy5fZ2V0TWFwUGFuZVBvcygpKTtyZXR1cm4gdGhpcy5wcm9qZWN0KHQsZSkuX3N1YnRyYWN0KG4pfSxfZ2V0Q2VudGVyTGF5ZXJQb2ludDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KHRoaXMuZ2V0U2l6ZSgpLl9kaXZpZGVCeSgyKSl9LF9nZXRDZW50ZXJPZmZzZXQ6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMubGF0TG5nVG9MYXllclBvaW50KHQpLnN1YnRyYWN0KHRoaXMuX2dldENlbnRlckxheWVyUG9pbnQoKSl9LF9saW1pdFpvb206ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRNaW5ab29tKCksaT10aGlzLmdldE1heFpvb20oKTtyZXR1cm4gTWF0aC5tYXgoZSxNYXRoLm1pbihpLHQpKX19KSxvLm1hcD1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgby5NYXAodCxlKX0sby5Qcm9qZWN0aW9uLk1lcmNhdG9yPXtNQVhfTEFUSVRVREU6ODUuMDg0MDU5MTU1NixSX01JTk9SOjYzNTY3NTIuMzE0MjQ1MTc5LFJfTUFKT1I6NjM3ODEzNyxwcm9qZWN0OmZ1bmN0aW9uKHQpe3ZhciBlPW8uTGF0TG5nLkRFR19UT19SQUQsaT10aGlzLk1BWF9MQVRJVFVERSxuPU1hdGgubWF4KE1hdGgubWluKGksdC5sYXQpLC1pKSxzPXRoaXMuUl9NQUpPUixhPXRoaXMuUl9NSU5PUixyPXQubG5nKmUqcyxoPW4qZSxsPWEvcyx1PU1hdGguc3FydCgxLWwqbCksYz11Kk1hdGguc2luKGgpO2M9TWF0aC5wb3coKDEtYykvKDErYyksLjUqdSk7dmFyIGQ9TWF0aC50YW4oLjUqKC41Kk1hdGguUEktaCkpL2M7cmV0dXJuIGg9LXMqTWF0aC5sb2coZCksbmV3IG8uUG9pbnQocixoKX0sdW5wcm9qZWN0OmZ1bmN0aW9uKHQpe2Zvcih2YXIgZSxpPW8uTGF0TG5nLlJBRF9UT19ERUcsbj10aGlzLlJfTUFKT1Iscz10aGlzLlJfTUlOT1IsYT10LngqaS9uLHI9cy9uLGg9TWF0aC5zcXJ0KDEtcipyKSxsPU1hdGguZXhwKC10LnkvbiksdT1NYXRoLlBJLzItMipNYXRoLmF0YW4obCksYz0xNSxkPTFlLTcscD1jLF89LjE7TWF0aC5hYnMoXyk+ZCYmLS1wPjA7KWU9aCpNYXRoLnNpbih1KSxfPU1hdGguUEkvMi0yKk1hdGguYXRhbihsKk1hdGgucG93KCgxLWUpLygxK2UpLC41KmgpKS11LHUrPV87cmV0dXJuIG5ldyBvLkxhdExuZyh1KmksYSl9fSxvLkNSUy5FUFNHMzM5NT1vLmV4dGVuZCh7fSxvLkNSUyx7Y29kZTpcIkVQU0c6MzM5NVwiLHByb2plY3Rpb246by5Qcm9qZWN0aW9uLk1lcmNhdG9yLHRyYW5zZm9ybWF0aW9uOmZ1bmN0aW9uKCl7dmFyIHQ9by5Qcm9qZWN0aW9uLk1lcmNhdG9yLGU9dC5SX01BSk9SLGk9dC5SX01JTk9SO3JldHVybiBuZXcgby5UcmFuc2Zvcm1hdGlvbiguNS8oTWF0aC5QSSplKSwuNSwtLjUvKE1hdGguUEkqaSksLjUpfSgpfSksby5UaWxlTGF5ZXI9by5DbGFzcy5leHRlbmQoe2luY2x1ZGVzOm8uTWl4aW4uRXZlbnRzLG9wdGlvbnM6e21pblpvb206MCxtYXhab29tOjE4LHRpbGVTaXplOjI1NixzdWJkb21haW5zOlwiYWJjXCIsZXJyb3JUaWxlVXJsOlwiXCIsYXR0cmlidXRpb246XCJcIix6b29tT2Zmc2V0OjAsb3BhY2l0eToxLHVubG9hZEludmlzaWJsZVRpbGVzOm8uQnJvd3Nlci5tb2JpbGUsdXBkYXRlV2hlbklkbGU6by5Ccm93c2VyLm1vYmlsZX0saW5pdGlhbGl6ZTpmdW5jdGlvbih0LGUpe2U9by5zZXRPcHRpb25zKHRoaXMsZSksZS5kZXRlY3RSZXRpbmEmJm8uQnJvd3Nlci5yZXRpbmEmJmUubWF4Wm9vbT4wJiYoZS50aWxlU2l6ZT1NYXRoLmZsb29yKGUudGlsZVNpemUvMiksZS56b29tT2Zmc2V0KyssZS5taW5ab29tPjAmJmUubWluWm9vbS0tLHRoaXMub3B0aW9ucy5tYXhab29tLS0pLGUuYm91bmRzJiYoZS5ib3VuZHM9by5sYXRMbmdCb3VuZHMoZS5ib3VuZHMpKSx0aGlzLl91cmw9dDt2YXIgaT10aGlzLm9wdGlvbnMuc3ViZG9tYWlucztcInN0cmluZ1wiPT10eXBlb2YgaSYmKHRoaXMub3B0aW9ucy5zdWJkb21haW5zPWkuc3BsaXQoXCJcIikpfSxvbkFkZDpmdW5jdGlvbih0KXt0aGlzLl9tYXA9dCx0aGlzLl9hbmltYXRlZD10Ll96b29tQW5pbWF0ZWQsdGhpcy5faW5pdENvbnRhaW5lcigpLHRoaXMuX2NyZWF0ZVRpbGVQcm90bygpLHQub24oe3ZpZXdyZXNldDp0aGlzLl9yZXNldCxtb3ZlZW5kOnRoaXMuX3VwZGF0ZX0sdGhpcyksdGhpcy5fYW5pbWF0ZWQmJnQub24oe3pvb21hbmltOnRoaXMuX2FuaW1hdGVab29tLHpvb21lbmQ6dGhpcy5fZW5kWm9vbUFuaW19LHRoaXMpLHRoaXMub3B0aW9ucy51cGRhdGVXaGVuSWRsZXx8KHRoaXMuX2xpbWl0ZWRVcGRhdGU9by5VdGlsLmxpbWl0RXhlY0J5SW50ZXJ2YWwodGhpcy5fdXBkYXRlLDE1MCx0aGlzKSx0Lm9uKFwibW92ZVwiLHRoaXMuX2xpbWl0ZWRVcGRhdGUsdGhpcykpLHRoaXMuX3Jlc2V0KCksdGhpcy5fdXBkYXRlKClcbn0sYWRkVG86ZnVuY3Rpb24odCl7cmV0dXJuIHQuYWRkTGF5ZXIodGhpcyksdGhpc30sb25SZW1vdmU6ZnVuY3Rpb24odCl7dGhpcy5fY29udGFpbmVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5fY29udGFpbmVyKSx0Lm9mZih7dmlld3Jlc2V0OnRoaXMuX3Jlc2V0LG1vdmVlbmQ6dGhpcy5fdXBkYXRlfSx0aGlzKSx0aGlzLl9hbmltYXRlZCYmdC5vZmYoe3pvb21hbmltOnRoaXMuX2FuaW1hdGVab29tLHpvb21lbmQ6dGhpcy5fZW5kWm9vbUFuaW19LHRoaXMpLHRoaXMub3B0aW9ucy51cGRhdGVXaGVuSWRsZXx8dC5vZmYoXCJtb3ZlXCIsdGhpcy5fbGltaXRlZFVwZGF0ZSx0aGlzKSx0aGlzLl9jb250YWluZXI9bnVsbCx0aGlzLl9tYXA9bnVsbH0sYnJpbmdUb0Zyb250OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbWFwLl9wYW5lcy50aWxlUGFuZTtyZXR1cm4gdGhpcy5fY29udGFpbmVyJiYodC5hcHBlbmRDaGlsZCh0aGlzLl9jb250YWluZXIpLHRoaXMuX3NldEF1dG9aSW5kZXgodCxNYXRoLm1heCkpLHRoaXN9LGJyaW5nVG9CYWNrOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbWFwLl9wYW5lcy50aWxlUGFuZTtyZXR1cm4gdGhpcy5fY29udGFpbmVyJiYodC5pbnNlcnRCZWZvcmUodGhpcy5fY29udGFpbmVyLHQuZmlyc3RDaGlsZCksdGhpcy5fc2V0QXV0b1pJbmRleCh0LE1hdGgubWluKSksdGhpc30sZ2V0QXR0cmlidXRpb246ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5vcHRpb25zLmF0dHJpYnV0aW9ufSxnZXRDb250YWluZXI6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fY29udGFpbmVyfSxzZXRPcGFjaXR5OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLm9wdGlvbnMub3BhY2l0eT10LHRoaXMuX21hcCYmdGhpcy5fdXBkYXRlT3BhY2l0eSgpLHRoaXN9LHNldFpJbmRleDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5vcHRpb25zLnpJbmRleD10LHRoaXMuX3VwZGF0ZVpJbmRleCgpLHRoaXN9LHNldFVybDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl91cmw9dCxlfHx0aGlzLnJlZHJhdygpLHRoaXN9LHJlZHJhdzpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9tYXAmJih0aGlzLl9yZXNldCh7aGFyZDohMH0pLHRoaXMuX3VwZGF0ZSgpKSx0aGlzfSxfdXBkYXRlWkluZGV4OmZ1bmN0aW9uKCl7dGhpcy5fY29udGFpbmVyJiZ0aGlzLm9wdGlvbnMuekluZGV4IT09aSYmKHRoaXMuX2NvbnRhaW5lci5zdHlsZS56SW5kZXg9dGhpcy5vcHRpb25zLnpJbmRleCl9LF9zZXRBdXRvWkluZGV4OmZ1bmN0aW9uKHQsZSl7dmFyIGksbixvLHM9dC5jaGlsZHJlbixhPS1lKDEvMCwtMS8wKTtmb3Iobj0wLG89cy5sZW5ndGg7bz5uO24rKylzW25dIT09dGhpcy5fY29udGFpbmVyJiYoaT1wYXJzZUludChzW25dLnN0eWxlLnpJbmRleCwxMCksaXNOYU4oaSl8fChhPWUoYSxpKSkpO3RoaXMub3B0aW9ucy56SW5kZXg9dGhpcy5fY29udGFpbmVyLnN0eWxlLnpJbmRleD0oaXNGaW5pdGUoYSk/YTowKStlKDEsLTEpfSxfdXBkYXRlT3BhY2l0eTpmdW5jdGlvbigpe3ZhciB0LGU9dGhpcy5fdGlsZXM7aWYoby5Ccm93c2VyLmllbHQ5KWZvcih0IGluIGUpby5Eb21VdGlsLnNldE9wYWNpdHkoZVt0XSx0aGlzLm9wdGlvbnMub3BhY2l0eSk7ZWxzZSBvLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9jb250YWluZXIsdGhpcy5vcHRpb25zLm9wYWNpdHkpfSxfaW5pdENvbnRhaW5lcjpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX21hcC5fcGFuZXMudGlsZVBhbmU7aWYoIXRoaXMuX2NvbnRhaW5lcil7aWYodGhpcy5fY29udGFpbmVyPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixcImxlYWZsZXQtbGF5ZXJcIiksdGhpcy5fdXBkYXRlWkluZGV4KCksdGhpcy5fYW5pbWF0ZWQpe3ZhciBlPVwibGVhZmxldC10aWxlLWNvbnRhaW5lciBsZWFmbGV0LXpvb20tYW5pbWF0ZWRcIjt0aGlzLl9iZ0J1ZmZlcj1vLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsZSx0aGlzLl9jb250YWluZXIpLHRoaXMuX3RpbGVDb250YWluZXI9by5Eb21VdGlsLmNyZWF0ZShcImRpdlwiLGUsdGhpcy5fY29udGFpbmVyKX1lbHNlIHRoaXMuX3RpbGVDb250YWluZXI9dGhpcy5fY29udGFpbmVyO3QuYXBwZW5kQ2hpbGQodGhpcy5fY29udGFpbmVyKSx0aGlzLm9wdGlvbnMub3BhY2l0eTwxJiZ0aGlzLl91cGRhdGVPcGFjaXR5KCl9fSxfcmVzZXQ6ZnVuY3Rpb24odCl7Zm9yKHZhciBlIGluIHRoaXMuX3RpbGVzKXRoaXMuZmlyZShcInRpbGV1bmxvYWRcIix7dGlsZTp0aGlzLl90aWxlc1tlXX0pO3RoaXMuX3RpbGVzPXt9LHRoaXMuX3RpbGVzVG9Mb2FkPTAsdGhpcy5vcHRpb25zLnJldXNlVGlsZXMmJih0aGlzLl91bnVzZWRUaWxlcz1bXSksdGhpcy5fdGlsZUNvbnRhaW5lci5pbm5lckhUTUw9XCJcIix0aGlzLl9hbmltYXRlZCYmdCYmdC5oYXJkJiZ0aGlzLl9jbGVhckJnQnVmZmVyKCksdGhpcy5faW5pdENvbnRhaW5lcigpfSxfdXBkYXRlOmZ1bmN0aW9uKCl7aWYodGhpcy5fbWFwKXt2YXIgdD10aGlzLl9tYXAuZ2V0UGl4ZWxCb3VuZHMoKSxlPXRoaXMuX21hcC5nZXRab29tKCksaT10aGlzLm9wdGlvbnMudGlsZVNpemU7aWYoIShlPnRoaXMub3B0aW9ucy5tYXhab29tfHxlPHRoaXMub3B0aW9ucy5taW5ab29tKSl7dmFyIG49by5ib3VuZHModC5taW4uZGl2aWRlQnkoaSkuX2Zsb29yKCksdC5tYXguZGl2aWRlQnkoaSkuX2Zsb29yKCkpO3RoaXMuX2FkZFRpbGVzRnJvbUNlbnRlck91dChuKSwodGhpcy5vcHRpb25zLnVubG9hZEludmlzaWJsZVRpbGVzfHx0aGlzLm9wdGlvbnMucmV1c2VUaWxlcykmJnRoaXMuX3JlbW92ZU90aGVyVGlsZXMobil9fX0sX2FkZFRpbGVzRnJvbUNlbnRlck91dDpmdW5jdGlvbih0KXt2YXIgaSxuLHMsYT1bXSxyPXQuZ2V0Q2VudGVyKCk7Zm9yKGk9dC5taW4ueTtpPD10Lm1heC55O2krKylmb3Iobj10Lm1pbi54O248PXQubWF4Lng7bisrKXM9bmV3IG8uUG9pbnQobixpKSx0aGlzLl90aWxlU2hvdWxkQmVMb2FkZWQocykmJmEucHVzaChzKTt2YXIgaD1hLmxlbmd0aDtpZigwIT09aCl7YS5zb3J0KGZ1bmN0aW9uKHQsZSl7cmV0dXJuIHQuZGlzdGFuY2VUbyhyKS1lLmRpc3RhbmNlVG8ocil9KTt2YXIgbD1lLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtmb3IodGhpcy5fdGlsZXNUb0xvYWR8fHRoaXMuZmlyZShcImxvYWRpbmdcIiksdGhpcy5fdGlsZXNUb0xvYWQrPWgsbj0wO2g+bjtuKyspdGhpcy5fYWRkVGlsZShhW25dLGwpO3RoaXMuX3RpbGVDb250YWluZXIuYXBwZW5kQ2hpbGQobCl9fSxfdGlsZVNob3VsZEJlTG9hZGVkOmZ1bmN0aW9uKHQpe2lmKHQueCtcIjpcIit0LnkgaW4gdGhpcy5fdGlsZXMpcmV0dXJuITE7dmFyIGU9dGhpcy5vcHRpb25zO2lmKCFlLmNvbnRpbnVvdXNXb3JsZCl7dmFyIGk9dGhpcy5fZ2V0V3JhcFRpbGVOdW0oKTtpZihlLm5vV3JhcCYmKHQueDwwfHx0Lng+PWkpfHx0Lnk8MHx8dC55Pj1pKXJldHVybiExfWlmKGUuYm91bmRzKXt2YXIgbj1lLnRpbGVTaXplLG89dC5tdWx0aXBseUJ5KG4pLHM9by5hZGQoW24sbl0pLGE9dGhpcy5fbWFwLnVucHJvamVjdChvKSxyPXRoaXMuX21hcC51bnByb2plY3Qocyk7aWYoZS5jb250aW51b3VzV29ybGR8fGUubm9XcmFwfHwoYT1hLndyYXAoKSxyPXIud3JhcCgpKSwhZS5ib3VuZHMuaW50ZXJzZWN0cyhbYSxyXSkpcmV0dXJuITF9cmV0dXJuITB9LF9yZW1vdmVPdGhlclRpbGVzOmZ1bmN0aW9uKHQpe3ZhciBlLGksbixvO2ZvcihvIGluIHRoaXMuX3RpbGVzKWU9by5zcGxpdChcIjpcIiksaT1wYXJzZUludChlWzBdLDEwKSxuPXBhcnNlSW50KGVbMV0sMTApLChpPHQubWluLnh8fGk+dC5tYXgueHx8bjx0Lm1pbi55fHxuPnQubWF4LnkpJiZ0aGlzLl9yZW1vdmVUaWxlKG8pfSxfcmVtb3ZlVGlsZTpmdW5jdGlvbih0KXt2YXIgZT10aGlzLl90aWxlc1t0XTt0aGlzLmZpcmUoXCJ0aWxldW5sb2FkXCIse3RpbGU6ZSx1cmw6ZS5zcmN9KSx0aGlzLm9wdGlvbnMucmV1c2VUaWxlcz8oby5Eb21VdGlsLnJlbW92ZUNsYXNzKGUsXCJsZWFmbGV0LXRpbGUtbG9hZGVkXCIpLHRoaXMuX3VudXNlZFRpbGVzLnB1c2goZSkpOmUucGFyZW50Tm9kZT09PXRoaXMuX3RpbGVDb250YWluZXImJnRoaXMuX3RpbGVDb250YWluZXIucmVtb3ZlQ2hpbGQoZSksby5Ccm93c2VyLmFuZHJvaWR8fChlLm9ubG9hZD1udWxsLGUuc3JjPW8uVXRpbC5lbXB0eUltYWdlVXJsKSxkZWxldGUgdGhpcy5fdGlsZXNbdF19LF9hZGRUaWxlOmZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fZ2V0VGlsZVBvcyh0KSxuPXRoaXMuX2dldFRpbGUoKTtvLkRvbVV0aWwuc2V0UG9zaXRpb24obixpLG8uQnJvd3Nlci5jaHJvbWV8fG8uQnJvd3Nlci5hbmRyb2lkMjMpLHRoaXMuX3RpbGVzW3QueCtcIjpcIit0LnldPW4sdGhpcy5fbG9hZFRpbGUobix0KSxuLnBhcmVudE5vZGUhPT10aGlzLl90aWxlQ29udGFpbmVyJiZlLmFwcGVuZENoaWxkKG4pfSxfZ2V0Wm9vbUZvclVybDpmdW5jdGlvbigpe3ZhciB0PXRoaXMub3B0aW9ucyxlPXRoaXMuX21hcC5nZXRab29tKCk7cmV0dXJuIHQuem9vbVJldmVyc2UmJihlPXQubWF4Wm9vbS1lKSxlK3Quem9vbU9mZnNldH0sX2dldFRpbGVQb3M6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5fbWFwLmdldFBpeGVsT3JpZ2luKCksaT10aGlzLm9wdGlvbnMudGlsZVNpemU7cmV0dXJuIHQubXVsdGlwbHlCeShpKS5zdWJ0cmFjdChlKX0sZ2V0VGlsZVVybDpmdW5jdGlvbih0KXtyZXR1cm4gby5VdGlsLnRlbXBsYXRlKHRoaXMuX3VybCxvLmV4dGVuZCh7czp0aGlzLl9nZXRTdWJkb21haW4odCksejp0LnoseDp0LngseTp0Lnl9LHRoaXMub3B0aW9ucykpfSxfZ2V0V3JhcFRpbGVOdW06ZnVuY3Rpb24oKXtyZXR1cm4gTWF0aC5wb3coMix0aGlzLl9nZXRab29tRm9yVXJsKCkpfSxfYWRqdXN0VGlsZVBvaW50OmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX2dldFdyYXBUaWxlTnVtKCk7dGhpcy5vcHRpb25zLmNvbnRpbnVvdXNXb3JsZHx8dGhpcy5vcHRpb25zLm5vV3JhcHx8KHQueD0odC54JWUrZSklZSksdGhpcy5vcHRpb25zLnRtcyYmKHQueT1lLXQueS0xKSx0Lno9dGhpcy5fZ2V0Wm9vbUZvclVybCgpfSxfZ2V0U3ViZG9tYWluOmZ1bmN0aW9uKHQpe3ZhciBlPU1hdGguYWJzKHQueCt0LnkpJXRoaXMub3B0aW9ucy5zdWJkb21haW5zLmxlbmd0aDtyZXR1cm4gdGhpcy5vcHRpb25zLnN1YmRvbWFpbnNbZV19LF9jcmVhdGVUaWxlUHJvdG86ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl90aWxlSW1nPW8uRG9tVXRpbC5jcmVhdGUoXCJpbWdcIixcImxlYWZsZXQtdGlsZVwiKTt0LnN0eWxlLndpZHRoPXQuc3R5bGUuaGVpZ2h0PXRoaXMub3B0aW9ucy50aWxlU2l6ZStcInB4XCIsdC5nYWxsZXJ5aW1nPVwibm9cIn0sX2dldFRpbGU6ZnVuY3Rpb24oKXtpZih0aGlzLm9wdGlvbnMucmV1c2VUaWxlcyYmdGhpcy5fdW51c2VkVGlsZXMubGVuZ3RoPjApe3ZhciB0PXRoaXMuX3VudXNlZFRpbGVzLnBvcCgpO3JldHVybiB0aGlzLl9yZXNldFRpbGUodCksdH1yZXR1cm4gdGhpcy5fY3JlYXRlVGlsZSgpfSxfcmVzZXRUaWxlOmZ1bmN0aW9uKCl7fSxfY3JlYXRlVGlsZTpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX3RpbGVJbWcuY2xvbmVOb2RlKCExKTtyZXR1cm4gdC5vbnNlbGVjdHN0YXJ0PXQub25tb3VzZW1vdmU9by5VdGlsLmZhbHNlRm4sby5Ccm93c2VyLmllbHQ5JiZ0aGlzLm9wdGlvbnMub3BhY2l0eSE9PWkmJm8uRG9tVXRpbC5zZXRPcGFjaXR5KHQsdGhpcy5vcHRpb25zLm9wYWNpdHkpLHR9LF9sb2FkVGlsZTpmdW5jdGlvbih0LGUpe3QuX2xheWVyPXRoaXMsdC5vbmxvYWQ9dGhpcy5fdGlsZU9uTG9hZCx0Lm9uZXJyb3I9dGhpcy5fdGlsZU9uRXJyb3IsdGhpcy5fYWRqdXN0VGlsZVBvaW50KGUpLHQuc3JjPXRoaXMuZ2V0VGlsZVVybChlKX0sX3RpbGVMb2FkZWQ6ZnVuY3Rpb24oKXt0aGlzLl90aWxlc1RvTG9hZC0tLHRoaXMuX3RpbGVzVG9Mb2FkfHwodGhpcy5maXJlKFwibG9hZFwiKSx0aGlzLl9hbmltYXRlZCYmKGNsZWFyVGltZW91dCh0aGlzLl9jbGVhckJnQnVmZmVyVGltZXIpLHRoaXMuX2NsZWFyQmdCdWZmZXJUaW1lcj1zZXRUaW1lb3V0KG8uYmluZCh0aGlzLl9jbGVhckJnQnVmZmVyLHRoaXMpLDUwMCkpKX0sX3RpbGVPbkxvYWQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9sYXllcjt0aGlzLnNyYyE9PW8uVXRpbC5lbXB0eUltYWdlVXJsJiYoby5Eb21VdGlsLmFkZENsYXNzKHRoaXMsXCJsZWFmbGV0LXRpbGUtbG9hZGVkXCIpLHQuZmlyZShcInRpbGVsb2FkXCIse3RpbGU6dGhpcyx1cmw6dGhpcy5zcmN9KSksdC5fdGlsZUxvYWRlZCgpfSxfdGlsZU9uRXJyb3I6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9sYXllcjt0LmZpcmUoXCJ0aWxlZXJyb3JcIix7dGlsZTp0aGlzLHVybDp0aGlzLnNyY30pO3ZhciBlPXQub3B0aW9ucy5lcnJvclRpbGVVcmw7ZSYmKHRoaXMuc3JjPWUpLHQuX3RpbGVMb2FkZWQoKX19KSxvLnRpbGVMYXllcj1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgby5UaWxlTGF5ZXIodCxlKX0sby5UaWxlTGF5ZXIuV01TPW8uVGlsZUxheWVyLmV4dGVuZCh7ZGVmYXVsdFdtc1BhcmFtczp7c2VydmljZTpcIldNU1wiLHJlcXVlc3Q6XCJHZXRNYXBcIix2ZXJzaW9uOlwiMS4xLjFcIixsYXllcnM6XCJcIixzdHlsZXM6XCJcIixmb3JtYXQ6XCJpbWFnZS9qcGVnXCIsdHJhbnNwYXJlbnQ6ITF9LGluaXRpYWxpemU6ZnVuY3Rpb24odCxlKXt0aGlzLl91cmw9dDt2YXIgaT1vLmV4dGVuZCh7fSx0aGlzLmRlZmF1bHRXbXNQYXJhbXMpLG49ZS50aWxlU2l6ZXx8dGhpcy5vcHRpb25zLnRpbGVTaXplO2kud2lkdGg9aS5oZWlnaHQ9ZS5kZXRlY3RSZXRpbmEmJm8uQnJvd3Nlci5yZXRpbmE/MipuOm47Zm9yKHZhciBzIGluIGUpdGhpcy5vcHRpb25zLmhhc093blByb3BlcnR5KHMpfHxcImNyc1wiPT09c3x8KGlbc109ZVtzXSk7dGhpcy53bXNQYXJhbXM9aSxvLnNldE9wdGlvbnModGhpcyxlKX0sb25BZGQ6ZnVuY3Rpb24odCl7dGhpcy5fY3JzPXRoaXMub3B0aW9ucy5jcnN8fHQub3B0aW9ucy5jcnM7dmFyIGU9cGFyc2VGbG9hdCh0aGlzLndtc1BhcmFtcy52ZXJzaW9uKT49MS4zP1wiY3JzXCI6XCJzcnNcIjt0aGlzLndtc1BhcmFtc1tlXT10aGlzLl9jcnMuY29kZSxvLlRpbGVMYXllci5wcm90b3R5cGUub25BZGQuY2FsbCh0aGlzLHQpfSxnZXRUaWxlVXJsOmZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fbWFwLG49dGhpcy5vcHRpb25zLnRpbGVTaXplLHM9dC5tdWx0aXBseUJ5KG4pLGE9cy5hZGQoW24sbl0pLHI9dGhpcy5fY3JzLnByb2plY3QoaS51bnByb2plY3QocyxlKSksaD10aGlzLl9jcnMucHJvamVjdChpLnVucHJvamVjdChhLGUpKSxsPVtyLngsaC55LGgueCxyLnldLmpvaW4oXCIsXCIpLHU9by5VdGlsLnRlbXBsYXRlKHRoaXMuX3VybCx7czp0aGlzLl9nZXRTdWJkb21haW4odCl9KTtyZXR1cm4gdStvLlV0aWwuZ2V0UGFyYW1TdHJpbmcodGhpcy53bXNQYXJhbXMsdSwhMCkrXCImQkJPWD1cIitsfSxzZXRQYXJhbXM6ZnVuY3Rpb24odCxlKXtyZXR1cm4gby5leHRlbmQodGhpcy53bXNQYXJhbXMsdCksZXx8dGhpcy5yZWRyYXcoKSx0aGlzfX0pLG8udGlsZUxheWVyLndtcz1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgby5UaWxlTGF5ZXIuV01TKHQsZSl9LG8uVGlsZUxheWVyLkNhbnZhcz1vLlRpbGVMYXllci5leHRlbmQoe29wdGlvbnM6e2FzeW5jOiExfSxpbml0aWFsaXplOmZ1bmN0aW9uKHQpe28uc2V0T3B0aW9ucyh0aGlzLHQpfSxyZWRyYXc6ZnVuY3Rpb24oKXt0aGlzLl9tYXAmJih0aGlzLl9yZXNldCh7aGFyZDohMH0pLHRoaXMuX3VwZGF0ZSgpKTtmb3IodmFyIHQgaW4gdGhpcy5fdGlsZXMpdGhpcy5fcmVkcmF3VGlsZSh0aGlzLl90aWxlc1t0XSk7cmV0dXJuIHRoaXN9LF9yZWRyYXdUaWxlOmZ1bmN0aW9uKHQpe3RoaXMuZHJhd1RpbGUodCx0Ll90aWxlUG9pbnQsdGhpcy5fbWFwLl96b29tKX0sX2NyZWF0ZVRpbGVQcm90bzpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX2NhbnZhc1Byb3RvPW8uRG9tVXRpbC5jcmVhdGUoXCJjYW52YXNcIixcImxlYWZsZXQtdGlsZVwiKTt0LndpZHRoPXQuaGVpZ2h0PXRoaXMub3B0aW9ucy50aWxlU2l6ZX0sX2NyZWF0ZVRpbGU6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9jYW52YXNQcm90by5jbG9uZU5vZGUoITEpO3JldHVybiB0Lm9uc2VsZWN0c3RhcnQ9dC5vbm1vdXNlbW92ZT1vLlV0aWwuZmFsc2VGbix0fSxfbG9hZFRpbGU6ZnVuY3Rpb24odCxlKXt0Ll9sYXllcj10aGlzLHQuX3RpbGVQb2ludD1lLHRoaXMuX3JlZHJhd1RpbGUodCksdGhpcy5vcHRpb25zLmFzeW5jfHx0aGlzLnRpbGVEcmF3bih0KX0sZHJhd1RpbGU6ZnVuY3Rpb24oKXt9LHRpbGVEcmF3bjpmdW5jdGlvbih0KXt0aGlzLl90aWxlT25Mb2FkLmNhbGwodCl9fSksby50aWxlTGF5ZXIuY2FudmFzPWZ1bmN0aW9uKHQpe3JldHVybiBuZXcgby5UaWxlTGF5ZXIuQ2FudmFzKHQpfSxvLkltYWdlT3ZlcmxheT1vLkNsYXNzLmV4dGVuZCh7aW5jbHVkZXM6by5NaXhpbi5FdmVudHMsb3B0aW9uczp7b3BhY2l0eToxfSxpbml0aWFsaXplOmZ1bmN0aW9uKHQsZSxpKXt0aGlzLl91cmw9dCx0aGlzLl9ib3VuZHM9by5sYXRMbmdCb3VuZHMoZSksby5zZXRPcHRpb25zKHRoaXMsaSl9LG9uQWRkOmZ1bmN0aW9uKHQpe3RoaXMuX21hcD10LHRoaXMuX2ltYWdlfHx0aGlzLl9pbml0SW1hZ2UoKSx0Ll9wYW5lcy5vdmVybGF5UGFuZS5hcHBlbmRDaGlsZCh0aGlzLl9pbWFnZSksdC5vbihcInZpZXdyZXNldFwiLHRoaXMuX3Jlc2V0LHRoaXMpLHQub3B0aW9ucy56b29tQW5pbWF0aW9uJiZvLkJyb3dzZXIuYW55M2QmJnQub24oXCJ6b29tYW5pbVwiLHRoaXMuX2FuaW1hdGVab29tLHRoaXMpLHRoaXMuX3Jlc2V0KCl9LG9uUmVtb3ZlOmZ1bmN0aW9uKHQpe3QuZ2V0UGFuZXMoKS5vdmVybGF5UGFuZS5yZW1vdmVDaGlsZCh0aGlzLl9pbWFnZSksdC5vZmYoXCJ2aWV3cmVzZXRcIix0aGlzLl9yZXNldCx0aGlzKSx0Lm9wdGlvbnMuem9vbUFuaW1hdGlvbiYmdC5vZmYoXCJ6b29tYW5pbVwiLHRoaXMuX2FuaW1hdGVab29tLHRoaXMpfSxhZGRUbzpmdW5jdGlvbih0KXtyZXR1cm4gdC5hZGRMYXllcih0aGlzKSx0aGlzfSxzZXRPcGFjaXR5OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLm9wdGlvbnMub3BhY2l0eT10LHRoaXMuX3VwZGF0ZU9wYWNpdHkoKSx0aGlzfSxicmluZ1RvRnJvbnQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5faW1hZ2UmJnRoaXMuX21hcC5fcGFuZXMub3ZlcmxheVBhbmUuYXBwZW5kQ2hpbGQodGhpcy5faW1hZ2UpLHRoaXN9LGJyaW5nVG9CYWNrOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbWFwLl9wYW5lcy5vdmVybGF5UGFuZTtyZXR1cm4gdGhpcy5faW1hZ2UmJnQuaW5zZXJ0QmVmb3JlKHRoaXMuX2ltYWdlLHQuZmlyc3RDaGlsZCksdGhpc30sX2luaXRJbWFnZTpmdW5jdGlvbigpe3RoaXMuX2ltYWdlPW8uRG9tVXRpbC5jcmVhdGUoXCJpbWdcIixcImxlYWZsZXQtaW1hZ2UtbGF5ZXJcIiksdGhpcy5fbWFwLm9wdGlvbnMuem9vbUFuaW1hdGlvbiYmby5Ccm93c2VyLmFueTNkP28uRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9pbWFnZSxcImxlYWZsZXQtem9vbS1hbmltYXRlZFwiKTpvLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5faW1hZ2UsXCJsZWFmbGV0LXpvb20taGlkZVwiKSx0aGlzLl91cGRhdGVPcGFjaXR5KCksby5leHRlbmQodGhpcy5faW1hZ2Use2dhbGxlcnlpbWc6XCJub1wiLG9uc2VsZWN0c3RhcnQ6by5VdGlsLmZhbHNlRm4sb25tb3VzZW1vdmU6by5VdGlsLmZhbHNlRm4sb25sb2FkOm8uYmluZCh0aGlzLl9vbkltYWdlTG9hZCx0aGlzKSxzcmM6dGhpcy5fdXJsfSl9LF9hbmltYXRlWm9vbTpmdW5jdGlvbih0KXt2YXIgZT10aGlzLl9tYXAsaT10aGlzLl9pbWFnZSxuPWUuZ2V0Wm9vbVNjYWxlKHQuem9vbSkscz10aGlzLl9ib3VuZHMuZ2V0Tm9ydGhXZXN0KCksYT10aGlzLl9ib3VuZHMuZ2V0U291dGhFYXN0KCkscj1lLl9sYXRMbmdUb05ld0xheWVyUG9pbnQocyx0Lnpvb20sdC5jZW50ZXIpLGg9ZS5fbGF0TG5nVG9OZXdMYXllclBvaW50KGEsdC56b29tLHQuY2VudGVyKS5fc3VidHJhY3QociksbD1yLl9hZGQoaC5fbXVsdGlwbHlCeSguNSooMS0xL24pKSk7aS5zdHlsZVtvLkRvbVV0aWwuVFJBTlNGT1JNXT1vLkRvbVV0aWwuZ2V0VHJhbnNsYXRlU3RyaW5nKGwpK1wiIHNjYWxlKFwiK24rXCIpIFwifSxfcmVzZXQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9pbWFnZSxlPXRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fYm91bmRzLmdldE5vcnRoV2VzdCgpKSxpPXRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fYm91bmRzLmdldFNvdXRoRWFzdCgpKS5fc3VidHJhY3QoZSk7by5Eb21VdGlsLnNldFBvc2l0aW9uKHQsZSksdC5zdHlsZS53aWR0aD1pLngrXCJweFwiLHQuc3R5bGUuaGVpZ2h0PWkueStcInB4XCJ9LF9vbkltYWdlTG9hZDpmdW5jdGlvbigpe3RoaXMuZmlyZShcImxvYWRcIil9LF91cGRhdGVPcGFjaXR5OmZ1bmN0aW9uKCl7by5Eb21VdGlsLnNldE9wYWNpdHkodGhpcy5faW1hZ2UsdGhpcy5vcHRpb25zLm9wYWNpdHkpfX0pLG8uaW1hZ2VPdmVybGF5PWZ1bmN0aW9uKHQsZSxpKXtyZXR1cm4gbmV3IG8uSW1hZ2VPdmVybGF5KHQsZSxpKX0sby5JY29uPW8uQ2xhc3MuZXh0ZW5kKHtvcHRpb25zOntjbGFzc05hbWU6XCJcIn0saW5pdGlhbGl6ZTpmdW5jdGlvbih0KXtvLnNldE9wdGlvbnModGhpcyx0KX0sY3JlYXRlSWNvbjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fY3JlYXRlSWNvbihcImljb25cIix0KX0sY3JlYXRlU2hhZG93OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9jcmVhdGVJY29uKFwic2hhZG93XCIsdCl9LF9jcmVhdGVJY29uOmZ1bmN0aW9uKHQsZSl7dmFyIGk9dGhpcy5fZ2V0SWNvblVybCh0KTtpZighaSl7aWYoXCJpY29uXCI9PT10KXRocm93IG5ldyBFcnJvcihcImljb25Vcmwgbm90IHNldCBpbiBJY29uIG9wdGlvbnMgKHNlZSB0aGUgZG9jcykuXCIpO3JldHVybiBudWxsfXZhciBuO3JldHVybiBuPWUmJlwiSU1HXCI9PT1lLnRhZ05hbWU/dGhpcy5fY3JlYXRlSW1nKGksZSk6dGhpcy5fY3JlYXRlSW1nKGkpLHRoaXMuX3NldEljb25TdHlsZXMobix0KSxufSxfc2V0SWNvblN0eWxlczpmdW5jdGlvbih0LGUpe3ZhciBpLG49dGhpcy5vcHRpb25zLHM9by5wb2ludChuW2UrXCJTaXplXCJdKTtpPVwic2hhZG93XCI9PT1lP28ucG9pbnQobi5zaGFkb3dBbmNob3J8fG4uaWNvbkFuY2hvcik6by5wb2ludChuLmljb25BbmNob3IpLCFpJiZzJiYoaT1zLmRpdmlkZUJ5KDIsITApKSx0LmNsYXNzTmFtZT1cImxlYWZsZXQtbWFya2VyLVwiK2UrXCIgXCIrbi5jbGFzc05hbWUsaSYmKHQuc3R5bGUubWFyZ2luTGVmdD0taS54K1wicHhcIix0LnN0eWxlLm1hcmdpblRvcD0taS55K1wicHhcIikscyYmKHQuc3R5bGUud2lkdGg9cy54K1wicHhcIix0LnN0eWxlLmhlaWdodD1zLnkrXCJweFwiKX0sX2NyZWF0ZUltZzpmdW5jdGlvbih0LGkpe3JldHVybiBvLkJyb3dzZXIuaWU2PyhpfHwoaT1lLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIikpLGkuc3R5bGUuZmlsdGVyPSdwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuQWxwaGFJbWFnZUxvYWRlcihzcmM9XCInK3QrJ1wiKScpOihpfHwoaT1lLmNyZWF0ZUVsZW1lbnQoXCJpbWdcIikpLGkuc3JjPXQpLGl9LF9nZXRJY29uVXJsOmZ1bmN0aW9uKHQpe3JldHVybiBvLkJyb3dzZXIucmV0aW5hJiZ0aGlzLm9wdGlvbnNbdCtcIlJldGluYVVybFwiXT90aGlzLm9wdGlvbnNbdCtcIlJldGluYVVybFwiXTp0aGlzLm9wdGlvbnNbdCtcIlVybFwiXX19KSxvLmljb249ZnVuY3Rpb24odCl7cmV0dXJuIG5ldyBvLkljb24odCl9LG8uSWNvbi5EZWZhdWx0PW8uSWNvbi5leHRlbmQoe29wdGlvbnM6e2ljb25TaXplOlsyNSw0MV0saWNvbkFuY2hvcjpbMTIsNDFdLHBvcHVwQW5jaG9yOlsxLC0zNF0sc2hhZG93U2l6ZTpbNDEsNDFdfSxfZ2V0SWNvblVybDpmdW5jdGlvbih0KXt2YXIgZT10K1wiVXJsXCI7aWYodGhpcy5vcHRpb25zW2VdKXJldHVybiB0aGlzLm9wdGlvbnNbZV07by5Ccm93c2VyLnJldGluYSYmXCJpY29uXCI9PT10JiYodCs9XCItMnhcIik7dmFyIGk9by5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoO2lmKCFpKXRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGF1dG9kZXRlY3QgTC5JY29uLkRlZmF1bHQuaW1hZ2VQYXRoLCBzZXQgaXQgbWFudWFsbHkuXCIpO3JldHVybiBpK1wiL21hcmtlci1cIit0K1wiLnBuZ1wifX0pLG8uSWNvbi5EZWZhdWx0LmltYWdlUGF0aD1mdW5jdGlvbigpe3ZhciB0LGksbixvLHMsYT1lLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic2NyaXB0XCIpLHI9L1tcXC9eXWxlYWZsZXRbXFwtXFwuX10/KFtcXHdcXC1cXC5fXSopXFwuanNcXD8/Lztmb3IodD0wLGk9YS5sZW5ndGg7aT50O3QrKylpZihuPWFbdF0uc3JjLG89bi5tYXRjaChyKSlyZXR1cm4gcz1uLnNwbGl0KHIpWzBdLChzP3MrXCIvXCI6XCJcIikrXCJpbWFnZXNcIn0oKSxvLk1hcmtlcj1vLkNsYXNzLmV4dGVuZCh7aW5jbHVkZXM6by5NaXhpbi5FdmVudHMsb3B0aW9uczp7aWNvbjpuZXcgby5JY29uLkRlZmF1bHQsdGl0bGU6XCJcIixjbGlja2FibGU6ITAsZHJhZ2dhYmxlOiExLGtleWJvYXJkOiEwLHpJbmRleE9mZnNldDowLG9wYWNpdHk6MSxyaXNlT25Ib3ZlcjohMSxyaXNlT2Zmc2V0OjI1MH0saW5pdGlhbGl6ZTpmdW5jdGlvbih0LGUpe28uc2V0T3B0aW9ucyh0aGlzLGUpLHRoaXMuX2xhdGxuZz1vLmxhdExuZyh0KX0sb25BZGQ6ZnVuY3Rpb24odCl7dGhpcy5fbWFwPXQsdC5vbihcInZpZXdyZXNldFwiLHRoaXMudXBkYXRlLHRoaXMpLHRoaXMuX2luaXRJY29uKCksdGhpcy51cGRhdGUoKSx0Lm9wdGlvbnMuem9vbUFuaW1hdGlvbiYmdC5vcHRpb25zLm1hcmtlclpvb21BbmltYXRpb24mJnQub24oXCJ6b29tYW5pbVwiLHRoaXMuX2FuaW1hdGVab29tLHRoaXMpfSxhZGRUbzpmdW5jdGlvbih0KXtyZXR1cm4gdC5hZGRMYXllcih0aGlzKSx0aGlzfSxvblJlbW92ZTpmdW5jdGlvbih0KXt0aGlzLmRyYWdnaW5nJiZ0aGlzLmRyYWdnaW5nLmRpc2FibGUoKSx0aGlzLl9yZW1vdmVJY29uKCksdGhpcy5fcmVtb3ZlU2hhZG93KCksdGhpcy5maXJlKFwicmVtb3ZlXCIpLHQub2ZmKHt2aWV3cmVzZXQ6dGhpcy51cGRhdGUsem9vbWFuaW06dGhpcy5fYW5pbWF0ZVpvb219LHRoaXMpLHRoaXMuX21hcD1udWxsfSxnZXRMYXRMbmc6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbGF0bG5nfSxzZXRMYXRMbmc6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2xhdGxuZz1vLmxhdExuZyh0KSx0aGlzLnVwZGF0ZSgpLHRoaXMuZmlyZShcIm1vdmVcIix7bGF0bG5nOnRoaXMuX2xhdGxuZ30pfSxzZXRaSW5kZXhPZmZzZXQ6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMub3B0aW9ucy56SW5kZXhPZmZzZXQ9dCx0aGlzLnVwZGF0ZSgpLHRoaXN9LHNldEljb246ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMub3B0aW9ucy5pY29uPXQsdGhpcy5fbWFwJiYodGhpcy5faW5pdEljb24oKSx0aGlzLnVwZGF0ZSgpKSx0aGlzfSx1cGRhdGU6ZnVuY3Rpb24oKXtpZih0aGlzLl9pY29uKXt2YXIgdD10aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KHRoaXMuX2xhdGxuZykucm91bmQoKTt0aGlzLl9zZXRQb3ModCl9cmV0dXJuIHRoaXN9LF9pbml0SWNvbjpmdW5jdGlvbigpe3ZhciB0PXRoaXMub3B0aW9ucyxlPXRoaXMuX21hcCxpPWUub3B0aW9ucy56b29tQW5pbWF0aW9uJiZlLm9wdGlvbnMubWFya2VyWm9vbUFuaW1hdGlvbixuPWk/XCJsZWFmbGV0LXpvb20tYW5pbWF0ZWRcIjpcImxlYWZsZXQtem9vbS1oaWRlXCIscz10Lmljb24uY3JlYXRlSWNvbih0aGlzLl9pY29uKSxhPSExO3MhPT10aGlzLl9pY29uJiYodGhpcy5faWNvbiYmdGhpcy5fcmVtb3ZlSWNvbigpLGE9ITAsdC50aXRsZSYmKHMudGl0bGU9dC50aXRsZSkpLG8uRG9tVXRpbC5hZGRDbGFzcyhzLG4pLHQua2V5Ym9hcmQmJihzLnRhYkluZGV4PVwiMFwiKSx0aGlzLl9pY29uPXMsdGhpcy5faW5pdEludGVyYWN0aW9uKCksdC5yaXNlT25Ib3ZlciYmby5Eb21FdmVudC5vbihzLFwibW91c2VvdmVyXCIsdGhpcy5fYnJpbmdUb0Zyb250LHRoaXMpLm9uKHMsXCJtb3VzZW91dFwiLHRoaXMuX3Jlc2V0WkluZGV4LHRoaXMpO3ZhciByPXQuaWNvbi5jcmVhdGVTaGFkb3codGhpcy5fc2hhZG93KSxoPSExO3IhPT10aGlzLl9zaGFkb3cmJih0aGlzLl9yZW1vdmVTaGFkb3coKSxoPSEwKSxyJiZvLkRvbVV0aWwuYWRkQ2xhc3MocixuKSx0aGlzLl9zaGFkb3c9cix0Lm9wYWNpdHk8MSYmdGhpcy5fdXBkYXRlT3BhY2l0eSgpO3ZhciBsPXRoaXMuX21hcC5fcGFuZXM7YSYmbC5tYXJrZXJQYW5lLmFwcGVuZENoaWxkKHRoaXMuX2ljb24pLHImJmgmJmwuc2hhZG93UGFuZS5hcHBlbmRDaGlsZCh0aGlzLl9zaGFkb3cpfSxfcmVtb3ZlSWNvbjpmdW5jdGlvbigpe3RoaXMub3B0aW9ucy5yaXNlT25Ib3ZlciYmby5Eb21FdmVudC5vZmYodGhpcy5faWNvbixcIm1vdXNlb3ZlclwiLHRoaXMuX2JyaW5nVG9Gcm9udCkub2ZmKHRoaXMuX2ljb24sXCJtb3VzZW91dFwiLHRoaXMuX3Jlc2V0WkluZGV4KSx0aGlzLl9tYXAuX3BhbmVzLm1hcmtlclBhbmUucmVtb3ZlQ2hpbGQodGhpcy5faWNvbiksdGhpcy5faWNvbj1udWxsfSxfcmVtb3ZlU2hhZG93OmZ1bmN0aW9uKCl7dGhpcy5fc2hhZG93JiZ0aGlzLl9tYXAuX3BhbmVzLnNoYWRvd1BhbmUucmVtb3ZlQ2hpbGQodGhpcy5fc2hhZG93KSx0aGlzLl9zaGFkb3c9bnVsbH0sX3NldFBvczpmdW5jdGlvbih0KXtvLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5faWNvbix0KSx0aGlzLl9zaGFkb3cmJm8uRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9zaGFkb3csdCksdGhpcy5fekluZGV4PXQueSt0aGlzLm9wdGlvbnMuekluZGV4T2Zmc2V0LHRoaXMuX3Jlc2V0WkluZGV4KCl9LF91cGRhdGVaSW5kZXg6ZnVuY3Rpb24odCl7dGhpcy5faWNvbi5zdHlsZS56SW5kZXg9dGhpcy5fekluZGV4K3R9LF9hbmltYXRlWm9vbTpmdW5jdGlvbih0KXt2YXIgZT10aGlzLl9tYXAuX2xhdExuZ1RvTmV3TGF5ZXJQb2ludCh0aGlzLl9sYXRsbmcsdC56b29tLHQuY2VudGVyKTt0aGlzLl9zZXRQb3MoZSl9LF9pbml0SW50ZXJhY3Rpb246ZnVuY3Rpb24oKXtpZih0aGlzLm9wdGlvbnMuY2xpY2thYmxlKXt2YXIgdD10aGlzLl9pY29uLGU9W1wiZGJsY2xpY2tcIixcIm1vdXNlZG93blwiLFwibW91c2VvdmVyXCIsXCJtb3VzZW91dFwiLFwiY29udGV4dG1lbnVcIl07by5Eb21VdGlsLmFkZENsYXNzKHQsXCJsZWFmbGV0LWNsaWNrYWJsZVwiKSxvLkRvbUV2ZW50Lm9uKHQsXCJjbGlja1wiLHRoaXMuX29uTW91c2VDbGljayx0aGlzKSxvLkRvbUV2ZW50Lm9uKHQsXCJrZXlwcmVzc1wiLHRoaXMuX29uS2V5UHJlc3MsdGhpcyk7Zm9yKHZhciBpPTA7aTxlLmxlbmd0aDtpKyspby5Eb21FdmVudC5vbih0LGVbaV0sdGhpcy5fZmlyZU1vdXNlRXZlbnQsdGhpcyk7by5IYW5kbGVyLk1hcmtlckRyYWcmJih0aGlzLmRyYWdnaW5nPW5ldyBvLkhhbmRsZXIuTWFya2VyRHJhZyh0aGlzKSx0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlJiZ0aGlzLmRyYWdnaW5nLmVuYWJsZSgpKX19LF9vbk1vdXNlQ2xpY2s6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5kcmFnZ2luZyYmdGhpcy5kcmFnZ2luZy5tb3ZlZCgpOyh0aGlzLmhhc0V2ZW50TGlzdGVuZXJzKHQudHlwZSl8fGUpJiZvLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbih0KSxlfHwodGhpcy5kcmFnZ2luZyYmdGhpcy5kcmFnZ2luZy5fZW5hYmxlZHx8IXRoaXMuX21hcC5kcmFnZ2luZ3x8IXRoaXMuX21hcC5kcmFnZ2luZy5tb3ZlZCgpKSYmdGhpcy5maXJlKHQudHlwZSx7b3JpZ2luYWxFdmVudDp0LGxhdGxuZzp0aGlzLl9sYXRsbmd9KX0sX29uS2V5UHJlc3M6ZnVuY3Rpb24odCl7MTM9PT10LmtleUNvZGUmJnRoaXMuZmlyZShcImNsaWNrXCIse29yaWdpbmFsRXZlbnQ6dCxsYXRsbmc6dGhpcy5fbGF0bG5nfSl9LF9maXJlTW91c2VFdmVudDpmdW5jdGlvbih0KXt0aGlzLmZpcmUodC50eXBlLHtvcmlnaW5hbEV2ZW50OnQsbGF0bG5nOnRoaXMuX2xhdGxuZ30pLFwiY29udGV4dG1lbnVcIj09PXQudHlwZSYmdGhpcy5oYXNFdmVudExpc3RlbmVycyh0LnR5cGUpJiZvLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KHQpLFwibW91c2Vkb3duXCIhPT10LnR5cGU/by5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24odCk6by5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCh0KX0sc2V0T3BhY2l0eTpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5vcHRpb25zLm9wYWNpdHk9dCx0aGlzLl9tYXAmJnRoaXMuX3VwZGF0ZU9wYWNpdHkoKSx0aGlzfSxfdXBkYXRlT3BhY2l0eTpmdW5jdGlvbigpe28uRG9tVXRpbC5zZXRPcGFjaXR5KHRoaXMuX2ljb24sdGhpcy5vcHRpb25zLm9wYWNpdHkpLHRoaXMuX3NoYWRvdyYmby5Eb21VdGlsLnNldE9wYWNpdHkodGhpcy5fc2hhZG93LHRoaXMub3B0aW9ucy5vcGFjaXR5KX0sX2JyaW5nVG9Gcm9udDpmdW5jdGlvbigpe3RoaXMuX3VwZGF0ZVpJbmRleCh0aGlzLm9wdGlvbnMucmlzZU9mZnNldCl9LF9yZXNldFpJbmRleDpmdW5jdGlvbigpe3RoaXMuX3VwZGF0ZVpJbmRleCgwKX19KSxvLm1hcmtlcj1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgby5NYXJrZXIodCxlKX0sby5EaXZJY29uPW8uSWNvbi5leHRlbmQoe29wdGlvbnM6e2ljb25TaXplOlsxMiwxMl0sY2xhc3NOYW1lOlwibGVhZmxldC1kaXYtaWNvblwiLGh0bWw6ITF9LGNyZWF0ZUljb246ZnVuY3Rpb24odCl7dmFyIGk9dCYmXCJESVZcIj09PXQudGFnTmFtZT90OmUuY3JlYXRlRWxlbWVudChcImRpdlwiKSxuPXRoaXMub3B0aW9ucztyZXR1cm4gaS5pbm5lckhUTUw9bi5odG1sIT09ITE/bi5odG1sOlwiXCIsbi5iZ1BvcyYmKGkuc3R5bGUuYmFja2dyb3VuZFBvc2l0aW9uPS1uLmJnUG9zLngrXCJweCBcIistbi5iZ1Bvcy55K1wicHhcIiksdGhpcy5fc2V0SWNvblN0eWxlcyhpLFwiaWNvblwiKSxpfSxjcmVhdGVTaGFkb3c6ZnVuY3Rpb24oKXtyZXR1cm4gbnVsbH19KSxvLmRpdkljb249ZnVuY3Rpb24odCl7cmV0dXJuIG5ldyBvLkRpdkljb24odCl9LG8uTWFwLm1lcmdlT3B0aW9ucyh7Y2xvc2VQb3B1cE9uQ2xpY2s6ITB9KSxvLlBvcHVwPW8uQ2xhc3MuZXh0ZW5kKHtpbmNsdWRlczpvLk1peGluLkV2ZW50cyxvcHRpb25zOnttaW5XaWR0aDo1MCxtYXhXaWR0aDozMDAsbWF4SGVpZ2h0Om51bGwsYXV0b1BhbjohMCxjbG9zZUJ1dHRvbjohMCxvZmZzZXQ6WzAsN10sYXV0b1BhblBhZGRpbmc6WzUsNV0sa2VlcEluVmlldzohMSxjbGFzc05hbWU6XCJcIix6b29tQW5pbWF0aW9uOiEwfSxpbml0aWFsaXplOmZ1bmN0aW9uKHQsZSl7by5zZXRPcHRpb25zKHRoaXMsdCksdGhpcy5fc291cmNlPWUsdGhpcy5fYW5pbWF0ZWQ9by5Ccm93c2VyLmFueTNkJiZ0aGlzLm9wdGlvbnMuem9vbUFuaW1hdGlvbix0aGlzLl9pc09wZW49ITF9LG9uQWRkOmZ1bmN0aW9uKHQpe3RoaXMuX21hcD10LHRoaXMuX2NvbnRhaW5lcnx8dGhpcy5faW5pdExheW91dCgpLHRoaXMuX3VwZGF0ZUNvbnRlbnQoKTt2YXIgZT10Lm9wdGlvbnMuZmFkZUFuaW1hdGlvbjtlJiZvLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9jb250YWluZXIsMCksdC5fcGFuZXMucG9wdXBQYW5lLmFwcGVuZENoaWxkKHRoaXMuX2NvbnRhaW5lciksdC5vbih0aGlzLl9nZXRFdmVudHMoKSx0aGlzKSx0aGlzLl91cGRhdGUoKSxlJiZvLkRvbVV0aWwuc2V0T3BhY2l0eSh0aGlzLl9jb250YWluZXIsMSksdGhpcy5maXJlKFwib3BlblwiKSx0LmZpcmUoXCJwb3B1cG9wZW5cIix7cG9wdXA6dGhpc30pLHRoaXMuX3NvdXJjZSYmdGhpcy5fc291cmNlLmZpcmUoXCJwb3B1cG9wZW5cIix7cG9wdXA6dGhpc30pfSxhZGRUbzpmdW5jdGlvbih0KXtyZXR1cm4gdC5hZGRMYXllcih0aGlzKSx0aGlzfSxvcGVuT246ZnVuY3Rpb24odCl7cmV0dXJuIHQub3BlblBvcHVwKHRoaXMpLHRoaXN9LG9uUmVtb3ZlOmZ1bmN0aW9uKHQpe3QuX3BhbmVzLnBvcHVwUGFuZS5yZW1vdmVDaGlsZCh0aGlzLl9jb250YWluZXIpLG8uVXRpbC5mYWxzZUZuKHRoaXMuX2NvbnRhaW5lci5vZmZzZXRXaWR0aCksdC5vZmYodGhpcy5fZ2V0RXZlbnRzKCksdGhpcyksdC5vcHRpb25zLmZhZGVBbmltYXRpb24mJm8uRG9tVXRpbC5zZXRPcGFjaXR5KHRoaXMuX2NvbnRhaW5lciwwKSx0aGlzLl9tYXA9bnVsbCx0aGlzLmZpcmUoXCJjbG9zZVwiKSx0LmZpcmUoXCJwb3B1cGNsb3NlXCIse3BvcHVwOnRoaXN9KSx0aGlzLl9zb3VyY2UmJnRoaXMuX3NvdXJjZS5maXJlKFwicG9wdXBjbG9zZVwiLHtwb3B1cDp0aGlzfSl9LHNldExhdExuZzpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fbGF0bG5nPW8ubGF0TG5nKHQpLHRoaXMuX3VwZGF0ZSgpLHRoaXN9LHNldENvbnRlbnQ6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2NvbnRlbnQ9dCx0aGlzLl91cGRhdGUoKSx0aGlzfSxfZ2V0RXZlbnRzOmZ1bmN0aW9uKCl7dmFyIHQ9e3ZpZXdyZXNldDp0aGlzLl91cGRhdGVQb3NpdGlvbn07cmV0dXJuIHRoaXMuX2FuaW1hdGVkJiYodC56b29tYW5pbT10aGlzLl96b29tQW5pbWF0aW9uKSwoXCJjbG9zZU9uQ2xpY2tcImluIHRoaXMub3B0aW9ucz90aGlzLm9wdGlvbnMuY2xvc2VPbkNsaWNrOnRoaXMuX21hcC5vcHRpb25zLmNsb3NlUG9wdXBPbkNsaWNrKSYmKHQucHJlY2xpY2s9dGhpcy5fY2xvc2UpLHRoaXMub3B0aW9ucy5rZWVwSW5WaWV3JiYodC5tb3ZlZW5kPXRoaXMuX2FkanVzdFBhbiksdH0sX2Nsb3NlOmZ1bmN0aW9uKCl7dGhpcy5fbWFwJiZ0aGlzLl9tYXAuY2xvc2VQb3B1cCh0aGlzKX0sX2luaXRMYXlvdXQ6ZnVuY3Rpb24oKXt2YXIgdCxlPVwibGVhZmxldC1wb3B1cFwiLGk9ZStcIiBcIit0aGlzLm9wdGlvbnMuY2xhc3NOYW1lK1wiIGxlYWZsZXQtem9vbS1cIisodGhpcy5fYW5pbWF0ZWQ/XCJhbmltYXRlZFwiOlwiaGlkZVwiKSxuPXRoaXMuX2NvbnRhaW5lcj1vLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsaSk7dGhpcy5vcHRpb25zLmNsb3NlQnV0dG9uJiYodD10aGlzLl9jbG9zZUJ1dHRvbj1vLkRvbVV0aWwuY3JlYXRlKFwiYVwiLGUrXCItY2xvc2UtYnV0dG9uXCIsbiksdC5ocmVmPVwiI2Nsb3NlXCIsdC5pbm5lckhUTUw9XCImIzIxNTtcIixvLkRvbUV2ZW50LmRpc2FibGVDbGlja1Byb3BhZ2F0aW9uKHQpLG8uRG9tRXZlbnQub24odCxcImNsaWNrXCIsdGhpcy5fb25DbG9zZUJ1dHRvbkNsaWNrLHRoaXMpKTt2YXIgcz10aGlzLl93cmFwcGVyPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixlK1wiLWNvbnRlbnQtd3JhcHBlclwiLG4pO28uRG9tRXZlbnQuZGlzYWJsZUNsaWNrUHJvcGFnYXRpb24ocyksdGhpcy5fY29udGVudE5vZGU9by5Eb21VdGlsLmNyZWF0ZShcImRpdlwiLGUrXCItY29udGVudFwiLHMpLG8uRG9tRXZlbnQub24odGhpcy5fY29udGVudE5vZGUsXCJtb3VzZXdoZWVsXCIsby5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pLG8uRG9tRXZlbnQub24odGhpcy5fY29udGVudE5vZGUsXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsby5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pLG8uRG9tRXZlbnQub24ocyxcImNvbnRleHRtZW51XCIsby5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pLHRoaXMuX3RpcENvbnRhaW5lcj1vLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsZStcIi10aXAtY29udGFpbmVyXCIsbiksdGhpcy5fdGlwPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixlK1wiLXRpcFwiLHRoaXMuX3RpcENvbnRhaW5lcil9LF91cGRhdGU6ZnVuY3Rpb24oKXt0aGlzLl9tYXAmJih0aGlzLl9jb250YWluZXIuc3R5bGUudmlzaWJpbGl0eT1cImhpZGRlblwiLHRoaXMuX3VwZGF0ZUNvbnRlbnQoKSx0aGlzLl91cGRhdGVMYXlvdXQoKSx0aGlzLl91cGRhdGVQb3NpdGlvbigpLHRoaXMuX2NvbnRhaW5lci5zdHlsZS52aXNpYmlsaXR5PVwiXCIsdGhpcy5fYWRqdXN0UGFuKCkpfSxfdXBkYXRlQ29udGVudDpmdW5jdGlvbigpe2lmKHRoaXMuX2NvbnRlbnQpe2lmKFwic3RyaW5nXCI9PXR5cGVvZiB0aGlzLl9jb250ZW50KXRoaXMuX2NvbnRlbnROb2RlLmlubmVySFRNTD10aGlzLl9jb250ZW50O2Vsc2V7Zm9yKDt0aGlzLl9jb250ZW50Tm9kZS5oYXNDaGlsZE5vZGVzKCk7KXRoaXMuX2NvbnRlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuX2NvbnRlbnROb2RlLmZpcnN0Q2hpbGQpO3RoaXMuX2NvbnRlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMuX2NvbnRlbnQpfXRoaXMuZmlyZShcImNvbnRlbnR1cGRhdGVcIil9fSxfdXBkYXRlTGF5b3V0OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fY29udGVudE5vZGUsZT10LnN0eWxlO2Uud2lkdGg9XCJcIixlLndoaXRlU3BhY2U9XCJub3dyYXBcIjt2YXIgaT10Lm9mZnNldFdpZHRoO2k9TWF0aC5taW4oaSx0aGlzLm9wdGlvbnMubWF4V2lkdGgpLGk9TWF0aC5tYXgoaSx0aGlzLm9wdGlvbnMubWluV2lkdGgpLGUud2lkdGg9aSsxK1wicHhcIixlLndoaXRlU3BhY2U9XCJcIixlLmhlaWdodD1cIlwiO3ZhciBuPXQub2Zmc2V0SGVpZ2h0LHM9dGhpcy5vcHRpb25zLm1heEhlaWdodCxhPVwibGVhZmxldC1wb3B1cC1zY3JvbGxlZFwiO3MmJm4+cz8oZS5oZWlnaHQ9cytcInB4XCIsby5Eb21VdGlsLmFkZENsYXNzKHQsYSkpOm8uRG9tVXRpbC5yZW1vdmVDbGFzcyh0LGEpLHRoaXMuX2NvbnRhaW5lcldpZHRoPXRoaXMuX2NvbnRhaW5lci5vZmZzZXRXaWR0aH0sX3VwZGF0ZVBvc2l0aW9uOmZ1bmN0aW9uKCl7aWYodGhpcy5fbWFwKXt2YXIgdD10aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KHRoaXMuX2xhdGxuZyksZT10aGlzLl9hbmltYXRlZCxpPW8ucG9pbnQodGhpcy5vcHRpb25zLm9mZnNldCk7ZSYmby5Eb21VdGlsLnNldFBvc2l0aW9uKHRoaXMuX2NvbnRhaW5lcix0KSx0aGlzLl9jb250YWluZXJCb3R0b209LWkueS0oZT8wOnQueSksdGhpcy5fY29udGFpbmVyTGVmdD0tTWF0aC5yb3VuZCh0aGlzLl9jb250YWluZXJXaWR0aC8yKStpLngrKGU/MDp0LngpLHRoaXMuX2NvbnRhaW5lci5zdHlsZS5ib3R0b209dGhpcy5fY29udGFpbmVyQm90dG9tK1wicHhcIix0aGlzLl9jb250YWluZXIuc3R5bGUubGVmdD10aGlzLl9jb250YWluZXJMZWZ0K1wicHhcIn19LF96b29tQW5pbWF0aW9uOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX21hcC5fbGF0TG5nVG9OZXdMYXllclBvaW50KHRoaXMuX2xhdGxuZyx0Lnpvb20sdC5jZW50ZXIpO28uRG9tVXRpbC5zZXRQb3NpdGlvbih0aGlzLl9jb250YWluZXIsZSl9LF9hZGp1c3RQYW46ZnVuY3Rpb24oKXtpZih0aGlzLm9wdGlvbnMuYXV0b1Bhbil7dmFyIHQ9dGhpcy5fbWFwLGU9dGhpcy5fY29udGFpbmVyLm9mZnNldEhlaWdodCxpPXRoaXMuX2NvbnRhaW5lcldpZHRoLG49bmV3IG8uUG9pbnQodGhpcy5fY29udGFpbmVyTGVmdCwtZS10aGlzLl9jb250YWluZXJCb3R0b20pO3RoaXMuX2FuaW1hdGVkJiZuLl9hZGQoby5Eb21VdGlsLmdldFBvc2l0aW9uKHRoaXMuX2NvbnRhaW5lcikpO3ZhciBzPXQubGF5ZXJQb2ludFRvQ29udGFpbmVyUG9pbnQobiksYT1vLnBvaW50KHRoaXMub3B0aW9ucy5hdXRvUGFuUGFkZGluZykscj10LmdldFNpemUoKSxoPTAsbD0wO3MueCtpPnIueCYmKGg9cy54K2ktci54K2EueCkscy54LWg8MCYmKGg9cy54LWEueCkscy55K2U+ci55JiYobD1zLnkrZS1yLnkrYS55KSxzLnktbDwwJiYobD1zLnktYS55KSwoaHx8bCkmJnQuZmlyZShcImF1dG9wYW5zdGFydFwiKS5wYW5CeShbaCxsXSl9fSxfb25DbG9zZUJ1dHRvbkNsaWNrOmZ1bmN0aW9uKHQpe3RoaXMuX2Nsb3NlKCksby5Eb21FdmVudC5zdG9wKHQpfX0pLG8ucG9wdXA9ZnVuY3Rpb24odCxlKXtyZXR1cm4gbmV3IG8uUG9wdXAodCxlKX0sby5NYXAuaW5jbHVkZSh7b3BlblBvcHVwOmZ1bmN0aW9uKHQsZSxpKXtpZih0aGlzLmNsb3NlUG9wdXAoKSwhKHQgaW5zdGFuY2VvZiBvLlBvcHVwKSl7dmFyIG49dDt0PW5ldyBvLlBvcHVwKGkpLnNldExhdExuZyhlKS5zZXRDb250ZW50KG4pfXJldHVybiB0Ll9pc09wZW49ITAsdGhpcy5fcG9wdXA9dCx0aGlzLmFkZExheWVyKHQpfSxjbG9zZVBvcHVwOmZ1bmN0aW9uKHQpe3JldHVybiB0JiZ0IT09dGhpcy5fcG9wdXB8fCh0PXRoaXMuX3BvcHVwLHRoaXMuX3BvcHVwPW51bGwpLHQmJih0aGlzLnJlbW92ZUxheWVyKHQpLHQuX2lzT3Blbj0hMSksdGhpc319KSxvLk1hcmtlci5pbmNsdWRlKHtvcGVuUG9wdXA6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fcG9wdXAmJnRoaXMuX21hcCYmIXRoaXMuX21hcC5oYXNMYXllcih0aGlzLl9wb3B1cCkmJih0aGlzLl9wb3B1cC5zZXRMYXRMbmcodGhpcy5fbGF0bG5nKSx0aGlzLl9tYXAub3BlblBvcHVwKHRoaXMuX3BvcHVwKSksdGhpc30sY2xvc2VQb3B1cDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9wb3B1cCYmdGhpcy5fcG9wdXAuX2Nsb3NlKCksdGhpc30sdG9nZ2xlUG9wdXA6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fcG9wdXAmJih0aGlzLl9wb3B1cC5faXNPcGVuP3RoaXMuY2xvc2VQb3B1cCgpOnRoaXMub3BlblBvcHVwKCkpLHRoaXN9LGJpbmRQb3B1cDpmdW5jdGlvbih0LGUpe3ZhciBpPW8ucG9pbnQodGhpcy5vcHRpb25zLmljb24ub3B0aW9ucy5wb3B1cEFuY2hvcnx8WzAsMF0pO3JldHVybiBpPWkuYWRkKG8uUG9wdXAucHJvdG90eXBlLm9wdGlvbnMub2Zmc2V0KSxlJiZlLm9mZnNldCYmKGk9aS5hZGQoZS5vZmZzZXQpKSxlPW8uZXh0ZW5kKHtvZmZzZXQ6aX0sZSksdGhpcy5fcG9wdXB8fHRoaXMub24oXCJjbGlja1wiLHRoaXMudG9nZ2xlUG9wdXAsdGhpcykub24oXCJyZW1vdmVcIix0aGlzLmNsb3NlUG9wdXAsdGhpcykub24oXCJtb3ZlXCIsdGhpcy5fbW92ZVBvcHVwLHRoaXMpLHQgaW5zdGFuY2VvZiBvLlBvcHVwPyhvLnNldE9wdGlvbnModCxlKSx0aGlzLl9wb3B1cD10KTp0aGlzLl9wb3B1cD1uZXcgby5Qb3B1cChlLHRoaXMpLnNldENvbnRlbnQodCksdGhpc30sc2V0UG9wdXBDb250ZW50OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9wb3B1cCYmdGhpcy5fcG9wdXAuc2V0Q29udGVudCh0KSx0aGlzfSx1bmJpbmRQb3B1cDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9wb3B1cCYmKHRoaXMuX3BvcHVwPW51bGwsdGhpcy5vZmYoXCJjbGlja1wiLHRoaXMudG9nZ2xlUG9wdXApLm9mZihcInJlbW92ZVwiLHRoaXMuY2xvc2VQb3B1cCkub2ZmKFwibW92ZVwiLHRoaXMuX21vdmVQb3B1cCkpLHRoaXN9LF9tb3ZlUG9wdXA6ZnVuY3Rpb24odCl7dGhpcy5fcG9wdXAuc2V0TGF0TG5nKHQubGF0bG5nKX19KSxvLkxheWVyR3JvdXA9by5DbGFzcy5leHRlbmQoe2luaXRpYWxpemU6ZnVuY3Rpb24odCl7dGhpcy5fbGF5ZXJzPXt9O3ZhciBlLGk7aWYodClmb3IoZT0wLGk9dC5sZW5ndGg7aT5lO2UrKyl0aGlzLmFkZExheWVyKHRbZV0pfSxhZGRMYXllcjpmdW5jdGlvbih0KXt2YXIgZT10aGlzLmdldExheWVySWQodCk7cmV0dXJuIHRoaXMuX2xheWVyc1tlXT10LHRoaXMuX21hcCYmdGhpcy5fbWFwLmFkZExheWVyKHQpLHRoaXN9LHJlbW92ZUxheWVyOmZ1bmN0aW9uKHQpe3ZhciBlPXQgaW4gdGhpcy5fbGF5ZXJzP3Q6dGhpcy5nZXRMYXllcklkKHQpO3JldHVybiB0aGlzLl9tYXAmJnRoaXMuX2xheWVyc1tlXSYmdGhpcy5fbWFwLnJlbW92ZUxheWVyKHRoaXMuX2xheWVyc1tlXSksZGVsZXRlIHRoaXMuX2xheWVyc1tlXSx0aGlzfSxoYXNMYXllcjpmdW5jdGlvbih0KXtyZXR1cm4gdD90IGluIHRoaXMuX2xheWVyc3x8dGhpcy5nZXRMYXllcklkKHQpaW4gdGhpcy5fbGF5ZXJzOiExfSxjbGVhckxheWVyczpmdW5jdGlvbigpe3JldHVybiB0aGlzLmVhY2hMYXllcih0aGlzLnJlbW92ZUxheWVyLHRoaXMpLHRoaXN9LGludm9rZTpmdW5jdGlvbih0KXt2YXIgZSxpLG49QXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLDEpO2ZvcihlIGluIHRoaXMuX2xheWVycylpPXRoaXMuX2xheWVyc1tlXSxpW3RdJiZpW3RdLmFwcGx5KGksbik7cmV0dXJuIHRoaXN9LG9uQWRkOmZ1bmN0aW9uKHQpe3RoaXMuX21hcD10LHRoaXMuZWFjaExheWVyKHQuYWRkTGF5ZXIsdCl9LG9uUmVtb3ZlOmZ1bmN0aW9uKHQpe3RoaXMuZWFjaExheWVyKHQucmVtb3ZlTGF5ZXIsdCksdGhpcy5fbWFwPW51bGx9LGFkZFRvOmZ1bmN0aW9uKHQpe3JldHVybiB0LmFkZExheWVyKHRoaXMpLHRoaXN9LGVhY2hMYXllcjpmdW5jdGlvbih0LGUpe2Zvcih2YXIgaSBpbiB0aGlzLl9sYXllcnMpdC5jYWxsKGUsdGhpcy5fbGF5ZXJzW2ldKTtyZXR1cm4gdGhpc30sZ2V0TGF5ZXI6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2xheWVyc1t0XX0sZ2V0TGF5ZXJzOmZ1bmN0aW9uKCl7dmFyIHQ9W107Zm9yKHZhciBlIGluIHRoaXMuX2xheWVycyl0LnB1c2godGhpcy5fbGF5ZXJzW2VdKTtyZXR1cm4gdH0sc2V0WkluZGV4OmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmludm9rZShcInNldFpJbmRleFwiLHQpfSxnZXRMYXllcklkOmZ1bmN0aW9uKHQpe3JldHVybiBvLnN0YW1wKHQpfX0pLG8ubGF5ZXJHcm91cD1mdW5jdGlvbih0KXtyZXR1cm4gbmV3IG8uTGF5ZXJHcm91cCh0KX0sby5GZWF0dXJlR3JvdXA9by5MYXllckdyb3VwLmV4dGVuZCh7aW5jbHVkZXM6by5NaXhpbi5FdmVudHMsc3RhdGljczp7RVZFTlRTOlwiY2xpY2sgZGJsY2xpY2sgbW91c2VvdmVyIG1vdXNlb3V0IG1vdXNlbW92ZSBjb250ZXh0bWVudSBwb3B1cG9wZW4gcG9wdXBjbG9zZVwifSxhZGRMYXllcjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXNMYXllcih0KT90aGlzOih0Lm9uKG8uRmVhdHVyZUdyb3VwLkVWRU5UUyx0aGlzLl9wcm9wYWdhdGVFdmVudCx0aGlzKSxvLkxheWVyR3JvdXAucHJvdG90eXBlLmFkZExheWVyLmNhbGwodGhpcyx0KSx0aGlzLl9wb3B1cENvbnRlbnQmJnQuYmluZFBvcHVwJiZ0LmJpbmRQb3B1cCh0aGlzLl9wb3B1cENvbnRlbnQsdGhpcy5fcG9wdXBPcHRpb25zKSx0aGlzLmZpcmUoXCJsYXllcmFkZFwiLHtsYXllcjp0fSkpfSxyZW1vdmVMYXllcjpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5oYXNMYXllcih0KT8odCBpbiB0aGlzLl9sYXllcnMmJih0PXRoaXMuX2xheWVyc1t0XSksdC5vZmYoby5GZWF0dXJlR3JvdXAuRVZFTlRTLHRoaXMuX3Byb3BhZ2F0ZUV2ZW50LHRoaXMpLG8uTGF5ZXJHcm91cC5wcm90b3R5cGUucmVtb3ZlTGF5ZXIuY2FsbCh0aGlzLHQpLHRoaXMuX3BvcHVwQ29udGVudCYmdGhpcy5pbnZva2UoXCJ1bmJpbmRQb3B1cFwiKSx0aGlzLmZpcmUoXCJsYXllcnJlbW92ZVwiLHtsYXllcjp0fSkpOnRoaXN9LGJpbmRQb3B1cDpmdW5jdGlvbih0LGUpe3JldHVybiB0aGlzLl9wb3B1cENvbnRlbnQ9dCx0aGlzLl9wb3B1cE9wdGlvbnM9ZSx0aGlzLmludm9rZShcImJpbmRQb3B1cFwiLHQsZSl9LHNldFN0eWxlOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLmludm9rZShcInNldFN0eWxlXCIsdCl9LGJyaW5nVG9Gcm9udDpmdW5jdGlvbigpe3JldHVybiB0aGlzLmludm9rZShcImJyaW5nVG9Gcm9udFwiKX0sYnJpbmdUb0JhY2s6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5pbnZva2UoXCJicmluZ1RvQmFja1wiKX0sZ2V0Qm91bmRzOmZ1bmN0aW9uKCl7dmFyIHQ9bmV3IG8uTGF0TG5nQm91bmRzO3JldHVybiB0aGlzLmVhY2hMYXllcihmdW5jdGlvbihlKXt0LmV4dGVuZChlIGluc3RhbmNlb2Ygby5NYXJrZXI/ZS5nZXRMYXRMbmcoKTplLmdldEJvdW5kcygpKX0pLHR9LF9wcm9wYWdhdGVFdmVudDpmdW5jdGlvbih0KXt0LmxheWVyfHwodC5sYXllcj10LnRhcmdldCksdC50YXJnZXQ9dGhpcyx0aGlzLmZpcmUodC50eXBlLHQpfX0pLG8uZmVhdHVyZUdyb3VwPWZ1bmN0aW9uKHQpe3JldHVybiBuZXcgby5GZWF0dXJlR3JvdXAodCl9LG8uUGF0aD1vLkNsYXNzLmV4dGVuZCh7aW5jbHVkZXM6W28uTWl4aW4uRXZlbnRzXSxzdGF0aWNzOntDTElQX1BBRERJTkc6ZnVuY3Rpb24oKXt2YXIgZT1vLkJyb3dzZXIubW9iaWxlPzEyODA6MmUzLGk9KGUvTWF0aC5tYXgodC5vdXRlcldpZHRoLHQub3V0ZXJIZWlnaHQpLTEpLzI7cmV0dXJuIE1hdGgubWF4KDAsTWF0aC5taW4oLjUsaSkpfSgpfSxvcHRpb25zOntzdHJva2U6ITAsY29sb3I6XCIjMDAzM2ZmXCIsZGFzaEFycmF5Om51bGwsd2VpZ2h0OjUsb3BhY2l0eTouNSxmaWxsOiExLGZpbGxDb2xvcjpudWxsLGZpbGxPcGFjaXR5Oi4yLGNsaWNrYWJsZTohMH0saW5pdGlhbGl6ZTpmdW5jdGlvbih0KXtvLnNldE9wdGlvbnModGhpcyx0KX0sb25BZGQ6ZnVuY3Rpb24odCl7dGhpcy5fbWFwPXQsdGhpcy5fY29udGFpbmVyfHwodGhpcy5faW5pdEVsZW1lbnRzKCksdGhpcy5faW5pdEV2ZW50cygpKSx0aGlzLnByb2plY3RMYXRsbmdzKCksdGhpcy5fdXBkYXRlUGF0aCgpLHRoaXMuX2NvbnRhaW5lciYmdGhpcy5fbWFwLl9wYXRoUm9vdC5hcHBlbmRDaGlsZCh0aGlzLl9jb250YWluZXIpLHRoaXMuZmlyZShcImFkZFwiKSx0Lm9uKHt2aWV3cmVzZXQ6dGhpcy5wcm9qZWN0TGF0bG5ncyxtb3ZlZW5kOnRoaXMuX3VwZGF0ZVBhdGh9LHRoaXMpfSxhZGRUbzpmdW5jdGlvbih0KXtyZXR1cm4gdC5hZGRMYXllcih0aGlzKSx0aGlzfSxvblJlbW92ZTpmdW5jdGlvbih0KXt0Ll9wYXRoUm9vdC5yZW1vdmVDaGlsZCh0aGlzLl9jb250YWluZXIpLHRoaXMuZmlyZShcInJlbW92ZVwiKSx0aGlzLl9tYXA9bnVsbCxvLkJyb3dzZXIudm1sJiYodGhpcy5fY29udGFpbmVyPW51bGwsdGhpcy5fc3Ryb2tlPW51bGwsdGhpcy5fZmlsbD1udWxsKSx0Lm9mZih7dmlld3Jlc2V0OnRoaXMucHJvamVjdExhdGxuZ3MsbW92ZWVuZDp0aGlzLl91cGRhdGVQYXRofSx0aGlzKX0scHJvamVjdExhdGxuZ3M6ZnVuY3Rpb24oKXt9LHNldFN0eWxlOmZ1bmN0aW9uKHQpe3JldHVybiBvLnNldE9wdGlvbnModGhpcyx0KSx0aGlzLl9jb250YWluZXImJnRoaXMuX3VwZGF0ZVN0eWxlKCksdGhpc30scmVkcmF3OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX21hcCYmKHRoaXMucHJvamVjdExhdGxuZ3MoKSx0aGlzLl91cGRhdGVQYXRoKCkpLHRoaXN9fSksby5NYXAuaW5jbHVkZSh7X3VwZGF0ZVBhdGhWaWV3cG9ydDpmdW5jdGlvbigpe3ZhciB0PW8uUGF0aC5DTElQX1BBRERJTkcsZT10aGlzLmdldFNpemUoKSxpPW8uRG9tVXRpbC5nZXRQb3NpdGlvbih0aGlzLl9tYXBQYW5lKSxuPWkubXVsdGlwbHlCeSgtMSkuX3N1YnRyYWN0KGUubXVsdGlwbHlCeSh0KS5fcm91bmQoKSkscz1uLmFkZChlLm11bHRpcGx5QnkoMSsyKnQpLl9yb3VuZCgpKTt0aGlzLl9wYXRoVmlld3BvcnQ9bmV3IG8uQm91bmRzKG4scyl9fSksby5QYXRoLlNWR19OUz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsby5Ccm93c2VyLnN2Zz0hKCFlLmNyZWF0ZUVsZW1lbnROU3x8IWUuY3JlYXRlRWxlbWVudE5TKG8uUGF0aC5TVkdfTlMsXCJzdmdcIikuY3JlYXRlU1ZHUmVjdCksby5QYXRoPW8uUGF0aC5leHRlbmQoe3N0YXRpY3M6e1NWRzpvLkJyb3dzZXIuc3ZnfSxicmluZ1RvRnJvbnQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9tYXAuX3BhdGhSb290LGU9dGhpcy5fY29udGFpbmVyO3JldHVybiBlJiZ0Lmxhc3RDaGlsZCE9PWUmJnQuYXBwZW5kQ2hpbGQoZSksdGhpc30sYnJpbmdUb0JhY2s6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9tYXAuX3BhdGhSb290LGU9dGhpcy5fY29udGFpbmVyLGk9dC5maXJzdENoaWxkO3JldHVybiBlJiZpIT09ZSYmdC5pbnNlcnRCZWZvcmUoZSxpKSx0aGlzfSxnZXRQYXRoU3RyaW5nOmZ1bmN0aW9uKCl7fSxfY3JlYXRlRWxlbWVudDpmdW5jdGlvbih0KXtyZXR1cm4gZS5jcmVhdGVFbGVtZW50TlMoby5QYXRoLlNWR19OUyx0KX0sX2luaXRFbGVtZW50czpmdW5jdGlvbigpe3RoaXMuX21hcC5faW5pdFBhdGhSb290KCksdGhpcy5faW5pdFBhdGgoKSx0aGlzLl9pbml0U3R5bGUoKX0sX2luaXRQYXRoOmZ1bmN0aW9uKCl7dGhpcy5fY29udGFpbmVyPXRoaXMuX2NyZWF0ZUVsZW1lbnQoXCJnXCIpLHRoaXMuX3BhdGg9dGhpcy5fY3JlYXRlRWxlbWVudChcInBhdGhcIiksdGhpcy5fY29udGFpbmVyLmFwcGVuZENoaWxkKHRoaXMuX3BhdGgpfSxfaW5pdFN0eWxlOmZ1bmN0aW9uKCl7dGhpcy5vcHRpb25zLnN0cm9rZSYmKHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKFwic3Ryb2tlLWxpbmVqb2luXCIsXCJyb3VuZFwiKSx0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcInN0cm9rZS1saW5lY2FwXCIsXCJyb3VuZFwiKSksdGhpcy5vcHRpb25zLmZpbGwmJnRoaXMuX3BhdGguc2V0QXR0cmlidXRlKFwiZmlsbC1ydWxlXCIsXCJldmVub2RkXCIpLHRoaXMub3B0aW9ucy5wb2ludGVyRXZlbnRzJiZ0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcInBvaW50ZXItZXZlbnRzXCIsdGhpcy5vcHRpb25zLnBvaW50ZXJFdmVudHMpLHRoaXMub3B0aW9ucy5jbGlja2FibGV8fHRoaXMub3B0aW9ucy5wb2ludGVyRXZlbnRzfHx0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcInBvaW50ZXItZXZlbnRzXCIsXCJub25lXCIpLHRoaXMuX3VwZGF0ZVN0eWxlKCl9LF91cGRhdGVTdHlsZTpmdW5jdGlvbigpe3RoaXMub3B0aW9ucy5zdHJva2U/KHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKFwic3Ryb2tlXCIsdGhpcy5vcHRpb25zLmNvbG9yKSx0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcInN0cm9rZS1vcGFjaXR5XCIsdGhpcy5vcHRpb25zLm9wYWNpdHkpLHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKFwic3Ryb2tlLXdpZHRoXCIsdGhpcy5vcHRpb25zLndlaWdodCksdGhpcy5vcHRpb25zLmRhc2hBcnJheT90aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcInN0cm9rZS1kYXNoYXJyYXlcIix0aGlzLm9wdGlvbnMuZGFzaEFycmF5KTp0aGlzLl9wYXRoLnJlbW92ZUF0dHJpYnV0ZShcInN0cm9rZS1kYXNoYXJyYXlcIikpOnRoaXMuX3BhdGguc2V0QXR0cmlidXRlKFwic3Ryb2tlXCIsXCJub25lXCIpLHRoaXMub3B0aW9ucy5maWxsPyh0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcImZpbGxcIix0aGlzLm9wdGlvbnMuZmlsbENvbG9yfHx0aGlzLm9wdGlvbnMuY29sb3IpLHRoaXMuX3BhdGguc2V0QXR0cmlidXRlKFwiZmlsbC1vcGFjaXR5XCIsdGhpcy5vcHRpb25zLmZpbGxPcGFjaXR5KSk6dGhpcy5fcGF0aC5zZXRBdHRyaWJ1dGUoXCJmaWxsXCIsXCJub25lXCIpfSxfdXBkYXRlUGF0aDpmdW5jdGlvbigpe3ZhciB0PXRoaXMuZ2V0UGF0aFN0cmluZygpO3R8fCh0PVwiTTAgMFwiKSx0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcImRcIix0KX0sX2luaXRFdmVudHM6ZnVuY3Rpb24oKXtpZih0aGlzLm9wdGlvbnMuY2xpY2thYmxlKXsoby5Ccm93c2VyLnN2Z3x8IW8uQnJvd3Nlci52bWwpJiZ0aGlzLl9wYXRoLnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCJsZWFmbGV0LWNsaWNrYWJsZVwiKSxvLkRvbUV2ZW50Lm9uKHRoaXMuX2NvbnRhaW5lcixcImNsaWNrXCIsdGhpcy5fb25Nb3VzZUNsaWNrLHRoaXMpO2Zvcih2YXIgdD1bXCJkYmxjbGlja1wiLFwibW91c2Vkb3duXCIsXCJtb3VzZW92ZXJcIixcIm1vdXNlb3V0XCIsXCJtb3VzZW1vdmVcIixcImNvbnRleHRtZW51XCJdLGU9MDtlPHQubGVuZ3RoO2UrKylvLkRvbUV2ZW50Lm9uKHRoaXMuX2NvbnRhaW5lcix0W2VdLHRoaXMuX2ZpcmVNb3VzZUV2ZW50LHRoaXMpfX0sX29uTW91c2VDbGljazpmdW5jdGlvbih0KXt0aGlzLl9tYXAuZHJhZ2dpbmcmJnRoaXMuX21hcC5kcmFnZ2luZy5tb3ZlZCgpfHx0aGlzLl9maXJlTW91c2VFdmVudCh0KX0sX2ZpcmVNb3VzZUV2ZW50OmZ1bmN0aW9uKHQpe2lmKHRoaXMuaGFzRXZlbnRMaXN0ZW5lcnModC50eXBlKSl7dmFyIGU9dGhpcy5fbWFwLGk9ZS5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludCh0KSxuPWUuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoaSkscz1lLmxheWVyUG9pbnRUb0xhdExuZyhuKTt0aGlzLmZpcmUodC50eXBlLHtsYXRsbmc6cyxsYXllclBvaW50Om4sY29udGFpbmVyUG9pbnQ6aSxvcmlnaW5hbEV2ZW50OnR9KSxcImNvbnRleHRtZW51XCI9PT10LnR5cGUmJm8uRG9tRXZlbnQucHJldmVudERlZmF1bHQodCksXCJtb3VzZW1vdmVcIiE9PXQudHlwZSYmby5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24odCl9fX0pLG8uTWFwLmluY2x1ZGUoe19pbml0UGF0aFJvb3Q6ZnVuY3Rpb24oKXt0aGlzLl9wYXRoUm9vdHx8KHRoaXMuX3BhdGhSb290PW8uUGF0aC5wcm90b3R5cGUuX2NyZWF0ZUVsZW1lbnQoXCJzdmdcIiksdGhpcy5fcGFuZXMub3ZlcmxheVBhbmUuYXBwZW5kQ2hpbGQodGhpcy5fcGF0aFJvb3QpLHRoaXMub3B0aW9ucy56b29tQW5pbWF0aW9uJiZvLkJyb3dzZXIuYW55M2Q/KHRoaXMuX3BhdGhSb290LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCIgbGVhZmxldC16b29tLWFuaW1hdGVkXCIpLHRoaXMub24oe3pvb21hbmltOnRoaXMuX2FuaW1hdGVQYXRoWm9vbSx6b29tZW5kOnRoaXMuX2VuZFBhdGhab29tfSkpOnRoaXMuX3BhdGhSb290LnNldEF0dHJpYnV0ZShcImNsYXNzXCIsXCIgbGVhZmxldC16b29tLWhpZGVcIiksdGhpcy5vbihcIm1vdmVlbmRcIix0aGlzLl91cGRhdGVTdmdWaWV3cG9ydCksdGhpcy5fdXBkYXRlU3ZnVmlld3BvcnQoKSl9LF9hbmltYXRlUGF0aFpvb206ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5nZXRab29tU2NhbGUodC56b29tKSxpPXRoaXMuX2dldENlbnRlck9mZnNldCh0LmNlbnRlcikuX211bHRpcGx5QnkoLWUpLl9hZGQodGhpcy5fcGF0aFZpZXdwb3J0Lm1pbik7dGhpcy5fcGF0aFJvb3Quc3R5bGVbby5Eb21VdGlsLlRSQU5TRk9STV09by5Eb21VdGlsLmdldFRyYW5zbGF0ZVN0cmluZyhpKStcIiBzY2FsZShcIitlK1wiKSBcIix0aGlzLl9wYXRoWm9vbWluZz0hMH0sX2VuZFBhdGhab29tOmZ1bmN0aW9uKCl7dGhpcy5fcGF0aFpvb21pbmc9ITF9LF91cGRhdGVTdmdWaWV3cG9ydDpmdW5jdGlvbigpe2lmKCF0aGlzLl9wYXRoWm9vbWluZyl7dGhpcy5fdXBkYXRlUGF0aFZpZXdwb3J0KCk7dmFyIHQ9dGhpcy5fcGF0aFZpZXdwb3J0LGU9dC5taW4saT10Lm1heCxuPWkueC1lLngscz1pLnktZS55LGE9dGhpcy5fcGF0aFJvb3Qscj10aGlzLl9wYW5lcy5vdmVybGF5UGFuZTtvLkJyb3dzZXIubW9iaWxlV2Via2l0JiZyLnJlbW92ZUNoaWxkKGEpLG8uRG9tVXRpbC5zZXRQb3NpdGlvbihhLGUpLGEuc2V0QXR0cmlidXRlKFwid2lkdGhcIixuKSxhLnNldEF0dHJpYnV0ZShcImhlaWdodFwiLHMpLGEuc2V0QXR0cmlidXRlKFwidmlld0JveFwiLFtlLngsZS55LG4sc10uam9pbihcIiBcIikpLG8uQnJvd3Nlci5tb2JpbGVXZWJraXQmJnIuYXBwZW5kQ2hpbGQoYSl9fX0pLG8uUGF0aC5pbmNsdWRlKHtiaW5kUG9wdXA6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdCBpbnN0YW5jZW9mIG8uUG9wdXA/dGhpcy5fcG9wdXA9dDooKCF0aGlzLl9wb3B1cHx8ZSkmJih0aGlzLl9wb3B1cD1uZXcgby5Qb3B1cChlLHRoaXMpKSx0aGlzLl9wb3B1cC5zZXRDb250ZW50KHQpKSx0aGlzLl9wb3B1cEhhbmRsZXJzQWRkZWR8fCh0aGlzLm9uKFwiY2xpY2tcIix0aGlzLl9vcGVuUG9wdXAsdGhpcykub24oXCJyZW1vdmVcIix0aGlzLmNsb3NlUG9wdXAsdGhpcyksdGhpcy5fcG9wdXBIYW5kbGVyc0FkZGVkPSEwKSx0aGlzfSx1bmJpbmRQb3B1cDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9wb3B1cCYmKHRoaXMuX3BvcHVwPW51bGwsdGhpcy5vZmYoXCJjbGlja1wiLHRoaXMuX29wZW5Qb3B1cCkub2ZmKFwicmVtb3ZlXCIsdGhpcy5jbG9zZVBvcHVwKSx0aGlzLl9wb3B1cEhhbmRsZXJzQWRkZWQ9ITEpLHRoaXN9LG9wZW5Qb3B1cDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fcG9wdXAmJih0PXR8fHRoaXMuX2xhdGxuZ3x8dGhpcy5fbGF0bG5nc1tNYXRoLmZsb29yKHRoaXMuX2xhdGxuZ3MubGVuZ3RoLzIpXSx0aGlzLl9vcGVuUG9wdXAoe2xhdGxuZzp0fSkpLHRoaXN9LGNsb3NlUG9wdXA6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fcG9wdXAmJnRoaXMuX3BvcHVwLl9jbG9zZSgpLHRoaXN9LF9vcGVuUG9wdXA6ZnVuY3Rpb24odCl7dGhpcy5fcG9wdXAuc2V0TGF0TG5nKHQubGF0bG5nKSx0aGlzLl9tYXAub3BlblBvcHVwKHRoaXMuX3BvcHVwKX19KSxvLkJyb3dzZXIudm1sPSFvLkJyb3dzZXIuc3ZnJiZmdW5jdGlvbigpe3RyeXt2YXIgdD1lLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7dC5pbm5lckhUTUw9Jzx2OnNoYXBlIGFkaj1cIjFcIi8+Jzt2YXIgaT10LmZpcnN0Q2hpbGQ7cmV0dXJuIGkuc3R5bGUuYmVoYXZpb3I9XCJ1cmwoI2RlZmF1bHQjVk1MKVwiLGkmJlwib2JqZWN0XCI9PXR5cGVvZiBpLmFkan1jYXRjaChuKXtyZXR1cm4hMX19KCksby5QYXRoPW8uQnJvd3Nlci5zdmd8fCFvLkJyb3dzZXIudm1sP28uUGF0aDpvLlBhdGguZXh0ZW5kKHtzdGF0aWNzOntWTUw6ITAsQ0xJUF9QQURESU5HOi4wMn0sX2NyZWF0ZUVsZW1lbnQ6ZnVuY3Rpb24oKXt0cnl7cmV0dXJuIGUubmFtZXNwYWNlcy5hZGQoXCJsdm1sXCIsXCJ1cm46c2NoZW1hcy1taWNyb3NvZnQtY29tOnZtbFwiKSxmdW5jdGlvbih0KXtyZXR1cm4gZS5jcmVhdGVFbGVtZW50KFwiPGx2bWw6XCIrdCsnIGNsYXNzPVwibHZtbFwiPicpfX1jYXRjaCh0KXtyZXR1cm4gZnVuY3Rpb24odCl7cmV0dXJuIGUuY3JlYXRlRWxlbWVudChcIjxcIit0KycgeG1sbnM9XCJ1cm46c2NoZW1hcy1taWNyb3NvZnQuY29tOnZtbFwiIGNsYXNzPVwibHZtbFwiPicpfX19KCksX2luaXRQYXRoOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fY29udGFpbmVyPXRoaXMuX2NyZWF0ZUVsZW1lbnQoXCJzaGFwZVwiKTtcbm8uRG9tVXRpbC5hZGRDbGFzcyh0LFwibGVhZmxldC12bWwtc2hhcGVcIiksdGhpcy5vcHRpb25zLmNsaWNrYWJsZSYmby5Eb21VdGlsLmFkZENsYXNzKHQsXCJsZWFmbGV0LWNsaWNrYWJsZVwiKSx0LmNvb3Jkc2l6ZT1cIjEgMVwiLHRoaXMuX3BhdGg9dGhpcy5fY3JlYXRlRWxlbWVudChcInBhdGhcIiksdC5hcHBlbmRDaGlsZCh0aGlzLl9wYXRoKSx0aGlzLl9tYXAuX3BhdGhSb290LmFwcGVuZENoaWxkKHQpfSxfaW5pdFN0eWxlOmZ1bmN0aW9uKCl7dGhpcy5fdXBkYXRlU3R5bGUoKX0sX3VwZGF0ZVN0eWxlOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fc3Ryb2tlLGU9dGhpcy5fZmlsbCxpPXRoaXMub3B0aW9ucyxuPXRoaXMuX2NvbnRhaW5lcjtuLnN0cm9rZWQ9aS5zdHJva2Usbi5maWxsZWQ9aS5maWxsLGkuc3Ryb2tlPyh0fHwodD10aGlzLl9zdHJva2U9dGhpcy5fY3JlYXRlRWxlbWVudChcInN0cm9rZVwiKSx0LmVuZGNhcD1cInJvdW5kXCIsbi5hcHBlbmRDaGlsZCh0KSksdC53ZWlnaHQ9aS53ZWlnaHQrXCJweFwiLHQuY29sb3I9aS5jb2xvcix0Lm9wYWNpdHk9aS5vcGFjaXR5LHQuZGFzaFN0eWxlPWkuZGFzaEFycmF5P2kuZGFzaEFycmF5IGluc3RhbmNlb2YgQXJyYXk/aS5kYXNoQXJyYXkuam9pbihcIiBcIik6aS5kYXNoQXJyYXkucmVwbGFjZSgvKCAqLCAqKS9nLFwiIFwiKTpcIlwiKTp0JiYobi5yZW1vdmVDaGlsZCh0KSx0aGlzLl9zdHJva2U9bnVsbCksaS5maWxsPyhlfHwoZT10aGlzLl9maWxsPXRoaXMuX2NyZWF0ZUVsZW1lbnQoXCJmaWxsXCIpLG4uYXBwZW5kQ2hpbGQoZSkpLGUuY29sb3I9aS5maWxsQ29sb3J8fGkuY29sb3IsZS5vcGFjaXR5PWkuZmlsbE9wYWNpdHkpOmUmJihuLnJlbW92ZUNoaWxkKGUpLHRoaXMuX2ZpbGw9bnVsbCl9LF91cGRhdGVQYXRoOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fY29udGFpbmVyLnN0eWxlO3QuZGlzcGxheT1cIm5vbmVcIix0aGlzLl9wYXRoLnY9dGhpcy5nZXRQYXRoU3RyaW5nKCkrXCIgXCIsdC5kaXNwbGF5PVwiXCJ9fSksby5NYXAuaW5jbHVkZShvLkJyb3dzZXIuc3ZnfHwhby5Ccm93c2VyLnZtbD97fTp7X2luaXRQYXRoUm9vdDpmdW5jdGlvbigpe2lmKCF0aGlzLl9wYXRoUm9vdCl7dmFyIHQ9dGhpcy5fcGF0aFJvb3Q9ZS5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO3QuY2xhc3NOYW1lPVwibGVhZmxldC12bWwtY29udGFpbmVyXCIsdGhpcy5fcGFuZXMub3ZlcmxheVBhbmUuYXBwZW5kQ2hpbGQodCksdGhpcy5vbihcIm1vdmVlbmRcIix0aGlzLl91cGRhdGVQYXRoVmlld3BvcnQpLHRoaXMuX3VwZGF0ZVBhdGhWaWV3cG9ydCgpfX19KSxvLkJyb3dzZXIuY2FudmFzPWZ1bmN0aW9uKCl7cmV0dXJuISFlLmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIikuZ2V0Q29udGV4dH0oKSxvLlBhdGg9by5QYXRoLlNWRyYmIXQuTF9QUkVGRVJfQ0FOVkFTfHwhby5Ccm93c2VyLmNhbnZhcz9vLlBhdGg6by5QYXRoLmV4dGVuZCh7c3RhdGljczp7Q0FOVkFTOiEwLFNWRzohMX0scmVkcmF3OmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX21hcCYmKHRoaXMucHJvamVjdExhdGxuZ3MoKSx0aGlzLl9yZXF1ZXN0VXBkYXRlKCkpLHRoaXN9LHNldFN0eWxlOmZ1bmN0aW9uKHQpe3JldHVybiBvLnNldE9wdGlvbnModGhpcyx0KSx0aGlzLl9tYXAmJih0aGlzLl91cGRhdGVTdHlsZSgpLHRoaXMuX3JlcXVlc3RVcGRhdGUoKSksdGhpc30sb25SZW1vdmU6ZnVuY3Rpb24odCl7dC5vZmYoXCJ2aWV3cmVzZXRcIix0aGlzLnByb2plY3RMYXRsbmdzLHRoaXMpLm9mZihcIm1vdmVlbmRcIix0aGlzLl91cGRhdGVQYXRoLHRoaXMpLHRoaXMub3B0aW9ucy5jbGlja2FibGUmJih0aGlzLl9tYXAub2ZmKFwiY2xpY2tcIix0aGlzLl9vbkNsaWNrLHRoaXMpLHRoaXMuX21hcC5vZmYoXCJtb3VzZW1vdmVcIix0aGlzLl9vbk1vdXNlTW92ZSx0aGlzKSksdGhpcy5fcmVxdWVzdFVwZGF0ZSgpLHRoaXMuX21hcD1udWxsfSxfcmVxdWVzdFVwZGF0ZTpmdW5jdGlvbigpe3RoaXMuX21hcCYmIW8uUGF0aC5fdXBkYXRlUmVxdWVzdCYmKG8uUGF0aC5fdXBkYXRlUmVxdWVzdD1vLlV0aWwucmVxdWVzdEFuaW1GcmFtZSh0aGlzLl9maXJlTWFwTW92ZUVuZCx0aGlzLl9tYXApKX0sX2ZpcmVNYXBNb3ZlRW5kOmZ1bmN0aW9uKCl7by5QYXRoLl91cGRhdGVSZXF1ZXN0PW51bGwsdGhpcy5maXJlKFwibW92ZWVuZFwiKX0sX2luaXRFbGVtZW50czpmdW5jdGlvbigpe3RoaXMuX21hcC5faW5pdFBhdGhSb290KCksdGhpcy5fY3R4PXRoaXMuX21hcC5fY2FudmFzQ3R4fSxfdXBkYXRlU3R5bGU6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLm9wdGlvbnM7dC5zdHJva2UmJih0aGlzLl9jdHgubGluZVdpZHRoPXQud2VpZ2h0LHRoaXMuX2N0eC5zdHJva2VTdHlsZT10LmNvbG9yKSx0LmZpbGwmJih0aGlzLl9jdHguZmlsbFN0eWxlPXQuZmlsbENvbG9yfHx0LmNvbG9yKX0sX2RyYXdQYXRoOmZ1bmN0aW9uKCl7dmFyIHQsZSxpLG4scyxhO2Zvcih0aGlzLl9jdHguYmVnaW5QYXRoKCksdD0wLGk9dGhpcy5fcGFydHMubGVuZ3RoO2k+dDt0Kyspe2ZvcihlPTAsbj10aGlzLl9wYXJ0c1t0XS5sZW5ndGg7bj5lO2UrKylzPXRoaXMuX3BhcnRzW3RdW2VdLGE9KDA9PT1lP1wibW92ZVwiOlwibGluZVwiKStcIlRvXCIsdGhpcy5fY3R4W2FdKHMueCxzLnkpO3RoaXMgaW5zdGFuY2VvZiBvLlBvbHlnb24mJnRoaXMuX2N0eC5jbG9zZVBhdGgoKX19LF9jaGVja0lmRW1wdHk6ZnVuY3Rpb24oKXtyZXR1cm4hdGhpcy5fcGFydHMubGVuZ3RofSxfdXBkYXRlUGF0aDpmdW5jdGlvbigpe2lmKCF0aGlzLl9jaGVja0lmRW1wdHkoKSl7dmFyIHQ9dGhpcy5fY3R4LGU9dGhpcy5vcHRpb25zO3RoaXMuX2RyYXdQYXRoKCksdC5zYXZlKCksdGhpcy5fdXBkYXRlU3R5bGUoKSxlLmZpbGwmJih0Lmdsb2JhbEFscGhhPWUuZmlsbE9wYWNpdHksdC5maWxsKCkpLGUuc3Ryb2tlJiYodC5nbG9iYWxBbHBoYT1lLm9wYWNpdHksdC5zdHJva2UoKSksdC5yZXN0b3JlKCl9fSxfaW5pdEV2ZW50czpmdW5jdGlvbigpe3RoaXMub3B0aW9ucy5jbGlja2FibGUmJih0aGlzLl9tYXAub24oXCJtb3VzZW1vdmVcIix0aGlzLl9vbk1vdXNlTW92ZSx0aGlzKSx0aGlzLl9tYXAub24oXCJjbGlja1wiLHRoaXMuX29uQ2xpY2ssdGhpcykpfSxfb25DbGljazpmdW5jdGlvbih0KXt0aGlzLl9jb250YWluc1BvaW50KHQubGF5ZXJQb2ludCkmJnRoaXMuZmlyZShcImNsaWNrXCIsdCl9LF9vbk1vdXNlTW92ZTpmdW5jdGlvbih0KXt0aGlzLl9tYXAmJiF0aGlzLl9tYXAuX2FuaW1hdGluZ1pvb20mJih0aGlzLl9jb250YWluc1BvaW50KHQubGF5ZXJQb2ludCk/KHRoaXMuX2N0eC5jYW52YXMuc3R5bGUuY3Vyc29yPVwicG9pbnRlclwiLHRoaXMuX21vdXNlSW5zaWRlPSEwLHRoaXMuZmlyZShcIm1vdXNlb3ZlclwiLHQpKTp0aGlzLl9tb3VzZUluc2lkZSYmKHRoaXMuX2N0eC5jYW52YXMuc3R5bGUuY3Vyc29yPVwiXCIsdGhpcy5fbW91c2VJbnNpZGU9ITEsdGhpcy5maXJlKFwibW91c2VvdXRcIix0KSkpfX0pLG8uTWFwLmluY2x1ZGUoby5QYXRoLlNWRyYmIXQuTF9QUkVGRVJfQ0FOVkFTfHwhby5Ccm93c2VyLmNhbnZhcz97fTp7X2luaXRQYXRoUm9vdDpmdW5jdGlvbigpe3ZhciB0LGk9dGhpcy5fcGF0aFJvb3Q7aXx8KGk9dGhpcy5fcGF0aFJvb3Q9ZS5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLGkuc3R5bGUucG9zaXRpb249XCJhYnNvbHV0ZVwiLHQ9dGhpcy5fY2FudmFzQ3R4PWkuZ2V0Q29udGV4dChcIjJkXCIpLHQubGluZUNhcD1cInJvdW5kXCIsdC5saW5lSm9pbj1cInJvdW5kXCIsdGhpcy5fcGFuZXMub3ZlcmxheVBhbmUuYXBwZW5kQ2hpbGQoaSksdGhpcy5vcHRpb25zLnpvb21BbmltYXRpb24mJih0aGlzLl9wYXRoUm9vdC5jbGFzc05hbWU9XCJsZWFmbGV0LXpvb20tYW5pbWF0ZWRcIix0aGlzLm9uKFwiem9vbWFuaW1cIix0aGlzLl9hbmltYXRlUGF0aFpvb20pLHRoaXMub24oXCJ6b29tZW5kXCIsdGhpcy5fZW5kUGF0aFpvb20pKSx0aGlzLm9uKFwibW92ZWVuZFwiLHRoaXMuX3VwZGF0ZUNhbnZhc1ZpZXdwb3J0KSx0aGlzLl91cGRhdGVDYW52YXNWaWV3cG9ydCgpKX0sX3VwZGF0ZUNhbnZhc1ZpZXdwb3J0OmZ1bmN0aW9uKCl7aWYoIXRoaXMuX3BhdGhab29taW5nKXt0aGlzLl91cGRhdGVQYXRoVmlld3BvcnQoKTt2YXIgdD10aGlzLl9wYXRoVmlld3BvcnQsZT10Lm1pbixpPXQubWF4LnN1YnRyYWN0KGUpLG49dGhpcy5fcGF0aFJvb3Q7by5Eb21VdGlsLnNldFBvc2l0aW9uKG4sZSksbi53aWR0aD1pLngsbi5oZWlnaHQ9aS55LG4uZ2V0Q29udGV4dChcIjJkXCIpLnRyYW5zbGF0ZSgtZS54LC1lLnkpfX19KSxvLkxpbmVVdGlsPXtzaW1wbGlmeTpmdW5jdGlvbih0LGUpe2lmKCFlfHwhdC5sZW5ndGgpcmV0dXJuIHQuc2xpY2UoKTt2YXIgaT1lKmU7cmV0dXJuIHQ9dGhpcy5fcmVkdWNlUG9pbnRzKHQsaSksdD10aGlzLl9zaW1wbGlmeURQKHQsaSl9LHBvaW50VG9TZWdtZW50RGlzdGFuY2U6ZnVuY3Rpb24odCxlLGkpe3JldHVybiBNYXRoLnNxcnQodGhpcy5fc3FDbG9zZXN0UG9pbnRPblNlZ21lbnQodCxlLGksITApKX0sY2xvc2VzdFBvaW50T25TZWdtZW50OmZ1bmN0aW9uKHQsZSxpKXtyZXR1cm4gdGhpcy5fc3FDbG9zZXN0UG9pbnRPblNlZ21lbnQodCxlLGkpfSxfc2ltcGxpZnlEUDpmdW5jdGlvbih0LGUpe3ZhciBuPXQubGVuZ3RoLG89dHlwZW9mIFVpbnQ4QXJyYXkhPWkrXCJcIj9VaW50OEFycmF5OkFycmF5LHM9bmV3IG8obik7c1swXT1zW24tMV09MSx0aGlzLl9zaW1wbGlmeURQU3RlcCh0LHMsZSwwLG4tMSk7dmFyIGEscj1bXTtmb3IoYT0wO24+YTthKyspc1thXSYmci5wdXNoKHRbYV0pO3JldHVybiByfSxfc2ltcGxpZnlEUFN0ZXA6ZnVuY3Rpb24odCxlLGksbixvKXt2YXIgcyxhLHIsaD0wO2ZvcihhPW4rMTtvLTE+PWE7YSsrKXI9dGhpcy5fc3FDbG9zZXN0UG9pbnRPblNlZ21lbnQodFthXSx0W25dLHRbb10sITApLHI+aCYmKHM9YSxoPXIpO2g+aSYmKGVbc109MSx0aGlzLl9zaW1wbGlmeURQU3RlcCh0LGUsaSxuLHMpLHRoaXMuX3NpbXBsaWZ5RFBTdGVwKHQsZSxpLHMsbykpfSxfcmVkdWNlUG9pbnRzOmZ1bmN0aW9uKHQsZSl7Zm9yKHZhciBpPVt0WzBdXSxuPTEsbz0wLHM9dC5sZW5ndGg7cz5uO24rKyl0aGlzLl9zcURpc3QodFtuXSx0W29dKT5lJiYoaS5wdXNoKHRbbl0pLG89bik7cmV0dXJuIHMtMT5vJiZpLnB1c2godFtzLTFdKSxpfSxjbGlwU2VnbWVudDpmdW5jdGlvbih0LGUsaSxuKXt2YXIgbyxzLGEscj1uP3RoaXMuX2xhc3RDb2RlOnRoaXMuX2dldEJpdENvZGUodCxpKSxoPXRoaXMuX2dldEJpdENvZGUoZSxpKTtmb3IodGhpcy5fbGFzdENvZGU9aDs7KXtpZighKHJ8aCkpcmV0dXJuW3QsZV07aWYociZoKXJldHVybiExO289cnx8aCxzPXRoaXMuX2dldEVkZ2VJbnRlcnNlY3Rpb24odCxlLG8saSksYT10aGlzLl9nZXRCaXRDb2RlKHMsaSksbz09PXI/KHQ9cyxyPWEpOihlPXMsaD1hKX19LF9nZXRFZGdlSW50ZXJzZWN0aW9uOmZ1bmN0aW9uKHQsZSxpLG4pe3ZhciBzPWUueC10LngsYT1lLnktdC55LHI9bi5taW4saD1uLm1heDtyZXR1cm4gOCZpP25ldyBvLlBvaW50KHQueCtzKihoLnktdC55KS9hLGgueSk6NCZpP25ldyBvLlBvaW50KHQueCtzKihyLnktdC55KS9hLHIueSk6MiZpP25ldyBvLlBvaW50KGgueCx0LnkrYSooaC54LXQueCkvcyk6MSZpP25ldyBvLlBvaW50KHIueCx0LnkrYSooci54LXQueCkvcyk6dm9pZCAwfSxfZ2V0Qml0Q29kZTpmdW5jdGlvbih0LGUpe3ZhciBpPTA7cmV0dXJuIHQueDxlLm1pbi54P2l8PTE6dC54PmUubWF4LngmJihpfD0yKSx0Lnk8ZS5taW4ueT9pfD00OnQueT5lLm1heC55JiYoaXw9OCksaX0sX3NxRGlzdDpmdW5jdGlvbih0LGUpe3ZhciBpPWUueC10Lngsbj1lLnktdC55O3JldHVybiBpKmkrbipufSxfc3FDbG9zZXN0UG9pbnRPblNlZ21lbnQ6ZnVuY3Rpb24odCxlLGksbil7dmFyIHMsYT1lLngscj1lLnksaD1pLngtYSxsPWkueS1yLHU9aCpoK2wqbDtyZXR1cm4gdT4wJiYocz0oKHQueC1hKSpoKyh0LnktcikqbCkvdSxzPjE/KGE9aS54LHI9aS55KTpzPjAmJihhKz1oKnMscis9bCpzKSksaD10LngtYSxsPXQueS1yLG4/aCpoK2wqbDpuZXcgby5Qb2ludChhLHIpfX0sby5Qb2x5bGluZT1vLlBhdGguZXh0ZW5kKHtpbml0aWFsaXplOmZ1bmN0aW9uKHQsZSl7by5QYXRoLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcyxlKSx0aGlzLl9sYXRsbmdzPXRoaXMuX2NvbnZlcnRMYXRMbmdzKHQpfSxvcHRpb25zOntzbW9vdGhGYWN0b3I6MSxub0NsaXA6ITF9LHByb2plY3RMYXRsbmdzOmZ1bmN0aW9uKCl7dGhpcy5fb3JpZ2luYWxQb2ludHM9W107Zm9yKHZhciB0PTAsZT10aGlzLl9sYXRsbmdzLmxlbmd0aDtlPnQ7dCsrKXRoaXMuX29yaWdpbmFsUG9pbnRzW3RdPXRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fbGF0bG5nc1t0XSl9LGdldFBhdGhTdHJpbmc6ZnVuY3Rpb24oKXtmb3IodmFyIHQ9MCxlPXRoaXMuX3BhcnRzLmxlbmd0aCxpPVwiXCI7ZT50O3QrKylpKz10aGlzLl9nZXRQYXRoUGFydFN0cih0aGlzLl9wYXJ0c1t0XSk7cmV0dXJuIGl9LGdldExhdExuZ3M6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fbGF0bG5nc30sc2V0TGF0TG5nczpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fbGF0bG5ncz10aGlzLl9jb252ZXJ0TGF0TG5ncyh0KSx0aGlzLnJlZHJhdygpfSxhZGRMYXRMbmc6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2xhdGxuZ3MucHVzaChvLmxhdExuZyh0KSksdGhpcy5yZWRyYXcoKX0sc3BsaWNlTGF0TG5nczpmdW5jdGlvbigpe3ZhciB0PVtdLnNwbGljZS5hcHBseSh0aGlzLl9sYXRsbmdzLGFyZ3VtZW50cyk7cmV0dXJuIHRoaXMuX2NvbnZlcnRMYXRMbmdzKHRoaXMuX2xhdGxuZ3MsITApLHRoaXMucmVkcmF3KCksdH0sY2xvc2VzdExheWVyUG9pbnQ6ZnVuY3Rpb24odCl7Zm9yKHZhciBlLGksbj0xLzAscz10aGlzLl9wYXJ0cyxhPW51bGwscj0wLGg9cy5sZW5ndGg7aD5yO3IrKylmb3IodmFyIGw9c1tyXSx1PTEsYz1sLmxlbmd0aDtjPnU7dSsrKXtlPWxbdS0xXSxpPWxbdV07dmFyIGQ9by5MaW5lVXRpbC5fc3FDbG9zZXN0UG9pbnRPblNlZ21lbnQodCxlLGksITApO24+ZCYmKG49ZCxhPW8uTGluZVV0aWwuX3NxQ2xvc2VzdFBvaW50T25TZWdtZW50KHQsZSxpKSl9cmV0dXJuIGEmJihhLmRpc3RhbmNlPU1hdGguc3FydChuKSksYX0sZ2V0Qm91bmRzOmZ1bmN0aW9uKCl7cmV0dXJuIG5ldyBvLkxhdExuZ0JvdW5kcyh0aGlzLmdldExhdExuZ3MoKSl9LF9jb252ZXJ0TGF0TG5nczpmdW5jdGlvbih0LGUpe3ZhciBpLG4scz1lP3Q6W107Zm9yKGk9MCxuPXQubGVuZ3RoO24+aTtpKyspe2lmKG8uVXRpbC5pc0FycmF5KHRbaV0pJiZcIm51bWJlclwiIT10eXBlb2YgdFtpXVswXSlyZXR1cm47c1tpXT1vLmxhdExuZyh0W2ldKX1yZXR1cm4gc30sX2luaXRFdmVudHM6ZnVuY3Rpb24oKXtvLlBhdGgucHJvdG90eXBlLl9pbml0RXZlbnRzLmNhbGwodGhpcyl9LF9nZXRQYXRoUGFydFN0cjpmdW5jdGlvbih0KXtmb3IodmFyIGUsaT1vLlBhdGguVk1MLG49MCxzPXQubGVuZ3RoLGE9XCJcIjtzPm47bisrKWU9dFtuXSxpJiZlLl9yb3VuZCgpLGErPShuP1wiTFwiOlwiTVwiKStlLngrXCIgXCIrZS55O3JldHVybiBhfSxfY2xpcFBvaW50czpmdW5jdGlvbigpe3ZhciB0LGUsaSxuPXRoaXMuX29yaWdpbmFsUG9pbnRzLHM9bi5sZW5ndGg7aWYodGhpcy5vcHRpb25zLm5vQ2xpcClyZXR1cm4gdGhpcy5fcGFydHM9W25dLHZvaWQgMDt0aGlzLl9wYXJ0cz1bXTt2YXIgYT10aGlzLl9wYXJ0cyxyPXRoaXMuX21hcC5fcGF0aFZpZXdwb3J0LGg9by5MaW5lVXRpbDtmb3IodD0wLGU9MDtzLTE+dDt0KyspaT1oLmNsaXBTZWdtZW50KG5bdF0sblt0KzFdLHIsdCksaSYmKGFbZV09YVtlXXx8W10sYVtlXS5wdXNoKGlbMF0pLChpWzFdIT09blt0KzFdfHx0PT09cy0yKSYmKGFbZV0ucHVzaChpWzFdKSxlKyspKX0sX3NpbXBsaWZ5UG9pbnRzOmZ1bmN0aW9uKCl7Zm9yKHZhciB0PXRoaXMuX3BhcnRzLGU9by5MaW5lVXRpbCxpPTAsbj10Lmxlbmd0aDtuPmk7aSsrKXRbaV09ZS5zaW1wbGlmeSh0W2ldLHRoaXMub3B0aW9ucy5zbW9vdGhGYWN0b3IpfSxfdXBkYXRlUGF0aDpmdW5jdGlvbigpe3RoaXMuX21hcCYmKHRoaXMuX2NsaXBQb2ludHMoKSx0aGlzLl9zaW1wbGlmeVBvaW50cygpLG8uUGF0aC5wcm90b3R5cGUuX3VwZGF0ZVBhdGguY2FsbCh0aGlzKSl9fSksby5wb2x5bGluZT1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgby5Qb2x5bGluZSh0LGUpfSxvLlBvbHlVdGlsPXt9LG8uUG9seVV0aWwuY2xpcFBvbHlnb249ZnVuY3Rpb24odCxlKXt2YXIgaSxuLHMsYSxyLGgsbCx1LGMsZD1bMSw0LDIsOF0scD1vLkxpbmVVdGlsO2ZvcihuPTAsbD10Lmxlbmd0aDtsPm47bisrKXRbbl0uX2NvZGU9cC5fZ2V0Qml0Q29kZSh0W25dLGUpO2ZvcihhPTA7ND5hO2ErKyl7Zm9yKHU9ZFthXSxpPVtdLG49MCxsPXQubGVuZ3RoLHM9bC0xO2w+bjtzPW4rKylyPXRbbl0saD10W3NdLHIuX2NvZGUmdT9oLl9jb2RlJnV8fChjPXAuX2dldEVkZ2VJbnRlcnNlY3Rpb24oaCxyLHUsZSksYy5fY29kZT1wLl9nZXRCaXRDb2RlKGMsZSksaS5wdXNoKGMpKTooaC5fY29kZSZ1JiYoYz1wLl9nZXRFZGdlSW50ZXJzZWN0aW9uKGgscix1LGUpLGMuX2NvZGU9cC5fZ2V0Qml0Q29kZShjLGUpLGkucHVzaChjKSksaS5wdXNoKHIpKTt0PWl9cmV0dXJuIHR9LG8uUG9seWdvbj1vLlBvbHlsaW5lLmV4dGVuZCh7b3B0aW9uczp7ZmlsbDohMH0saW5pdGlhbGl6ZTpmdW5jdGlvbih0LGUpe3ZhciBpLG4scztpZihvLlBvbHlsaW5lLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcyx0LGUpLHQmJm8uVXRpbC5pc0FycmF5KHRbMF0pJiZcIm51bWJlclwiIT10eXBlb2YgdFswXVswXSlmb3IodGhpcy5fbGF0bG5ncz10aGlzLl9jb252ZXJ0TGF0TG5ncyh0WzBdKSx0aGlzLl9ob2xlcz10LnNsaWNlKDEpLGk9MCxuPXRoaXMuX2hvbGVzLmxlbmd0aDtuPmk7aSsrKXM9dGhpcy5faG9sZXNbaV09dGhpcy5fY29udmVydExhdExuZ3ModGhpcy5faG9sZXNbaV0pLHNbMF0uZXF1YWxzKHNbcy5sZW5ndGgtMV0pJiZzLnBvcCgpO3Q9dGhpcy5fbGF0bG5ncyx0Lmxlbmd0aD49MiYmdFswXS5lcXVhbHModFt0Lmxlbmd0aC0xXSkmJnQucG9wKCl9LHByb2plY3RMYXRsbmdzOmZ1bmN0aW9uKCl7aWYoby5Qb2x5bGluZS5wcm90b3R5cGUucHJvamVjdExhdGxuZ3MuY2FsbCh0aGlzKSx0aGlzLl9ob2xlUG9pbnRzPVtdLHRoaXMuX2hvbGVzKXt2YXIgdCxlLGksbjtmb3IodD0wLGk9dGhpcy5faG9sZXMubGVuZ3RoO2k+dDt0KyspZm9yKHRoaXMuX2hvbGVQb2ludHNbdF09W10sZT0wLG49dGhpcy5faG9sZXNbdF0ubGVuZ3RoO24+ZTtlKyspdGhpcy5faG9sZVBvaW50c1t0XVtlXT10aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KHRoaXMuX2hvbGVzW3RdW2VdKX19LF9jbGlwUG9pbnRzOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fb3JpZ2luYWxQb2ludHMsZT1bXTtpZih0aGlzLl9wYXJ0cz1bdF0uY29uY2F0KHRoaXMuX2hvbGVQb2ludHMpLCF0aGlzLm9wdGlvbnMubm9DbGlwKXtmb3IodmFyIGk9MCxuPXRoaXMuX3BhcnRzLmxlbmd0aDtuPmk7aSsrKXt2YXIgcz1vLlBvbHlVdGlsLmNsaXBQb2x5Z29uKHRoaXMuX3BhcnRzW2ldLHRoaXMuX21hcC5fcGF0aFZpZXdwb3J0KTtzLmxlbmd0aCYmZS5wdXNoKHMpfXRoaXMuX3BhcnRzPWV9fSxfZ2V0UGF0aFBhcnRTdHI6ZnVuY3Rpb24odCl7dmFyIGU9by5Qb2x5bGluZS5wcm90b3R5cGUuX2dldFBhdGhQYXJ0U3RyLmNhbGwodGhpcyx0KTtyZXR1cm4gZSsoby5Ccm93c2VyLnN2Zz9cInpcIjpcInhcIil9fSksby5wb2x5Z29uPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG5ldyBvLlBvbHlnb24odCxlKX0sZnVuY3Rpb24oKXtmdW5jdGlvbiB0KHQpe3JldHVybiBvLkZlYXR1cmVHcm91cC5leHRlbmQoe2luaXRpYWxpemU6ZnVuY3Rpb24odCxlKXt0aGlzLl9sYXllcnM9e30sdGhpcy5fb3B0aW9ucz1lLHRoaXMuc2V0TGF0TG5ncyh0KX0sc2V0TGF0TG5nczpmdW5jdGlvbihlKXt2YXIgaT0wLG49ZS5sZW5ndGg7Zm9yKHRoaXMuZWFjaExheWVyKGZ1bmN0aW9uKHQpe24+aT90LnNldExhdExuZ3MoZVtpKytdKTp0aGlzLnJlbW92ZUxheWVyKHQpfSx0aGlzKTtuPmk7KXRoaXMuYWRkTGF5ZXIobmV3IHQoZVtpKytdLHRoaXMuX29wdGlvbnMpKTtyZXR1cm4gdGhpc30sZ2V0TGF0TG5nczpmdW5jdGlvbigpe3ZhciB0PVtdO3JldHVybiB0aGlzLmVhY2hMYXllcihmdW5jdGlvbihlKXt0LnB1c2goZS5nZXRMYXRMbmdzKCkpfSksdH19KX1vLk11bHRpUG9seWxpbmU9dChvLlBvbHlsaW5lKSxvLk11bHRpUG9seWdvbj10KG8uUG9seWdvbiksby5tdWx0aVBvbHlsaW5lPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG5ldyBvLk11bHRpUG9seWxpbmUodCxlKX0sby5tdWx0aVBvbHlnb249ZnVuY3Rpb24odCxlKXtyZXR1cm4gbmV3IG8uTXVsdGlQb2x5Z29uKHQsZSl9fSgpLG8uUmVjdGFuZ2xlPW8uUG9seWdvbi5leHRlbmQoe2luaXRpYWxpemU6ZnVuY3Rpb24odCxlKXtvLlBvbHlnb24ucHJvdG90eXBlLmluaXRpYWxpemUuY2FsbCh0aGlzLHRoaXMuX2JvdW5kc1RvTGF0TG5ncyh0KSxlKX0sc2V0Qm91bmRzOmZ1bmN0aW9uKHQpe3RoaXMuc2V0TGF0TG5ncyh0aGlzLl9ib3VuZHNUb0xhdExuZ3ModCkpfSxfYm91bmRzVG9MYXRMbmdzOmZ1bmN0aW9uKHQpe3JldHVybiB0PW8ubGF0TG5nQm91bmRzKHQpLFt0LmdldFNvdXRoV2VzdCgpLHQuZ2V0Tm9ydGhXZXN0KCksdC5nZXROb3J0aEVhc3QoKSx0LmdldFNvdXRoRWFzdCgpXX19KSxvLnJlY3RhbmdsZT1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgby5SZWN0YW5nbGUodCxlKX0sby5DaXJjbGU9by5QYXRoLmV4dGVuZCh7aW5pdGlhbGl6ZTpmdW5jdGlvbih0LGUsaSl7by5QYXRoLnByb3RvdHlwZS5pbml0aWFsaXplLmNhbGwodGhpcyxpKSx0aGlzLl9sYXRsbmc9by5sYXRMbmcodCksdGhpcy5fbVJhZGl1cz1lfSxvcHRpb25zOntmaWxsOiEwfSxzZXRMYXRMbmc6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX2xhdGxuZz1vLmxhdExuZyh0KSx0aGlzLnJlZHJhdygpfSxzZXRSYWRpdXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMuX21SYWRpdXM9dCx0aGlzLnJlZHJhdygpfSxwcm9qZWN0TGF0bG5nczpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX2dldExuZ1JhZGl1cygpLGU9dGhpcy5fbGF0bG5nLGk9dGhpcy5fbWFwLmxhdExuZ1RvTGF5ZXJQb2ludChbZS5sYXQsZS5sbmctdF0pO3RoaXMuX3BvaW50PXRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQoZSksdGhpcy5fcmFkaXVzPU1hdGgubWF4KHRoaXMuX3BvaW50LngtaS54LDEpfSxnZXRCb3VuZHM6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRMbmdSYWRpdXMoKSxlPTM2MCoodGhpcy5fbVJhZGl1cy80MDA3NTAxNyksaT10aGlzLl9sYXRsbmc7cmV0dXJuIG5ldyBvLkxhdExuZ0JvdW5kcyhbaS5sYXQtZSxpLmxuZy10XSxbaS5sYXQrZSxpLmxuZyt0XSl9LGdldExhdExuZzpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9sYXRsbmd9LGdldFBhdGhTdHJpbmc6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9wb2ludCxlPXRoaXMuX3JhZGl1cztyZXR1cm4gdGhpcy5fY2hlY2tJZkVtcHR5KCk/XCJcIjpvLkJyb3dzZXIuc3ZnP1wiTVwiK3QueCtcIixcIisodC55LWUpK1wiQVwiK2UrXCIsXCIrZStcIiwwLDEsMSxcIisodC54LS4xKStcIixcIisodC55LWUpK1wiIHpcIjoodC5fcm91bmQoKSxlPU1hdGgucm91bmQoZSksXCJBTCBcIit0LngrXCIsXCIrdC55K1wiIFwiK2UrXCIsXCIrZStcIiAwLFwiKzIzNTkyNjAwKX0sZ2V0UmFkaXVzOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX21SYWRpdXN9LF9nZXRMYXRSYWRpdXM6ZnVuY3Rpb24oKXtyZXR1cm4gMzYwKih0aGlzLl9tUmFkaXVzLzQwMDc1MDE3KX0sX2dldExuZ1JhZGl1czpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9nZXRMYXRSYWRpdXMoKS9NYXRoLmNvcyhvLkxhdExuZy5ERUdfVE9fUkFEKnRoaXMuX2xhdGxuZy5sYXQpfSxfY2hlY2tJZkVtcHR5OmZ1bmN0aW9uKCl7aWYoIXRoaXMuX21hcClyZXR1cm4hMTt2YXIgdD10aGlzLl9tYXAuX3BhdGhWaWV3cG9ydCxlPXRoaXMuX3JhZGl1cyxpPXRoaXMuX3BvaW50O3JldHVybiBpLngtZT50Lm1heC54fHxpLnktZT50Lm1heC55fHxpLngrZTx0Lm1pbi54fHxpLnkrZTx0Lm1pbi55fX0pLG8uY2lyY2xlPWZ1bmN0aW9uKHQsZSxpKXtyZXR1cm4gbmV3IG8uQ2lyY2xlKHQsZSxpKX0sby5DaXJjbGVNYXJrZXI9by5DaXJjbGUuZXh0ZW5kKHtvcHRpb25zOntyYWRpdXM6MTAsd2VpZ2h0OjJ9LGluaXRpYWxpemU6ZnVuY3Rpb24odCxlKXtvLkNpcmNsZS5wcm90b3R5cGUuaW5pdGlhbGl6ZS5jYWxsKHRoaXMsdCxudWxsLGUpLHRoaXMuX3JhZGl1cz10aGlzLm9wdGlvbnMucmFkaXVzfSxwcm9qZWN0TGF0bG5nczpmdW5jdGlvbigpe3RoaXMuX3BvaW50PXRoaXMuX21hcC5sYXRMbmdUb0xheWVyUG9pbnQodGhpcy5fbGF0bG5nKX0sX3VwZGF0ZVN0eWxlOmZ1bmN0aW9uKCl7by5DaXJjbGUucHJvdG90eXBlLl91cGRhdGVTdHlsZS5jYWxsKHRoaXMpLHRoaXMuc2V0UmFkaXVzKHRoaXMub3B0aW9ucy5yYWRpdXMpfSxzZXRSYWRpdXM6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMub3B0aW9ucy5yYWRpdXM9dGhpcy5fcmFkaXVzPXQsdGhpcy5yZWRyYXcoKX19KSxvLmNpcmNsZU1hcmtlcj1mdW5jdGlvbih0LGUpe3JldHVybiBuZXcgby5DaXJjbGVNYXJrZXIodCxlKX0sby5Qb2x5bGluZS5pbmNsdWRlKG8uUGF0aC5DQU5WQVM/e19jb250YWluc1BvaW50OmZ1bmN0aW9uKHQsZSl7dmFyIGksbixzLGEscixoLGwsdT10aGlzLm9wdGlvbnMud2VpZ2h0LzI7Zm9yKG8uQnJvd3Nlci50b3VjaCYmKHUrPTEwKSxpPTAsYT10aGlzLl9wYXJ0cy5sZW5ndGg7YT5pO2krKylmb3IobD10aGlzLl9wYXJ0c1tpXSxuPTAscj1sLmxlbmd0aCxzPXItMTtyPm47cz1uKyspaWYoKGV8fDAhPT1uKSYmKGg9by5MaW5lVXRpbC5wb2ludFRvU2VnbWVudERpc3RhbmNlKHQsbFtzXSxsW25dKSx1Pj1oKSlyZXR1cm4hMDtyZXR1cm4hMX19Ont9KSxvLlBvbHlnb24uaW5jbHVkZShvLlBhdGguQ0FOVkFTP3tfY29udGFpbnNQb2ludDpmdW5jdGlvbih0KXt2YXIgZSxpLG4scyxhLHIsaCxsLHU9ITE7aWYoby5Qb2x5bGluZS5wcm90b3R5cGUuX2NvbnRhaW5zUG9pbnQuY2FsbCh0aGlzLHQsITApKXJldHVybiEwO2ZvcihzPTAsaD10aGlzLl9wYXJ0cy5sZW5ndGg7aD5zO3MrKylmb3IoZT10aGlzLl9wYXJ0c1tzXSxhPTAsbD1lLmxlbmd0aCxyPWwtMTtsPmE7cj1hKyspaT1lW2FdLG49ZVtyXSxpLnk+dC55IT1uLnk+dC55JiZ0Lng8KG4ueC1pLngpKih0LnktaS55KS8obi55LWkueSkraS54JiYodT0hdSk7cmV0dXJuIHV9fTp7fSksby5DaXJjbGUuaW5jbHVkZShvLlBhdGguQ0FOVkFTP3tfZHJhd1BhdGg6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9wb2ludDt0aGlzLl9jdHguYmVnaW5QYXRoKCksdGhpcy5fY3R4LmFyYyh0LngsdC55LHRoaXMuX3JhZGl1cywwLDIqTWF0aC5QSSwhMSl9LF9jb250YWluc1BvaW50OmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX3BvaW50LGk9dGhpcy5vcHRpb25zLnN0cm9rZT90aGlzLm9wdGlvbnMud2VpZ2h0LzI6MDtyZXR1cm4gdC5kaXN0YW5jZVRvKGUpPD10aGlzLl9yYWRpdXMraX19Ont9KSxvLkNpcmNsZU1hcmtlci5pbmNsdWRlKG8uUGF0aC5DQU5WQVM/e191cGRhdGVTdHlsZTpmdW5jdGlvbigpe28uUGF0aC5wcm90b3R5cGUuX3VwZGF0ZVN0eWxlLmNhbGwodGhpcyl9fTp7fSksby5HZW9KU09OPW8uRmVhdHVyZUdyb3VwLmV4dGVuZCh7aW5pdGlhbGl6ZTpmdW5jdGlvbih0LGUpe28uc2V0T3B0aW9ucyh0aGlzLGUpLHRoaXMuX2xheWVycz17fSx0JiZ0aGlzLmFkZERhdGEodCl9LGFkZERhdGE6ZnVuY3Rpb24odCl7dmFyIGUsaSxuLHM9by5VdGlsLmlzQXJyYXkodCk/dDp0LmZlYXR1cmVzO2lmKHMpe2ZvcihlPTAsaT1zLmxlbmd0aDtpPmU7ZSsrKW49c1tlXSwobi5nZW9tZXRyaWVzfHxuLmdlb21ldHJ5fHxuLmZlYXR1cmVzfHxuLmNvb3JkaW5hdGVzKSYmdGhpcy5hZGREYXRhKHNbZV0pO3JldHVybiB0aGlzfXZhciBhPXRoaXMub3B0aW9ucztpZighYS5maWx0ZXJ8fGEuZmlsdGVyKHQpKXt2YXIgcj1vLkdlb0pTT04uZ2VvbWV0cnlUb0xheWVyKHQsYS5wb2ludFRvTGF5ZXIsYS5jb29yZHNUb0xhdExuZyk7cmV0dXJuIHIuZmVhdHVyZT1vLkdlb0pTT04uYXNGZWF0dXJlKHQpLHIuZGVmYXVsdE9wdGlvbnM9ci5vcHRpb25zLHRoaXMucmVzZXRTdHlsZShyKSxhLm9uRWFjaEZlYXR1cmUmJmEub25FYWNoRmVhdHVyZSh0LHIpLHRoaXMuYWRkTGF5ZXIocil9fSxyZXNldFN0eWxlOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMub3B0aW9ucy5zdHlsZTtlJiYoby5VdGlsLmV4dGVuZCh0Lm9wdGlvbnMsdC5kZWZhdWx0T3B0aW9ucyksdGhpcy5fc2V0TGF5ZXJTdHlsZSh0LGUpKX0sc2V0U3R5bGU6ZnVuY3Rpb24odCl7dGhpcy5lYWNoTGF5ZXIoZnVuY3Rpb24oZSl7dGhpcy5fc2V0TGF5ZXJTdHlsZShlLHQpfSx0aGlzKX0sX3NldExheWVyU3R5bGU6ZnVuY3Rpb24odCxlKXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBlJiYoZT1lKHQuZmVhdHVyZSkpLHQuc2V0U3R5bGUmJnQuc2V0U3R5bGUoZSl9fSksby5leHRlbmQoby5HZW9KU09OLHtnZW9tZXRyeVRvTGF5ZXI6ZnVuY3Rpb24odCxlLGkpe3ZhciBuLHMsYSxyLGgsbD1cIkZlYXR1cmVcIj09PXQudHlwZT90Lmdlb21ldHJ5OnQsdT1sLmNvb3JkaW5hdGVzLGM9W107c3dpdGNoKGk9aXx8dGhpcy5jb29yZHNUb0xhdExuZyxsLnR5cGUpe2Nhc2VcIlBvaW50XCI6cmV0dXJuIG49aSh1KSxlP2UodCxuKTpuZXcgby5NYXJrZXIobik7Y2FzZVwiTXVsdGlQb2ludFwiOmZvcihhPTAscj11Lmxlbmd0aDtyPmE7YSsrKW49aSh1W2FdKSxoPWU/ZSh0LG4pOm5ldyBvLk1hcmtlcihuKSxjLnB1c2goaCk7cmV0dXJuIG5ldyBvLkZlYXR1cmVHcm91cChjKTtjYXNlXCJMaW5lU3RyaW5nXCI6cmV0dXJuIHM9dGhpcy5jb29yZHNUb0xhdExuZ3ModSwwLGkpLG5ldyBvLlBvbHlsaW5lKHMpO2Nhc2VcIlBvbHlnb25cIjpyZXR1cm4gcz10aGlzLmNvb3Jkc1RvTGF0TG5ncyh1LDEsaSksbmV3IG8uUG9seWdvbihzKTtjYXNlXCJNdWx0aUxpbmVTdHJpbmdcIjpyZXR1cm4gcz10aGlzLmNvb3Jkc1RvTGF0TG5ncyh1LDEsaSksbmV3IG8uTXVsdGlQb2x5bGluZShzKTtjYXNlXCJNdWx0aVBvbHlnb25cIjpyZXR1cm4gcz10aGlzLmNvb3Jkc1RvTGF0TG5ncyh1LDIsaSksbmV3IG8uTXVsdGlQb2x5Z29uKHMpO2Nhc2VcIkdlb21ldHJ5Q29sbGVjdGlvblwiOmZvcihhPTAscj1sLmdlb21ldHJpZXMubGVuZ3RoO3I+YTthKyspaD10aGlzLmdlb21ldHJ5VG9MYXllcih7Z2VvbWV0cnk6bC5nZW9tZXRyaWVzW2FdLHR5cGU6XCJGZWF0dXJlXCIscHJvcGVydGllczp0LnByb3BlcnRpZXN9LGUsaSksYy5wdXNoKGgpO3JldHVybiBuZXcgby5GZWF0dXJlR3JvdXAoYyk7ZGVmYXVsdDp0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIEdlb0pTT04gb2JqZWN0LlwiKX19LGNvb3Jkc1RvTGF0TG5nOmZ1bmN0aW9uKHQpe3JldHVybiBuZXcgby5MYXRMbmcodFsxXSx0WzBdKX0sY29vcmRzVG9MYXRMbmdzOmZ1bmN0aW9uKHQsZSxpKXt2YXIgbixvLHMsYT1bXTtmb3Iobz0wLHM9dC5sZW5ndGg7cz5vO28rKyluPWU/dGhpcy5jb29yZHNUb0xhdExuZ3ModFtvXSxlLTEsaSk6KGl8fHRoaXMuY29vcmRzVG9MYXRMbmcpKHRbb10pLGEucHVzaChuKTtyZXR1cm4gYX0sbGF0TG5nVG9Db29yZHM6ZnVuY3Rpb24odCl7cmV0dXJuW3QubG5nLHQubGF0XX0sbGF0TG5nc1RvQ29vcmRzOmZ1bmN0aW9uKHQpe2Zvcih2YXIgZT1bXSxpPTAsbj10Lmxlbmd0aDtuPmk7aSsrKWUucHVzaChvLkdlb0pTT04ubGF0TG5nVG9Db29yZHModFtpXSkpO3JldHVybiBlfSxnZXRGZWF0dXJlOmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHQuZmVhdHVyZT9vLmV4dGVuZCh7fSx0LmZlYXR1cmUse2dlb21ldHJ5OmV9KTpvLkdlb0pTT04uYXNGZWF0dXJlKGUpfSxhc0ZlYXR1cmU6ZnVuY3Rpb24odCl7cmV0dXJuXCJGZWF0dXJlXCI9PT10LnR5cGU/dDp7dHlwZTpcIkZlYXR1cmVcIixwcm9wZXJ0aWVzOnt9LGdlb21ldHJ5OnR9fX0pO3ZhciBhPXt0b0dlb0pTT046ZnVuY3Rpb24oKXtyZXR1cm4gby5HZW9KU09OLmdldEZlYXR1cmUodGhpcyx7dHlwZTpcIlBvaW50XCIsY29vcmRpbmF0ZXM6by5HZW9KU09OLmxhdExuZ1RvQ29vcmRzKHRoaXMuZ2V0TGF0TG5nKCkpfSl9fTtvLk1hcmtlci5pbmNsdWRlKGEpLG8uQ2lyY2xlLmluY2x1ZGUoYSksby5DaXJjbGVNYXJrZXIuaW5jbHVkZShhKSxvLlBvbHlsaW5lLmluY2x1ZGUoe3RvR2VvSlNPTjpmdW5jdGlvbigpe3JldHVybiBvLkdlb0pTT04uZ2V0RmVhdHVyZSh0aGlzLHt0eXBlOlwiTGluZVN0cmluZ1wiLGNvb3JkaW5hdGVzOm8uR2VvSlNPTi5sYXRMbmdzVG9Db29yZHModGhpcy5nZXRMYXRMbmdzKCkpfSl9fSksby5Qb2x5Z29uLmluY2x1ZGUoe3RvR2VvSlNPTjpmdW5jdGlvbigpe3ZhciB0LGUsaSxuPVtvLkdlb0pTT04ubGF0TG5nc1RvQ29vcmRzKHRoaXMuZ2V0TGF0TG5ncygpKV07aWYoblswXS5wdXNoKG5bMF1bMF0pLHRoaXMuX2hvbGVzKWZvcih0PTAsZT10aGlzLl9ob2xlcy5sZW5ndGg7ZT50O3QrKylpPW8uR2VvSlNPTi5sYXRMbmdzVG9Db29yZHModGhpcy5faG9sZXNbdF0pLGkucHVzaChpWzBdKSxuLnB1c2goaSk7cmV0dXJuIG8uR2VvSlNPTi5nZXRGZWF0dXJlKHRoaXMse3R5cGU6XCJQb2x5Z29uXCIsY29vcmRpbmF0ZXM6bn0pfX0pLGZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0LGUpe3QuaW5jbHVkZSh7dG9HZW9KU09OOmZ1bmN0aW9uKCl7dmFyIHQ9W107cmV0dXJuIHRoaXMuZWFjaExheWVyKGZ1bmN0aW9uKGUpe3QucHVzaChlLnRvR2VvSlNPTigpLmdlb21ldHJ5LmNvb3JkaW5hdGVzKX0pLG8uR2VvSlNPTi5nZXRGZWF0dXJlKHRoaXMse3R5cGU6ZSxjb29yZGluYXRlczp0fSl9fSl9dChvLk11bHRpUG9seWxpbmUsXCJNdWx0aUxpbmVTdHJpbmdcIiksdChvLk11bHRpUG9seWdvbixcIk11bHRpUG9seWdvblwiKX0oKSxvLkxheWVyR3JvdXAuaW5jbHVkZSh7dG9HZW9KU09OOmZ1bmN0aW9uKCl7dmFyIHQ9W107cmV0dXJuIHRoaXMuZWFjaExheWVyKGZ1bmN0aW9uKGUpe2UudG9HZW9KU09OJiZ0LnB1c2goby5HZW9KU09OLmFzRmVhdHVyZShlLnRvR2VvSlNPTigpKSl9KSx7dHlwZTpcIkZlYXR1cmVDb2xsZWN0aW9uXCIsZmVhdHVyZXM6dH19fSksby5nZW9Kc29uPWZ1bmN0aW9uKHQsZSl7cmV0dXJuIG5ldyBvLkdlb0pTT04odCxlKX0sby5Eb21FdmVudD17YWRkTGlzdGVuZXI6ZnVuY3Rpb24odCxlLGksbil7dmFyIHMsYSxyLGg9by5zdGFtcChpKSxsPVwiX2xlYWZsZXRfXCIrZStoO3JldHVybiB0W2xdP3RoaXM6KHM9ZnVuY3Rpb24oZSl7cmV0dXJuIGkuY2FsbChufHx0LGV8fG8uRG9tRXZlbnQuX2dldEV2ZW50KCkpfSxvLkJyb3dzZXIubXNUb3VjaCYmMD09PWUuaW5kZXhPZihcInRvdWNoXCIpP3RoaXMuYWRkTXNUb3VjaExpc3RlbmVyKHQsZSxzLGgpOihvLkJyb3dzZXIudG91Y2gmJlwiZGJsY2xpY2tcIj09PWUmJnRoaXMuYWRkRG91YmxlVGFwTGlzdGVuZXImJnRoaXMuYWRkRG91YmxlVGFwTGlzdGVuZXIodCxzLGgpLFwiYWRkRXZlbnRMaXN0ZW5lclwiaW4gdD9cIm1vdXNld2hlZWxcIj09PWU/KHQuYWRkRXZlbnRMaXN0ZW5lcihcIkRPTU1vdXNlU2Nyb2xsXCIscywhMSksdC5hZGRFdmVudExpc3RlbmVyKGUscywhMSkpOlwibW91c2VlbnRlclwiPT09ZXx8XCJtb3VzZWxlYXZlXCI9PT1lPyhhPXMscj1cIm1vdXNlZW50ZXJcIj09PWU/XCJtb3VzZW92ZXJcIjpcIm1vdXNlb3V0XCIscz1mdW5jdGlvbihlKXtyZXR1cm4gby5Eb21FdmVudC5fY2hlY2tNb3VzZSh0LGUpP2EoZSk6dm9pZCAwfSx0LmFkZEV2ZW50TGlzdGVuZXIocixzLCExKSk6XCJjbGlja1wiPT09ZSYmby5Ccm93c2VyLmFuZHJvaWQ/KGE9cyxzPWZ1bmN0aW9uKHQpe3JldHVybiBvLkRvbUV2ZW50Ll9maWx0ZXJDbGljayh0LGEpfSx0LmFkZEV2ZW50TGlzdGVuZXIoZSxzLCExKSk6dC5hZGRFdmVudExpc3RlbmVyKGUscywhMSk6XCJhdHRhY2hFdmVudFwiaW4gdCYmdC5hdHRhY2hFdmVudChcIm9uXCIrZSxzKSx0W2xdPXMsdGhpcykpfSxyZW1vdmVMaXN0ZW5lcjpmdW5jdGlvbih0LGUsaSl7dmFyIG49by5zdGFtcChpKSxzPVwiX2xlYWZsZXRfXCIrZStuLGE9dFtzXTtyZXR1cm4gYT8oby5Ccm93c2VyLm1zVG91Y2gmJjA9PT1lLmluZGV4T2YoXCJ0b3VjaFwiKT90aGlzLnJlbW92ZU1zVG91Y2hMaXN0ZW5lcih0LGUsbik6by5Ccm93c2VyLnRvdWNoJiZcImRibGNsaWNrXCI9PT1lJiZ0aGlzLnJlbW92ZURvdWJsZVRhcExpc3RlbmVyP3RoaXMucmVtb3ZlRG91YmxlVGFwTGlzdGVuZXIodCxuKTpcInJlbW92ZUV2ZW50TGlzdGVuZXJcImluIHQ/XCJtb3VzZXdoZWVsXCI9PT1lPyh0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJET01Nb3VzZVNjcm9sbFwiLGEsITEpLHQucmVtb3ZlRXZlbnRMaXN0ZW5lcihlLGEsITEpKTpcIm1vdXNlZW50ZXJcIj09PWV8fFwibW91c2VsZWF2ZVwiPT09ZT90LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZWVudGVyXCI9PT1lP1wibW91c2VvdmVyXCI6XCJtb3VzZW91dFwiLGEsITEpOnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihlLGEsITEpOlwiZGV0YWNoRXZlbnRcImluIHQmJnQuZGV0YWNoRXZlbnQoXCJvblwiK2UsYSksdFtzXT1udWxsLHRoaXMpOnRoaXN9LHN0b3BQcm9wYWdhdGlvbjpmdW5jdGlvbih0KXtyZXR1cm4gdC5zdG9wUHJvcGFnYXRpb24/dC5zdG9wUHJvcGFnYXRpb24oKTp0LmNhbmNlbEJ1YmJsZT0hMCx0aGlzfSxkaXNhYmxlQ2xpY2tQcm9wYWdhdGlvbjpmdW5jdGlvbih0KXtmb3IodmFyIGU9by5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24saT1vLkRyYWdnYWJsZS5TVEFSVC5sZW5ndGgtMTtpPj0wO2ktLSlvLkRvbUV2ZW50LmFkZExpc3RlbmVyKHQsby5EcmFnZ2FibGUuU1RBUlRbaV0sZSk7cmV0dXJuIG8uRG9tRXZlbnQuYWRkTGlzdGVuZXIodCxcImNsaWNrXCIsby5Eb21FdmVudC5fZmFrZVN0b3ApLmFkZExpc3RlbmVyKHQsXCJkYmxjbGlja1wiLGUpfSxwcmV2ZW50RGVmYXVsdDpmdW5jdGlvbih0KXtyZXR1cm4gdC5wcmV2ZW50RGVmYXVsdD90LnByZXZlbnREZWZhdWx0KCk6dC5yZXR1cm5WYWx1ZT0hMSx0aGlzfSxzdG9wOmZ1bmN0aW9uKHQpe3JldHVybiBvLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KHQpLnN0b3BQcm9wYWdhdGlvbih0KX0sZ2V0TW91c2VQb3NpdGlvbjpmdW5jdGlvbih0LGkpe3ZhciBuPW8uQnJvd3Nlci5pZTcscz1lLmJvZHksYT1lLmRvY3VtZW50RWxlbWVudCxyPXQucGFnZVg/dC5wYWdlWC1zLnNjcm9sbExlZnQtYS5zY3JvbGxMZWZ0OnQuY2xpZW50WCxoPXQucGFnZVk/dC5wYWdlWS1zLnNjcm9sbFRvcC1hLnNjcm9sbFRvcDp0LmNsaWVudFksbD1uZXcgby5Qb2ludChyLGgpLHU9aS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxjPXUubGVmdC1pLmNsaWVudExlZnQsZD11LnRvcC1pLmNsaWVudFRvcDtyZXR1cm4gby5Eb21VdGlsLmRvY3VtZW50SXNMdHIoKXx8IW8uQnJvd3Nlci53ZWJraXQmJiFufHwoYys9aS5zY3JvbGxXaWR0aC1pLmNsaWVudFdpZHRoLG4mJlwiaGlkZGVuXCIhPT1vLkRvbVV0aWwuZ2V0U3R5bGUoaSxcIm92ZXJmbG93LXlcIikmJlwiaGlkZGVuXCIhPT1vLkRvbVV0aWwuZ2V0U3R5bGUoaSxcIm92ZXJmbG93XCIpJiYoYys9MTcpKSxsLl9zdWJ0cmFjdChuZXcgby5Qb2ludChjLGQpKX0sZ2V0V2hlZWxEZWx0YTpmdW5jdGlvbih0KXt2YXIgZT0wO3JldHVybiB0LndoZWVsRGVsdGEmJihlPXQud2hlZWxEZWx0YS8xMjApLHQuZGV0YWlsJiYoZT0tdC5kZXRhaWwvMyksZX0sX3NraXBFdmVudHM6e30sX2Zha2VTdG9wOmZ1bmN0aW9uKHQpe28uRG9tRXZlbnQuX3NraXBFdmVudHNbdC50eXBlXT0hMH0sX3NraXBwZWQ6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5fc2tpcEV2ZW50c1t0LnR5cGVdO3JldHVybiB0aGlzLl9za2lwRXZlbnRzW3QudHlwZV09ITEsZX0sX2NoZWNrTW91c2U6ZnVuY3Rpb24odCxlKXt2YXIgaT1lLnJlbGF0ZWRUYXJnZXQ7aWYoIWkpcmV0dXJuITA7dHJ5e2Zvcig7aSYmaSE9PXQ7KWk9aS5wYXJlbnROb2RlfWNhdGNoKG4pe3JldHVybiExfXJldHVybiBpIT09dH0sX2dldEV2ZW50OmZ1bmN0aW9uKCl7dmFyIGU9dC5ldmVudDtpZighZSlmb3IodmFyIGk9YXJndW1lbnRzLmNhbGxlZS5jYWxsZXI7aSYmKGU9aS5hcmd1bWVudHNbMF0sIWV8fHQuRXZlbnQhPT1lLmNvbnN0cnVjdG9yKTspaT1pLmNhbGxlcjtyZXR1cm4gZX0sX2ZpbHRlckNsaWNrOmZ1bmN0aW9uKHQsZSl7dmFyIGk9dC50aW1lU3RhbXB8fHQub3JpZ2luYWxFdmVudC50aW1lU3RhbXAsbj1vLkRvbUV2ZW50Ll9sYXN0Q2xpY2smJmktby5Eb21FdmVudC5fbGFzdENsaWNrO3JldHVybiBuJiZuPjEwMCYmMWUzPm58fHQudGFyZ2V0Ll9zaW11bGF0ZWRDbGljayYmIXQuX3NpbXVsYXRlZD8oby5Eb21FdmVudC5zdG9wKHQpLHZvaWQgMCk6KG8uRG9tRXZlbnQuX2xhc3RDbGljaz1pLGUodCkpfX0sby5Eb21FdmVudC5vbj1vLkRvbUV2ZW50LmFkZExpc3RlbmVyLG8uRG9tRXZlbnQub2ZmPW8uRG9tRXZlbnQucmVtb3ZlTGlzdGVuZXIsby5EcmFnZ2FibGU9by5DbGFzcy5leHRlbmQoe2luY2x1ZGVzOm8uTWl4aW4uRXZlbnRzLHN0YXRpY3M6e1NUQVJUOm8uQnJvd3Nlci50b3VjaD9bXCJ0b3VjaHN0YXJ0XCIsXCJtb3VzZWRvd25cIl06W1wibW91c2Vkb3duXCJdLEVORDp7bW91c2Vkb3duOlwibW91c2V1cFwiLHRvdWNoc3RhcnQ6XCJ0b3VjaGVuZFwiLE1TUG9pbnRlckRvd246XCJ0b3VjaGVuZFwifSxNT1ZFOnttb3VzZWRvd246XCJtb3VzZW1vdmVcIix0b3VjaHN0YXJ0OlwidG91Y2htb3ZlXCIsTVNQb2ludGVyRG93bjpcInRvdWNobW92ZVwifX0saW5pdGlhbGl6ZTpmdW5jdGlvbih0LGUpe3RoaXMuX2VsZW1lbnQ9dCx0aGlzLl9kcmFnU3RhcnRUYXJnZXQ9ZXx8dH0sZW5hYmxlOmZ1bmN0aW9uKCl7aWYoIXRoaXMuX2VuYWJsZWQpe2Zvcih2YXIgdD1vLkRyYWdnYWJsZS5TVEFSVC5sZW5ndGgtMTt0Pj0wO3QtLSlvLkRvbUV2ZW50Lm9uKHRoaXMuX2RyYWdTdGFydFRhcmdldCxvLkRyYWdnYWJsZS5TVEFSVFt0XSx0aGlzLl9vbkRvd24sdGhpcyk7dGhpcy5fZW5hYmxlZD0hMH19LGRpc2FibGU6ZnVuY3Rpb24oKXtpZih0aGlzLl9lbmFibGVkKXtmb3IodmFyIHQ9by5EcmFnZ2FibGUuU1RBUlQubGVuZ3RoLTE7dD49MDt0LS0pby5Eb21FdmVudC5vZmYodGhpcy5fZHJhZ1N0YXJ0VGFyZ2V0LG8uRHJhZ2dhYmxlLlNUQVJUW3RdLHRoaXMuX29uRG93bix0aGlzKTt0aGlzLl9lbmFibGVkPSExLHRoaXMuX21vdmVkPSExfX0sX29uRG93bjpmdW5jdGlvbih0KXtpZighdC5zaGlmdEtleSYmKDE9PT10LndoaWNofHwxPT09dC5idXR0b258fHQudG91Y2hlcykmJihvLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbih0KSwhby5EcmFnZ2FibGUuX2Rpc2FibGVkKSl7by5Eb21VdGlsLmRpc2FibGVJbWFnZURyYWcoKSxvLkRvbVV0aWwuZGlzYWJsZVRleHRTZWxlY3Rpb24oKTt2YXIgaT10LnRvdWNoZXM/dC50b3VjaGVzWzBdOnQsbj1pLnRhcmdldDtvLkJyb3dzZXIudG91Y2gmJlwiYVwiPT09bi50YWdOYW1lLnRvTG93ZXJDYXNlKCkmJm8uRG9tVXRpbC5hZGRDbGFzcyhuLFwibGVhZmxldC1hY3RpdmVcIiksdGhpcy5fbW92ZWQ9ITEsdGhpcy5fbW92aW5nfHwodGhpcy5fc3RhcnRQb2ludD1uZXcgby5Qb2ludChpLmNsaWVudFgsaS5jbGllbnRZKSx0aGlzLl9zdGFydFBvcz10aGlzLl9uZXdQb3M9by5Eb21VdGlsLmdldFBvc2l0aW9uKHRoaXMuX2VsZW1lbnQpLG8uRG9tRXZlbnQub24oZSxvLkRyYWdnYWJsZS5NT1ZFW3QudHlwZV0sdGhpcy5fb25Nb3ZlLHRoaXMpLm9uKGUsby5EcmFnZ2FibGUuRU5EW3QudHlwZV0sdGhpcy5fb25VcCx0aGlzKSl9fSxfb25Nb3ZlOmZ1bmN0aW9uKHQpe2lmKCEodC50b3VjaGVzJiZ0LnRvdWNoZXMubGVuZ3RoPjEpKXt2YXIgaT10LnRvdWNoZXMmJjE9PT10LnRvdWNoZXMubGVuZ3RoP3QudG91Y2hlc1swXTp0LG49bmV3IG8uUG9pbnQoaS5jbGllbnRYLGkuY2xpZW50WSkscz1uLnN1YnRyYWN0KHRoaXMuX3N0YXJ0UG9pbnQpOyhzLnh8fHMueSkmJihvLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KHQpLHRoaXMuX21vdmVkfHwodGhpcy5maXJlKFwiZHJhZ3N0YXJ0XCIpLHRoaXMuX21vdmVkPSEwLHRoaXMuX3N0YXJ0UG9zPW8uRG9tVXRpbC5nZXRQb3NpdGlvbih0aGlzLl9lbGVtZW50KS5zdWJ0cmFjdChzKSxvLkJyb3dzZXIudG91Y2h8fG8uRG9tVXRpbC5hZGRDbGFzcyhlLmJvZHksXCJsZWFmbGV0LWRyYWdnaW5nXCIpKSx0aGlzLl9uZXdQb3M9dGhpcy5fc3RhcnRQb3MuYWRkKHMpLHRoaXMuX21vdmluZz0hMCxvLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2FuaW1SZXF1ZXN0KSx0aGlzLl9hbmltUmVxdWVzdD1vLlV0aWwucmVxdWVzdEFuaW1GcmFtZSh0aGlzLl91cGRhdGVQb3NpdGlvbix0aGlzLCEwLHRoaXMuX2RyYWdTdGFydFRhcmdldCkpfX0sX3VwZGF0ZVBvc2l0aW9uOmZ1bmN0aW9uKCl7dGhpcy5maXJlKFwicHJlZHJhZ1wiKSxvLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fZWxlbWVudCx0aGlzLl9uZXdQb3MpLHRoaXMuZmlyZShcImRyYWdcIil9LF9vblVwOmZ1bmN0aW9uKCl7by5Ccm93c2VyLnRvdWNofHxvLkRvbVV0aWwucmVtb3ZlQ2xhc3MoZS5ib2R5LFwibGVhZmxldC1kcmFnZ2luZ1wiKTtmb3IodmFyIHQgaW4gby5EcmFnZ2FibGUuTU9WRSlvLkRvbUV2ZW50Lm9mZihlLG8uRHJhZ2dhYmxlLk1PVkVbdF0sdGhpcy5fb25Nb3ZlKS5vZmYoZSxvLkRyYWdnYWJsZS5FTkRbdF0sdGhpcy5fb25VcCk7by5Eb21VdGlsLmVuYWJsZUltYWdlRHJhZygpLG8uRG9tVXRpbC5lbmFibGVUZXh0U2VsZWN0aW9uKCksdGhpcy5fbW92ZWQmJihvLlV0aWwuY2FuY2VsQW5pbUZyYW1lKHRoaXMuX2FuaW1SZXF1ZXN0KSx0aGlzLmZpcmUoXCJkcmFnZW5kXCIpKSx0aGlzLl9tb3Zpbmc9ITF9fSksby5IYW5kbGVyPW8uQ2xhc3MuZXh0ZW5kKHtpbml0aWFsaXplOmZ1bmN0aW9uKHQpe3RoaXMuX21hcD10fSxlbmFibGU6ZnVuY3Rpb24oKXt0aGlzLl9lbmFibGVkfHwodGhpcy5fZW5hYmxlZD0hMCx0aGlzLmFkZEhvb2tzKCkpfSxkaXNhYmxlOmZ1bmN0aW9uKCl7dGhpcy5fZW5hYmxlZCYmKHRoaXMuX2VuYWJsZWQ9ITEsdGhpcy5yZW1vdmVIb29rcygpKX0sZW5hYmxlZDpmdW5jdGlvbigpe3JldHVybiEhdGhpcy5fZW5hYmxlZH19KSxvLk1hcC5tZXJnZU9wdGlvbnMoe2RyYWdnaW5nOiEwLGluZXJ0aWE6IW8uQnJvd3Nlci5hbmRyb2lkMjMsaW5lcnRpYURlY2VsZXJhdGlvbjozNDAwLGluZXJ0aWFNYXhTcGVlZDoxLzAsaW5lcnRpYVRocmVzaG9sZDpvLkJyb3dzZXIudG91Y2g/MzI6MTgsZWFzZUxpbmVhcml0eTouMjUsd29ybGRDb3B5SnVtcDohMX0pLG8uTWFwLkRyYWc9by5IYW5kbGVyLmV4dGVuZCh7YWRkSG9va3M6ZnVuY3Rpb24oKXtpZighdGhpcy5fZHJhZ2dhYmxlKXt2YXIgdD10aGlzLl9tYXA7dGhpcy5fZHJhZ2dhYmxlPW5ldyBvLkRyYWdnYWJsZSh0Ll9tYXBQYW5lLHQuX2NvbnRhaW5lciksdGhpcy5fZHJhZ2dhYmxlLm9uKHtkcmFnc3RhcnQ6dGhpcy5fb25EcmFnU3RhcnQsZHJhZzp0aGlzLl9vbkRyYWcsZHJhZ2VuZDp0aGlzLl9vbkRyYWdFbmR9LHRoaXMpLHQub3B0aW9ucy53b3JsZENvcHlKdW1wJiYodGhpcy5fZHJhZ2dhYmxlLm9uKFwicHJlZHJhZ1wiLHRoaXMuX29uUHJlRHJhZyx0aGlzKSx0Lm9uKFwidmlld3Jlc2V0XCIsdGhpcy5fb25WaWV3UmVzZXQsdGhpcyksdGhpcy5fb25WaWV3UmVzZXQoKSl9dGhpcy5fZHJhZ2dhYmxlLmVuYWJsZSgpfSxyZW1vdmVIb29rczpmdW5jdGlvbigpe3RoaXMuX2RyYWdnYWJsZS5kaXNhYmxlKCl9LG1vdmVkOmZ1bmN0aW9uKCl7cmV0dXJuIHRoaXMuX2RyYWdnYWJsZSYmdGhpcy5fZHJhZ2dhYmxlLl9tb3ZlZH0sX29uRHJhZ1N0YXJ0OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbWFwO3QuX3BhbkFuaW0mJnQuX3BhbkFuaW0uc3RvcCgpLHQuZmlyZShcIm1vdmVzdGFydFwiKS5maXJlKFwiZHJhZ3N0YXJ0XCIpLHQub3B0aW9ucy5pbmVydGlhJiYodGhpcy5fcG9zaXRpb25zPVtdLHRoaXMuX3RpbWVzPVtdKX0sX29uRHJhZzpmdW5jdGlvbigpe2lmKHRoaXMuX21hcC5vcHRpb25zLmluZXJ0aWEpe3ZhciB0PXRoaXMuX2xhc3RUaW1lPStuZXcgRGF0ZSxlPXRoaXMuX2xhc3RQb3M9dGhpcy5fZHJhZ2dhYmxlLl9uZXdQb3M7dGhpcy5fcG9zaXRpb25zLnB1c2goZSksdGhpcy5fdGltZXMucHVzaCh0KSx0LXRoaXMuX3RpbWVzWzBdPjIwMCYmKHRoaXMuX3Bvc2l0aW9ucy5zaGlmdCgpLHRoaXMuX3RpbWVzLnNoaWZ0KCkpfXRoaXMuX21hcC5maXJlKFwibW92ZVwiKS5maXJlKFwiZHJhZ1wiKX0sX29uVmlld1Jlc2V0OmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbWFwLmdldFNpemUoKS5fZGl2aWRlQnkoMiksZT10aGlzLl9tYXAubGF0TG5nVG9MYXllclBvaW50KFswLDBdKTt0aGlzLl9pbml0aWFsV29ybGRPZmZzZXQ9ZS5zdWJ0cmFjdCh0KS54LHRoaXMuX3dvcmxkV2lkdGg9dGhpcy5fbWFwLnByb2plY3QoWzAsMTgwXSkueH0sX29uUHJlRHJhZzpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX3dvcmxkV2lkdGgsZT1NYXRoLnJvdW5kKHQvMiksaT10aGlzLl9pbml0aWFsV29ybGRPZmZzZXQsbj10aGlzLl9kcmFnZ2FibGUuX25ld1Bvcy54LG89KG4tZStpKSV0K2UtaSxzPShuK2UraSkldC1lLWksYT1NYXRoLmFicyhvK2kpPE1hdGguYWJzKHMraSk/bzpzO3RoaXMuX2RyYWdnYWJsZS5fbmV3UG9zLng9YX0sX29uRHJhZ0VuZDpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX21hcCxlPXQub3B0aW9ucyxpPStuZXcgRGF0ZS10aGlzLl9sYXN0VGltZSxuPSFlLmluZXJ0aWF8fGk+ZS5pbmVydGlhVGhyZXNob2xkfHwhdGhpcy5fcG9zaXRpb25zWzBdO2lmKHQuZmlyZShcImRyYWdlbmRcIiksbil0LmZpcmUoXCJtb3ZlZW5kXCIpO2Vsc2V7dmFyIHM9dGhpcy5fbGFzdFBvcy5zdWJ0cmFjdCh0aGlzLl9wb3NpdGlvbnNbMF0pLGE9KHRoaXMuX2xhc3RUaW1lK2ktdGhpcy5fdGltZXNbMF0pLzFlMyxyPWUuZWFzZUxpbmVhcml0eSxoPXMubXVsdGlwbHlCeShyL2EpLGw9aC5kaXN0YW5jZVRvKFswLDBdKSx1PU1hdGgubWluKGUuaW5lcnRpYU1heFNwZWVkLGwpLGM9aC5tdWx0aXBseUJ5KHUvbCksZD11LyhlLmluZXJ0aWFEZWNlbGVyYXRpb24qcikscD1jLm11bHRpcGx5QnkoLWQvMikucm91bmQoKTtwLngmJnAueT9vLlV0aWwucmVxdWVzdEFuaW1GcmFtZShmdW5jdGlvbigpe3QucGFuQnkocCx7ZHVyYXRpb246ZCxlYXNlTGluZWFyaXR5OnIsbm9Nb3ZlU3RhcnQ6ITB9KX0pOnQuZmlyZShcIm1vdmVlbmRcIil9fX0pLG8uTWFwLmFkZEluaXRIb29rKFwiYWRkSGFuZGxlclwiLFwiZHJhZ2dpbmdcIixvLk1hcC5EcmFnKSxvLk1hcC5tZXJnZU9wdGlvbnMoe2RvdWJsZUNsaWNrWm9vbTohMH0pLG8uTWFwLkRvdWJsZUNsaWNrWm9vbT1vLkhhbmRsZXIuZXh0ZW5kKHthZGRIb29rczpmdW5jdGlvbigpe3RoaXMuX21hcC5vbihcImRibGNsaWNrXCIsdGhpcy5fb25Eb3VibGVDbGljayl9LHJlbW92ZUhvb2tzOmZ1bmN0aW9uKCl7dGhpcy5fbWFwLm9mZihcImRibGNsaWNrXCIsdGhpcy5fb25Eb3VibGVDbGljayl9LF9vbkRvdWJsZUNsaWNrOmZ1bmN0aW9uKHQpe3RoaXMuc2V0Wm9vbUFyb3VuZCh0LmNvbnRhaW5lclBvaW50LHRoaXMuX3pvb20rMSl9fSksby5NYXAuYWRkSW5pdEhvb2soXCJhZGRIYW5kbGVyXCIsXCJkb3VibGVDbGlja1pvb21cIixvLk1hcC5Eb3VibGVDbGlja1pvb20pLG8uTWFwLm1lcmdlT3B0aW9ucyh7c2Nyb2xsV2hlZWxab29tOiEwfSksby5NYXAuU2Nyb2xsV2hlZWxab29tPW8uSGFuZGxlci5leHRlbmQoe2FkZEhvb2tzOmZ1bmN0aW9uKCl7by5Eb21FdmVudC5vbih0aGlzLl9tYXAuX2NvbnRhaW5lcixcIm1vdXNld2hlZWxcIix0aGlzLl9vbldoZWVsU2Nyb2xsLHRoaXMpLG8uRG9tRXZlbnQub24odGhpcy5fbWFwLl9jb250YWluZXIsXCJNb3pNb3VzZVBpeGVsU2Nyb2xsXCIsby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCksdGhpcy5fZGVsdGE9MH0scmVtb3ZlSG9va3M6ZnVuY3Rpb24oKXtvLkRvbUV2ZW50Lm9mZih0aGlzLl9tYXAuX2NvbnRhaW5lcixcIm1vdXNld2hlZWxcIix0aGlzLl9vbldoZWVsU2Nyb2xsKSxvLkRvbUV2ZW50Lm9mZih0aGlzLl9tYXAuX2NvbnRhaW5lcixcIk1vek1vdXNlUGl4ZWxTY3JvbGxcIixvLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KX0sX29uV2hlZWxTY3JvbGw6ZnVuY3Rpb24odCl7dmFyIGU9by5Eb21FdmVudC5nZXRXaGVlbERlbHRhKHQpO3RoaXMuX2RlbHRhKz1lLHRoaXMuX2xhc3RNb3VzZVBvcz10aGlzLl9tYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQodCksdGhpcy5fc3RhcnRUaW1lfHwodGhpcy5fc3RhcnRUaW1lPStuZXcgRGF0ZSk7dmFyIGk9TWF0aC5tYXgoNDAtKCtuZXcgRGF0ZS10aGlzLl9zdGFydFRpbWUpLDApO2NsZWFyVGltZW91dCh0aGlzLl90aW1lciksdGhpcy5fdGltZXI9c2V0VGltZW91dChvLmJpbmQodGhpcy5fcGVyZm9ybVpvb20sdGhpcyksaSksby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCh0KSxvLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbih0KX0sX3BlcmZvcm1ab29tOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbWFwLGU9dGhpcy5fZGVsdGEsaT10LmdldFpvb20oKTtlPWU+MD9NYXRoLmNlaWwoZSk6TWF0aC5mbG9vcihlKSxlPU1hdGgubWF4KE1hdGgubWluKGUsNCksLTQpLGU9dC5fbGltaXRab29tKGkrZSktaSx0aGlzLl9kZWx0YT0wLHRoaXMuX3N0YXJ0VGltZT1udWxsLGUmJnQuc2V0Wm9vbUFyb3VuZCh0aGlzLl9sYXN0TW91c2VQb3MsaStlKX19KSxvLk1hcC5hZGRJbml0SG9vayhcImFkZEhhbmRsZXJcIixcInNjcm9sbFdoZWVsWm9vbVwiLG8uTWFwLlNjcm9sbFdoZWVsWm9vbSksby5leHRlbmQoby5Eb21FdmVudCx7X3RvdWNoc3RhcnQ6by5Ccm93c2VyLm1zVG91Y2g/XCJNU1BvaW50ZXJEb3duXCI6XCJ0b3VjaHN0YXJ0XCIsX3RvdWNoZW5kOm8uQnJvd3Nlci5tc1RvdWNoP1wiTVNQb2ludGVyVXBcIjpcInRvdWNoZW5kXCIsYWRkRG91YmxlVGFwTGlzdGVuZXI6ZnVuY3Rpb24odCxpLG4pe2Z1bmN0aW9uIHModCl7dmFyIGU7aWYoby5Ccm93c2VyLm1zVG91Y2g/KF8ucHVzaCh0LnBvaW50ZXJJZCksZT1fLmxlbmd0aCk6ZT10LnRvdWNoZXMubGVuZ3RoLCEoZT4xKSl7dmFyIGk9RGF0ZS5ub3coKSxuPWktKHJ8fGkpO2g9dC50b3VjaGVzP3QudG91Y2hlc1swXTp0LGw9bj4wJiZ1Pj1uLHI9aX19ZnVuY3Rpb24gYSh0KXtpZihvLkJyb3dzZXIubXNUb3VjaCl7dmFyIGU9Xy5pbmRleE9mKHQucG9pbnRlcklkKTtpZigtMT09PWUpcmV0dXJuO18uc3BsaWNlKGUsMSl9aWYobCl7aWYoby5Ccm93c2VyLm1zVG91Y2gpe3ZhciBuLHM9e307Zm9yKHZhciBhIGluIGgpbj1oW2FdLHNbYV09XCJmdW5jdGlvblwiPT10eXBlb2Ygbj9uLmJpbmQoaCk6bjtoPXN9aC50eXBlPVwiZGJsY2xpY2tcIixpKGgpLHI9bnVsbH19dmFyIHIsaCxsPSExLHU9MjUwLGM9XCJfbGVhZmxldF9cIixkPXRoaXMuX3RvdWNoc3RhcnQscD10aGlzLl90b3VjaGVuZCxfPVtdO3RbYytkK25dPXMsdFtjK3Arbl09YTt2YXIgbT1vLkJyb3dzZXIubXNUb3VjaD9lLmRvY3VtZW50RWxlbWVudDp0O3JldHVybiB0LmFkZEV2ZW50TGlzdGVuZXIoZCxzLCExKSxtLmFkZEV2ZW50TGlzdGVuZXIocCxhLCExKSxvLkJyb3dzZXIubXNUb3VjaCYmbS5hZGRFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyQ2FuY2VsXCIsYSwhMSksdGhpc30scmVtb3ZlRG91YmxlVGFwTGlzdGVuZXI6ZnVuY3Rpb24odCxpKXt2YXIgbj1cIl9sZWFmbGV0X1wiO3JldHVybiB0LnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5fdG91Y2hzdGFydCx0W24rdGhpcy5fdG91Y2hzdGFydCtpXSwhMSksKG8uQnJvd3Nlci5tc1RvdWNoP2UuZG9jdW1lbnRFbGVtZW50OnQpLnJlbW92ZUV2ZW50TGlzdGVuZXIodGhpcy5fdG91Y2hlbmQsdFtuK3RoaXMuX3RvdWNoZW5kK2ldLCExKSxvLkJyb3dzZXIubXNUb3VjaCYmZS5kb2N1bWVudEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIk1TUG9pbnRlckNhbmNlbFwiLHRbbit0aGlzLl90b3VjaGVuZCtpXSwhMSksdGhpc319KSxvLmV4dGVuZChvLkRvbUV2ZW50LHtfbXNUb3VjaGVzOltdLF9tc0RvY3VtZW50TGlzdGVuZXI6ITEsYWRkTXNUb3VjaExpc3RlbmVyOmZ1bmN0aW9uKHQsZSxpLG4pe3N3aXRjaChlKXtjYXNlXCJ0b3VjaHN0YXJ0XCI6cmV0dXJuIHRoaXMuYWRkTXNUb3VjaExpc3RlbmVyU3RhcnQodCxlLGksbik7Y2FzZVwidG91Y2hlbmRcIjpyZXR1cm4gdGhpcy5hZGRNc1RvdWNoTGlzdGVuZXJFbmQodCxlLGksbik7Y2FzZVwidG91Y2htb3ZlXCI6cmV0dXJuIHRoaXMuYWRkTXNUb3VjaExpc3RlbmVyTW92ZSh0LGUsaSxuKTtkZWZhdWx0OnRocm93XCJVbmtub3duIHRvdWNoIGV2ZW50IHR5cGVcIn19LGFkZE1zVG91Y2hMaXN0ZW5lclN0YXJ0OmZ1bmN0aW9uKHQsaSxuLG8pe3ZhciBzPVwiX2xlYWZsZXRfXCIsYT10aGlzLl9tc1RvdWNoZXMscj1mdW5jdGlvbih0KXtmb3IodmFyIGU9ITEsaT0wO2k8YS5sZW5ndGg7aSsrKWlmKGFbaV0ucG9pbnRlcklkPT09dC5wb2ludGVySWQpe2U9ITA7YnJlYWt9ZXx8YS5wdXNoKHQpLHQudG91Y2hlcz1hLnNsaWNlKCksdC5jaGFuZ2VkVG91Y2hlcz1bdF0sbih0KX07aWYodFtzK1widG91Y2hzdGFydFwiK29dPXIsdC5hZGRFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyRG93blwiLHIsITEpLCF0aGlzLl9tc0RvY3VtZW50TGlzdGVuZXIpe3ZhciBoPWZ1bmN0aW9uKHQpe2Zvcih2YXIgZT0wO2U8YS5sZW5ndGg7ZSsrKWlmKGFbZV0ucG9pbnRlcklkPT09dC5wb2ludGVySWQpe2Euc3BsaWNlKGUsMSk7YnJlYWt9fTtlLmRvY3VtZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyVXBcIixoLCExKSxlLmRvY3VtZW50RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyQ2FuY2VsXCIsaCwhMSksdGhpcy5fbXNEb2N1bWVudExpc3RlbmVyPSEwfXJldHVybiB0aGlzfSxhZGRNc1RvdWNoTGlzdGVuZXJNb3ZlOmZ1bmN0aW9uKHQsZSxpLG4pe2Z1bmN0aW9uIG8odCl7aWYodC5wb2ludGVyVHlwZSE9PXQuTVNQT0lOVEVSX1RZUEVfTU9VU0V8fDAhPT10LmJ1dHRvbnMpe2Zvcih2YXIgZT0wO2U8YS5sZW5ndGg7ZSsrKWlmKGFbZV0ucG9pbnRlcklkPT09dC5wb2ludGVySWQpe2FbZV09dDticmVha310LnRvdWNoZXM9YS5zbGljZSgpLHQuY2hhbmdlZFRvdWNoZXM9W3RdLGkodCl9fXZhciBzPVwiX2xlYWZsZXRfXCIsYT10aGlzLl9tc1RvdWNoZXM7cmV0dXJuIHRbcytcInRvdWNobW92ZVwiK25dPW8sdC5hZGRFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyTW92ZVwiLG8sITEpLHRoaXN9LGFkZE1zVG91Y2hMaXN0ZW5lckVuZDpmdW5jdGlvbih0LGUsaSxuKXt2YXIgbz1cIl9sZWFmbGV0X1wiLHM9dGhpcy5fbXNUb3VjaGVzLGE9ZnVuY3Rpb24odCl7Zm9yKHZhciBlPTA7ZTxzLmxlbmd0aDtlKyspaWYoc1tlXS5wb2ludGVySWQ9PT10LnBvaW50ZXJJZCl7cy5zcGxpY2UoZSwxKTticmVha310LnRvdWNoZXM9cy5zbGljZSgpLHQuY2hhbmdlZFRvdWNoZXM9W3RdLGkodCl9O3JldHVybiB0W28rXCJ0b3VjaGVuZFwiK25dPWEsdC5hZGRFdmVudExpc3RlbmVyKFwiTVNQb2ludGVyVXBcIixhLCExKSx0LmFkZEV2ZW50TGlzdGVuZXIoXCJNU1BvaW50ZXJDYW5jZWxcIixhLCExKSx0aGlzfSxyZW1vdmVNc1RvdWNoTGlzdGVuZXI6ZnVuY3Rpb24odCxlLGkpe3ZhciBuPVwiX2xlYWZsZXRfXCIsbz10W24rZStpXTtzd2l0Y2goZSl7Y2FzZVwidG91Y2hzdGFydFwiOnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIk1TUG9pbnRlckRvd25cIixvLCExKTticmVhaztjYXNlXCJ0b3VjaG1vdmVcIjp0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJNU1BvaW50ZXJNb3ZlXCIsbywhMSk7YnJlYWs7Y2FzZVwidG91Y2hlbmRcIjp0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJNU1BvaW50ZXJVcFwiLG8sITEpLHQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIk1TUG9pbnRlckNhbmNlbFwiLG8sITEpfXJldHVybiB0aGlzfX0pLG8uTWFwLm1lcmdlT3B0aW9ucyh7dG91Y2hab29tOm8uQnJvd3Nlci50b3VjaCYmIW8uQnJvd3Nlci5hbmRyb2lkMjN9KSxvLk1hcC5Ub3VjaFpvb209by5IYW5kbGVyLmV4dGVuZCh7YWRkSG9va3M6ZnVuY3Rpb24oKXtvLkRvbUV2ZW50Lm9uKHRoaXMuX21hcC5fY29udGFpbmVyLFwidG91Y2hzdGFydFwiLHRoaXMuX29uVG91Y2hTdGFydCx0aGlzKX0scmVtb3ZlSG9va3M6ZnVuY3Rpb24oKXtvLkRvbUV2ZW50Lm9mZih0aGlzLl9tYXAuX2NvbnRhaW5lcixcInRvdWNoc3RhcnRcIix0aGlzLl9vblRvdWNoU3RhcnQsdGhpcyl9LF9vblRvdWNoU3RhcnQ6ZnVuY3Rpb24odCl7dmFyIGk9dGhpcy5fbWFwO2lmKHQudG91Y2hlcyYmMj09PXQudG91Y2hlcy5sZW5ndGgmJiFpLl9hbmltYXRpbmdab29tJiYhdGhpcy5fem9vbWluZyl7dmFyIG49aS5tb3VzZUV2ZW50VG9MYXllclBvaW50KHQudG91Y2hlc1swXSkscz1pLm1vdXNlRXZlbnRUb0xheWVyUG9pbnQodC50b3VjaGVzWzFdKSxhPWkuX2dldENlbnRlckxheWVyUG9pbnQoKTt0aGlzLl9zdGFydENlbnRlcj1uLmFkZChzKS5fZGl2aWRlQnkoMiksdGhpcy5fc3RhcnREaXN0PW4uZGlzdGFuY2VUbyhzKSx0aGlzLl9tb3ZlZD0hMSx0aGlzLl96b29taW5nPSEwLHRoaXMuX2NlbnRlck9mZnNldD1hLnN1YnRyYWN0KHRoaXMuX3N0YXJ0Q2VudGVyKSxpLl9wYW5BbmltJiZpLl9wYW5BbmltLnN0b3AoKSxvLkRvbUV2ZW50Lm9uKGUsXCJ0b3VjaG1vdmVcIix0aGlzLl9vblRvdWNoTW92ZSx0aGlzKS5vbihlLFwidG91Y2hlbmRcIix0aGlzLl9vblRvdWNoRW5kLHRoaXMpLG8uRG9tRXZlbnQucHJldmVudERlZmF1bHQodCl9fSxfb25Ub3VjaE1vdmU6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5fbWFwO2lmKHQudG91Y2hlcyYmMj09PXQudG91Y2hlcy5sZW5ndGgmJnRoaXMuX3pvb21pbmcpe3ZhciBpPWUubW91c2VFdmVudFRvTGF5ZXJQb2ludCh0LnRvdWNoZXNbMF0pLG49ZS5tb3VzZUV2ZW50VG9MYXllclBvaW50KHQudG91Y2hlc1sxXSk7dGhpcy5fc2NhbGU9aS5kaXN0YW5jZVRvKG4pL3RoaXMuX3N0YXJ0RGlzdCx0aGlzLl9kZWx0YT1pLl9hZGQobikuX2RpdmlkZUJ5KDIpLl9zdWJ0cmFjdCh0aGlzLl9zdGFydENlbnRlciksMSE9PXRoaXMuX3NjYWxlJiYodGhpcy5fbW92ZWR8fChvLkRvbVV0aWwuYWRkQ2xhc3MoZS5fbWFwUGFuZSxcImxlYWZsZXQtdG91Y2hpbmdcIiksZS5maXJlKFwibW92ZXN0YXJ0XCIpLmZpcmUoXCJ6b29tc3RhcnRcIiksdGhpcy5fbW92ZWQ9ITApLG8uVXRpbC5jYW5jZWxBbmltRnJhbWUodGhpcy5fYW5pbVJlcXVlc3QpLHRoaXMuX2FuaW1SZXF1ZXN0PW8uVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKHRoaXMuX3VwZGF0ZU9uTW92ZSx0aGlzLCEwLHRoaXMuX21hcC5fY29udGFpbmVyKSxvLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KHQpKX19LF91cGRhdGVPbk1vdmU6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9tYXAsZT10aGlzLl9nZXRTY2FsZU9yaWdpbigpLGk9dC5sYXllclBvaW50VG9MYXRMbmcoZSksbj10LmdldFNjYWxlWm9vbSh0aGlzLl9zY2FsZSk7dC5fYW5pbWF0ZVpvb20oaSxuLHRoaXMuX3N0YXJ0Q2VudGVyLHRoaXMuX3NjYWxlLHRoaXMuX2RlbHRhKX0sX29uVG91Y2hFbmQ6ZnVuY3Rpb24oKXtpZighdGhpcy5fbW92ZWR8fCF0aGlzLl96b29taW5nKXJldHVybiB0aGlzLl96b29taW5nPSExLHZvaWQgMDt2YXIgdD10aGlzLl9tYXA7dGhpcy5fem9vbWluZz0hMSxvLkRvbVV0aWwucmVtb3ZlQ2xhc3ModC5fbWFwUGFuZSxcImxlYWZsZXQtdG91Y2hpbmdcIiksby5VdGlsLmNhbmNlbEFuaW1GcmFtZSh0aGlzLl9hbmltUmVxdWVzdCksby5Eb21FdmVudC5vZmYoZSxcInRvdWNobW92ZVwiLHRoaXMuX29uVG91Y2hNb3ZlKS5vZmYoZSxcInRvdWNoZW5kXCIsdGhpcy5fb25Ub3VjaEVuZCk7dmFyIGk9dGhpcy5fZ2V0U2NhbGVPcmlnaW4oKSxuPXQubGF5ZXJQb2ludFRvTGF0TG5nKGkpLHM9dC5nZXRab29tKCksYT10LmdldFNjYWxlWm9vbSh0aGlzLl9zY2FsZSktcyxyPWE+MD9NYXRoLmNlaWwoYSk6TWF0aC5mbG9vcihhKSxoPXQuX2xpbWl0Wm9vbShzK3IpLGw9dC5nZXRab29tU2NhbGUoaCkvdGhpcy5fc2NhbGU7dC5fYW5pbWF0ZVpvb20obixoLGksbCl9LF9nZXRTY2FsZU9yaWdpbjpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX2NlbnRlck9mZnNldC5zdWJ0cmFjdCh0aGlzLl9kZWx0YSkuZGl2aWRlQnkodGhpcy5fc2NhbGUpO3JldHVybiB0aGlzLl9zdGFydENlbnRlci5hZGQodCl9fSksby5NYXAuYWRkSW5pdEhvb2soXCJhZGRIYW5kbGVyXCIsXCJ0b3VjaFpvb21cIixvLk1hcC5Ub3VjaFpvb20pLG8uTWFwLm1lcmdlT3B0aW9ucyh7dGFwOiEwLHRhcFRvbGVyYW5jZToxNX0pLG8uTWFwLlRhcD1vLkhhbmRsZXIuZXh0ZW5kKHthZGRIb29rczpmdW5jdGlvbigpe28uRG9tRXZlbnQub24odGhpcy5fbWFwLl9jb250YWluZXIsXCJ0b3VjaHN0YXJ0XCIsdGhpcy5fb25Eb3duLHRoaXMpXG59LHJlbW92ZUhvb2tzOmZ1bmN0aW9uKCl7by5Eb21FdmVudC5vZmYodGhpcy5fbWFwLl9jb250YWluZXIsXCJ0b3VjaHN0YXJ0XCIsdGhpcy5fb25Eb3duLHRoaXMpfSxfb25Eb3duOmZ1bmN0aW9uKHQpe2lmKHQudG91Y2hlcyl7aWYoby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCh0KSx0aGlzLl9maXJlQ2xpY2s9ITAsdC50b3VjaGVzLmxlbmd0aD4xKXJldHVybiB0aGlzLl9maXJlQ2xpY2s9ITEsY2xlYXJUaW1lb3V0KHRoaXMuX2hvbGRUaW1lb3V0KSx2b2lkIDA7dmFyIGk9dC50b3VjaGVzWzBdLG49aS50YXJnZXQ7dGhpcy5fc3RhcnRQb3M9dGhpcy5fbmV3UG9zPW5ldyBvLlBvaW50KGkuY2xpZW50WCxpLmNsaWVudFkpLFwiYVwiPT09bi50YWdOYW1lLnRvTG93ZXJDYXNlKCkmJm8uRG9tVXRpbC5hZGRDbGFzcyhuLFwibGVhZmxldC1hY3RpdmVcIiksdGhpcy5faG9sZFRpbWVvdXQ9c2V0VGltZW91dChvLmJpbmQoZnVuY3Rpb24oKXt0aGlzLl9pc1RhcFZhbGlkKCkmJih0aGlzLl9maXJlQ2xpY2s9ITEsdGhpcy5fb25VcCgpLHRoaXMuX3NpbXVsYXRlRXZlbnQoXCJjb250ZXh0bWVudVwiLGkpKX0sdGhpcyksMWUzKSxvLkRvbUV2ZW50Lm9uKGUsXCJ0b3VjaG1vdmVcIix0aGlzLl9vbk1vdmUsdGhpcykub24oZSxcInRvdWNoZW5kXCIsdGhpcy5fb25VcCx0aGlzKX19LF9vblVwOmZ1bmN0aW9uKHQpe2lmKGNsZWFyVGltZW91dCh0aGlzLl9ob2xkVGltZW91dCksby5Eb21FdmVudC5vZmYoZSxcInRvdWNobW92ZVwiLHRoaXMuX29uTW92ZSx0aGlzKS5vZmYoZSxcInRvdWNoZW5kXCIsdGhpcy5fb25VcCx0aGlzKSx0aGlzLl9maXJlQ2xpY2smJnQmJnQuY2hhbmdlZFRvdWNoZXMpe3ZhciBpPXQuY2hhbmdlZFRvdWNoZXNbMF0sbj1pLnRhcmdldDtcImFcIj09PW4udGFnTmFtZS50b0xvd2VyQ2FzZSgpJiZvLkRvbVV0aWwucmVtb3ZlQ2xhc3MobixcImxlYWZsZXQtYWN0aXZlXCIpLHRoaXMuX2lzVGFwVmFsaWQoKSYmdGhpcy5fc2ltdWxhdGVFdmVudChcImNsaWNrXCIsaSl9fSxfaXNUYXBWYWxpZDpmdW5jdGlvbigpe3JldHVybiB0aGlzLl9uZXdQb3MuZGlzdGFuY2VUbyh0aGlzLl9zdGFydFBvcyk8PXRoaXMuX21hcC5vcHRpb25zLnRhcFRvbGVyYW5jZX0sX29uTW92ZTpmdW5jdGlvbih0KXt2YXIgZT10LnRvdWNoZXNbMF07dGhpcy5fbmV3UG9zPW5ldyBvLlBvaW50KGUuY2xpZW50WCxlLmNsaWVudFkpfSxfc2ltdWxhdGVFdmVudDpmdW5jdGlvbihpLG4pe3ZhciBvPWUuY3JlYXRlRXZlbnQoXCJNb3VzZUV2ZW50c1wiKTtvLl9zaW11bGF0ZWQ9ITAsbi50YXJnZXQuX3NpbXVsYXRlZENsaWNrPSEwLG8uaW5pdE1vdXNlRXZlbnQoaSwhMCwhMCx0LDEsbi5zY3JlZW5YLG4uc2NyZWVuWSxuLmNsaWVudFgsbi5jbGllbnRZLCExLCExLCExLCExLDAsbnVsbCksbi50YXJnZXQuZGlzcGF0Y2hFdmVudChvKX19KSxvLkJyb3dzZXIudG91Y2gmJiFvLkJyb3dzZXIubXNUb3VjaCYmby5NYXAuYWRkSW5pdEhvb2soXCJhZGRIYW5kbGVyXCIsXCJ0YXBcIixvLk1hcC5UYXApLG8uTWFwLm1lcmdlT3B0aW9ucyh7Ym94Wm9vbTohMH0pLG8uTWFwLkJveFpvb209by5IYW5kbGVyLmV4dGVuZCh7aW5pdGlhbGl6ZTpmdW5jdGlvbih0KXt0aGlzLl9tYXA9dCx0aGlzLl9jb250YWluZXI9dC5fY29udGFpbmVyLHRoaXMuX3BhbmU9dC5fcGFuZXMub3ZlcmxheVBhbmV9LGFkZEhvb2tzOmZ1bmN0aW9uKCl7by5Eb21FdmVudC5vbih0aGlzLl9jb250YWluZXIsXCJtb3VzZWRvd25cIix0aGlzLl9vbk1vdXNlRG93bix0aGlzKX0scmVtb3ZlSG9va3M6ZnVuY3Rpb24oKXtvLkRvbUV2ZW50Lm9mZih0aGlzLl9jb250YWluZXIsXCJtb3VzZWRvd25cIix0aGlzLl9vbk1vdXNlRG93bil9LF9vbk1vdXNlRG93bjpmdW5jdGlvbih0KXtyZXR1cm4hdC5zaGlmdEtleXx8MSE9PXQud2hpY2gmJjEhPT10LmJ1dHRvbj8hMTooby5Eb21VdGlsLmRpc2FibGVUZXh0U2VsZWN0aW9uKCksby5Eb21VdGlsLmRpc2FibGVJbWFnZURyYWcoKSx0aGlzLl9zdGFydExheWVyUG9pbnQ9dGhpcy5fbWFwLm1vdXNlRXZlbnRUb0xheWVyUG9pbnQodCksdGhpcy5fYm94PW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixcImxlYWZsZXQtem9vbS1ib3hcIix0aGlzLl9wYW5lKSxvLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fYm94LHRoaXMuX3N0YXJ0TGF5ZXJQb2ludCksdGhpcy5fY29udGFpbmVyLnN0eWxlLmN1cnNvcj1cImNyb3NzaGFpclwiLG8uRG9tRXZlbnQub24oZSxcIm1vdXNlbW92ZVwiLHRoaXMuX29uTW91c2VNb3ZlLHRoaXMpLm9uKGUsXCJtb3VzZXVwXCIsdGhpcy5fb25Nb3VzZVVwLHRoaXMpLm9uKGUsXCJrZXlkb3duXCIsdGhpcy5fb25LZXlEb3duLHRoaXMpLHRoaXMuX21hcC5maXJlKFwiYm94em9vbXN0YXJ0XCIpLHZvaWQgMCl9LF9vbk1vdXNlTW92ZTpmdW5jdGlvbih0KXt2YXIgZT10aGlzLl9zdGFydExheWVyUG9pbnQsaT10aGlzLl9ib3gsbj10aGlzLl9tYXAubW91c2VFdmVudFRvTGF5ZXJQb2ludCh0KSxzPW4uc3VidHJhY3QoZSksYT1uZXcgby5Qb2ludChNYXRoLm1pbihuLngsZS54KSxNYXRoLm1pbihuLnksZS55KSk7by5Eb21VdGlsLnNldFBvc2l0aW9uKGksYSksaS5zdHlsZS53aWR0aD1NYXRoLm1heCgwLE1hdGguYWJzKHMueCktNCkrXCJweFwiLGkuc3R5bGUuaGVpZ2h0PU1hdGgubWF4KDAsTWF0aC5hYnMocy55KS00KStcInB4XCJ9LF9maW5pc2g6ZnVuY3Rpb24oKXt0aGlzLl9wYW5lLnJlbW92ZUNoaWxkKHRoaXMuX2JveCksdGhpcy5fY29udGFpbmVyLnN0eWxlLmN1cnNvcj1cIlwiLG8uRG9tVXRpbC5lbmFibGVUZXh0U2VsZWN0aW9uKCksby5Eb21VdGlsLmVuYWJsZUltYWdlRHJhZygpLG8uRG9tRXZlbnQub2ZmKGUsXCJtb3VzZW1vdmVcIix0aGlzLl9vbk1vdXNlTW92ZSkub2ZmKGUsXCJtb3VzZXVwXCIsdGhpcy5fb25Nb3VzZVVwKS5vZmYoZSxcImtleWRvd25cIix0aGlzLl9vbktleURvd24pfSxfb25Nb3VzZVVwOmZ1bmN0aW9uKHQpe3RoaXMuX2ZpbmlzaCgpO3ZhciBlPXRoaXMuX21hcCxpPWUubW91c2VFdmVudFRvTGF5ZXJQb2ludCh0KTtpZighdGhpcy5fc3RhcnRMYXllclBvaW50LmVxdWFscyhpKSl7dmFyIG49bmV3IG8uTGF0TG5nQm91bmRzKGUubGF5ZXJQb2ludFRvTGF0TG5nKHRoaXMuX3N0YXJ0TGF5ZXJQb2ludCksZS5sYXllclBvaW50VG9MYXRMbmcoaSkpO2UuZml0Qm91bmRzKG4pLGUuZmlyZShcImJveHpvb21lbmRcIix7Ym94Wm9vbUJvdW5kczpufSl9fSxfb25LZXlEb3duOmZ1bmN0aW9uKHQpezI3PT09dC5rZXlDb2RlJiZ0aGlzLl9maW5pc2goKX19KSxvLk1hcC5hZGRJbml0SG9vayhcImFkZEhhbmRsZXJcIixcImJveFpvb21cIixvLk1hcC5Cb3hab29tKSxvLk1hcC5tZXJnZU9wdGlvbnMoe2tleWJvYXJkOiEwLGtleWJvYXJkUGFuT2Zmc2V0OjgwLGtleWJvYXJkWm9vbU9mZnNldDoxfSksby5NYXAuS2V5Ym9hcmQ9by5IYW5kbGVyLmV4dGVuZCh7a2V5Q29kZXM6e2xlZnQ6WzM3XSxyaWdodDpbMzldLGRvd246WzQwXSx1cDpbMzhdLHpvb21JbjpbMTg3LDEwNyw2MV0sem9vbU91dDpbMTg5LDEwOSwxNzNdfSxpbml0aWFsaXplOmZ1bmN0aW9uKHQpe3RoaXMuX21hcD10LHRoaXMuX3NldFBhbk9mZnNldCh0Lm9wdGlvbnMua2V5Ym9hcmRQYW5PZmZzZXQpLHRoaXMuX3NldFpvb21PZmZzZXQodC5vcHRpb25zLmtleWJvYXJkWm9vbU9mZnNldCl9LGFkZEhvb2tzOmZ1bmN0aW9uKCl7dmFyIHQ9dGhpcy5fbWFwLl9jb250YWluZXI7LTE9PT10LnRhYkluZGV4JiYodC50YWJJbmRleD1cIjBcIiksby5Eb21FdmVudC5vbih0LFwiZm9jdXNcIix0aGlzLl9vbkZvY3VzLHRoaXMpLm9uKHQsXCJibHVyXCIsdGhpcy5fb25CbHVyLHRoaXMpLm9uKHQsXCJtb3VzZWRvd25cIix0aGlzLl9vbk1vdXNlRG93bix0aGlzKSx0aGlzLl9tYXAub24oXCJmb2N1c1wiLHRoaXMuX2FkZEhvb2tzLHRoaXMpLm9uKFwiYmx1clwiLHRoaXMuX3JlbW92ZUhvb2tzLHRoaXMpfSxyZW1vdmVIb29rczpmdW5jdGlvbigpe3RoaXMuX3JlbW92ZUhvb2tzKCk7dmFyIHQ9dGhpcy5fbWFwLl9jb250YWluZXI7by5Eb21FdmVudC5vZmYodCxcImZvY3VzXCIsdGhpcy5fb25Gb2N1cyx0aGlzKS5vZmYodCxcImJsdXJcIix0aGlzLl9vbkJsdXIsdGhpcykub2ZmKHQsXCJtb3VzZWRvd25cIix0aGlzLl9vbk1vdXNlRG93bix0aGlzKSx0aGlzLl9tYXAub2ZmKFwiZm9jdXNcIix0aGlzLl9hZGRIb29rcyx0aGlzKS5vZmYoXCJibHVyXCIsdGhpcy5fcmVtb3ZlSG9va3MsdGhpcyl9LF9vbk1vdXNlRG93bjpmdW5jdGlvbigpe2lmKCF0aGlzLl9mb2N1c2VkKXt2YXIgaT1lLmJvZHksbj1lLmRvY3VtZW50RWxlbWVudCxvPWkuc2Nyb2xsVG9wfHxuLnNjcm9sbFRvcCxzPWkuc2Nyb2xsTGVmdHx8bi5zY3JvbGxMZWZ0O3RoaXMuX21hcC5fY29udGFpbmVyLmZvY3VzKCksdC5zY3JvbGxUbyhzLG8pfX0sX29uRm9jdXM6ZnVuY3Rpb24oKXt0aGlzLl9mb2N1c2VkPSEwLHRoaXMuX21hcC5maXJlKFwiZm9jdXNcIil9LF9vbkJsdXI6ZnVuY3Rpb24oKXt0aGlzLl9mb2N1c2VkPSExLHRoaXMuX21hcC5maXJlKFwiYmx1clwiKX0sX3NldFBhbk9mZnNldDpmdW5jdGlvbih0KXt2YXIgZSxpLG49dGhpcy5fcGFuS2V5cz17fSxvPXRoaXMua2V5Q29kZXM7Zm9yKGU9MCxpPW8ubGVmdC5sZW5ndGg7aT5lO2UrKyluW28ubGVmdFtlXV09Wy0xKnQsMF07Zm9yKGU9MCxpPW8ucmlnaHQubGVuZ3RoO2k+ZTtlKyspbltvLnJpZ2h0W2VdXT1bdCwwXTtmb3IoZT0wLGk9by5kb3duLmxlbmd0aDtpPmU7ZSsrKW5bby5kb3duW2VdXT1bMCx0XTtmb3IoZT0wLGk9by51cC5sZW5ndGg7aT5lO2UrKyluW28udXBbZV1dPVswLC0xKnRdfSxfc2V0Wm9vbU9mZnNldDpmdW5jdGlvbih0KXt2YXIgZSxpLG49dGhpcy5fem9vbUtleXM9e30sbz10aGlzLmtleUNvZGVzO2ZvcihlPTAsaT1vLnpvb21Jbi5sZW5ndGg7aT5lO2UrKyluW28uem9vbUluW2VdXT10O2ZvcihlPTAsaT1vLnpvb21PdXQubGVuZ3RoO2k+ZTtlKyspbltvLnpvb21PdXRbZV1dPS10fSxfYWRkSG9va3M6ZnVuY3Rpb24oKXtvLkRvbUV2ZW50Lm9uKGUsXCJrZXlkb3duXCIsdGhpcy5fb25LZXlEb3duLHRoaXMpfSxfcmVtb3ZlSG9va3M6ZnVuY3Rpb24oKXtvLkRvbUV2ZW50Lm9mZihlLFwia2V5ZG93blwiLHRoaXMuX29uS2V5RG93bix0aGlzKX0sX29uS2V5RG93bjpmdW5jdGlvbih0KXt2YXIgZT10LmtleUNvZGUsaT10aGlzLl9tYXA7aWYoZSBpbiB0aGlzLl9wYW5LZXlzKXtpZihpLl9wYW5BbmltJiZpLl9wYW5BbmltLl9pblByb2dyZXNzKXJldHVybjtpLnBhbkJ5KHRoaXMuX3BhbktleXNbZV0pLGkub3B0aW9ucy5tYXhCb3VuZHMmJmkucGFuSW5zaWRlQm91bmRzKGkub3B0aW9ucy5tYXhCb3VuZHMpfWVsc2V7aWYoIShlIGluIHRoaXMuX3pvb21LZXlzKSlyZXR1cm47aS5zZXRab29tKGkuZ2V0Wm9vbSgpK3RoaXMuX3pvb21LZXlzW2VdKX1vLkRvbUV2ZW50LnN0b3AodCl9fSksby5NYXAuYWRkSW5pdEhvb2soXCJhZGRIYW5kbGVyXCIsXCJrZXlib2FyZFwiLG8uTWFwLktleWJvYXJkKSxvLkhhbmRsZXIuTWFya2VyRHJhZz1vLkhhbmRsZXIuZXh0ZW5kKHtpbml0aWFsaXplOmZ1bmN0aW9uKHQpe3RoaXMuX21hcmtlcj10fSxhZGRIb29rczpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX21hcmtlci5faWNvbjt0aGlzLl9kcmFnZ2FibGV8fCh0aGlzLl9kcmFnZ2FibGU9bmV3IG8uRHJhZ2dhYmxlKHQsdCkpLHRoaXMuX2RyYWdnYWJsZS5vbihcImRyYWdzdGFydFwiLHRoaXMuX29uRHJhZ1N0YXJ0LHRoaXMpLm9uKFwiZHJhZ1wiLHRoaXMuX29uRHJhZyx0aGlzKS5vbihcImRyYWdlbmRcIix0aGlzLl9vbkRyYWdFbmQsdGhpcyksdGhpcy5fZHJhZ2dhYmxlLmVuYWJsZSgpfSxyZW1vdmVIb29rczpmdW5jdGlvbigpe3RoaXMuX2RyYWdnYWJsZS5vZmYoXCJkcmFnc3RhcnRcIix0aGlzLl9vbkRyYWdTdGFydCx0aGlzKS5vZmYoXCJkcmFnXCIsdGhpcy5fb25EcmFnLHRoaXMpLm9mZihcImRyYWdlbmRcIix0aGlzLl9vbkRyYWdFbmQsdGhpcyksdGhpcy5fZHJhZ2dhYmxlLmRpc2FibGUoKX0sbW92ZWQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fZHJhZ2dhYmxlJiZ0aGlzLl9kcmFnZ2FibGUuX21vdmVkfSxfb25EcmFnU3RhcnQ6ZnVuY3Rpb24oKXt0aGlzLl9tYXJrZXIuY2xvc2VQb3B1cCgpLmZpcmUoXCJtb3Zlc3RhcnRcIikuZmlyZShcImRyYWdzdGFydFwiKX0sX29uRHJhZzpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX21hcmtlcixlPXQuX3NoYWRvdyxpPW8uRG9tVXRpbC5nZXRQb3NpdGlvbih0Ll9pY29uKSxuPXQuX21hcC5sYXllclBvaW50VG9MYXRMbmcoaSk7ZSYmby5Eb21VdGlsLnNldFBvc2l0aW9uKGUsaSksdC5fbGF0bG5nPW4sdC5maXJlKFwibW92ZVwiLHtsYXRsbmc6bn0pLmZpcmUoXCJkcmFnXCIpfSxfb25EcmFnRW5kOmZ1bmN0aW9uKCl7dGhpcy5fbWFya2VyLmZpcmUoXCJtb3ZlZW5kXCIpLmZpcmUoXCJkcmFnZW5kXCIpfX0pLG8uQ29udHJvbD1vLkNsYXNzLmV4dGVuZCh7b3B0aW9uczp7cG9zaXRpb246XCJ0b3ByaWdodFwifSxpbml0aWFsaXplOmZ1bmN0aW9uKHQpe28uc2V0T3B0aW9ucyh0aGlzLHQpfSxnZXRQb3NpdGlvbjpmdW5jdGlvbigpe3JldHVybiB0aGlzLm9wdGlvbnMucG9zaXRpb259LHNldFBvc2l0aW9uOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuX21hcDtyZXR1cm4gZSYmZS5yZW1vdmVDb250cm9sKHRoaXMpLHRoaXMub3B0aW9ucy5wb3NpdGlvbj10LGUmJmUuYWRkQ29udHJvbCh0aGlzKSx0aGlzfSxnZXRDb250YWluZXI6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpcy5fY29udGFpbmVyfSxhZGRUbzpmdW5jdGlvbih0KXt0aGlzLl9tYXA9dDt2YXIgZT10aGlzLl9jb250YWluZXI9dGhpcy5vbkFkZCh0KSxpPXRoaXMuZ2V0UG9zaXRpb24oKSxuPXQuX2NvbnRyb2xDb3JuZXJzW2ldO3JldHVybiBvLkRvbVV0aWwuYWRkQ2xhc3MoZSxcImxlYWZsZXQtY29udHJvbFwiKSwtMSE9PWkuaW5kZXhPZihcImJvdHRvbVwiKT9uLmluc2VydEJlZm9yZShlLG4uZmlyc3RDaGlsZCk6bi5hcHBlbmRDaGlsZChlKSx0aGlzfSxyZW1vdmVGcm9tOmZ1bmN0aW9uKHQpe3ZhciBlPXRoaXMuZ2V0UG9zaXRpb24oKSxpPXQuX2NvbnRyb2xDb3JuZXJzW2VdO3JldHVybiBpLnJlbW92ZUNoaWxkKHRoaXMuX2NvbnRhaW5lciksdGhpcy5fbWFwPW51bGwsdGhpcy5vblJlbW92ZSYmdGhpcy5vblJlbW92ZSh0KSx0aGlzfX0pLG8uY29udHJvbD1mdW5jdGlvbih0KXtyZXR1cm4gbmV3IG8uQ29udHJvbCh0KX0sby5NYXAuaW5jbHVkZSh7YWRkQ29udHJvbDpmdW5jdGlvbih0KXtyZXR1cm4gdC5hZGRUbyh0aGlzKSx0aGlzfSxyZW1vdmVDb250cm9sOmZ1bmN0aW9uKHQpe3JldHVybiB0LnJlbW92ZUZyb20odGhpcyksdGhpc30sX2luaXRDb250cm9sUG9zOmZ1bmN0aW9uKCl7ZnVuY3Rpb24gdCh0LHMpe3ZhciBhPWkrdCtcIiBcIitpK3M7ZVt0K3NdPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixhLG4pfXZhciBlPXRoaXMuX2NvbnRyb2xDb3JuZXJzPXt9LGk9XCJsZWFmbGV0LVwiLG49dGhpcy5fY29udHJvbENvbnRhaW5lcj1vLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsaStcImNvbnRyb2wtY29udGFpbmVyXCIsdGhpcy5fY29udGFpbmVyKTt0KFwidG9wXCIsXCJsZWZ0XCIpLHQoXCJ0b3BcIixcInJpZ2h0XCIpLHQoXCJib3R0b21cIixcImxlZnRcIiksdChcImJvdHRvbVwiLFwicmlnaHRcIil9LF9jbGVhckNvbnRyb2xQb3M6ZnVuY3Rpb24oKXt0aGlzLl9jb250YWluZXIucmVtb3ZlQ2hpbGQodGhpcy5fY29udHJvbENvbnRhaW5lcil9fSksby5Db250cm9sLlpvb209by5Db250cm9sLmV4dGVuZCh7b3B0aW9uczp7cG9zaXRpb246XCJ0b3BsZWZ0XCJ9LG9uQWRkOmZ1bmN0aW9uKHQpe3ZhciBlPVwibGVhZmxldC1jb250cm9sLXpvb21cIixpPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixlK1wiIGxlYWZsZXQtYmFyXCIpO3JldHVybiB0aGlzLl9tYXA9dCx0aGlzLl96b29tSW5CdXR0b249dGhpcy5fY3JlYXRlQnV0dG9uKFwiK1wiLFwiWm9vbSBpblwiLGUrXCItaW5cIixpLHRoaXMuX3pvb21Jbix0aGlzKSx0aGlzLl96b29tT3V0QnV0dG9uPXRoaXMuX2NyZWF0ZUJ1dHRvbihcIi1cIixcIlpvb20gb3V0XCIsZStcIi1vdXRcIixpLHRoaXMuX3pvb21PdXQsdGhpcyksdC5vbihcInpvb21lbmQgem9vbWxldmVsc2NoYW5nZVwiLHRoaXMuX3VwZGF0ZURpc2FibGVkLHRoaXMpLGl9LG9uUmVtb3ZlOmZ1bmN0aW9uKHQpe3Qub2ZmKFwiem9vbWVuZCB6b29tbGV2ZWxzY2hhbmdlXCIsdGhpcy5fdXBkYXRlRGlzYWJsZWQsdGhpcyl9LF96b29tSW46ZnVuY3Rpb24odCl7dGhpcy5fbWFwLnpvb21Jbih0LnNoaWZ0S2V5PzM6MSl9LF96b29tT3V0OmZ1bmN0aW9uKHQpe3RoaXMuX21hcC56b29tT3V0KHQuc2hpZnRLZXk/MzoxKX0sX2NyZWF0ZUJ1dHRvbjpmdW5jdGlvbih0LGUsaSxuLHMsYSl7dmFyIHI9by5Eb21VdGlsLmNyZWF0ZShcImFcIixpLG4pO3IuaW5uZXJIVE1MPXQsci5ocmVmPVwiI1wiLHIudGl0bGU9ZTt2YXIgaD1vLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbjtyZXR1cm4gby5Eb21FdmVudC5vbihyLFwiY2xpY2tcIixoKS5vbihyLFwibW91c2Vkb3duXCIsaCkub24ocixcImRibGNsaWNrXCIsaCkub24ocixcImNsaWNrXCIsby5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCkub24ocixcImNsaWNrXCIscyxhKSxyfSxfdXBkYXRlRGlzYWJsZWQ6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9tYXAsZT1cImxlYWZsZXQtZGlzYWJsZWRcIjtvLkRvbVV0aWwucmVtb3ZlQ2xhc3ModGhpcy5fem9vbUluQnV0dG9uLGUpLG8uRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLl96b29tT3V0QnV0dG9uLGUpLHQuX3pvb209PT10LmdldE1pblpvb20oKSYmby5Eb21VdGlsLmFkZENsYXNzKHRoaXMuX3pvb21PdXRCdXR0b24sZSksdC5fem9vbT09PXQuZ2V0TWF4Wm9vbSgpJiZvLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fem9vbUluQnV0dG9uLGUpfX0pLG8uTWFwLm1lcmdlT3B0aW9ucyh7em9vbUNvbnRyb2w6ITB9KSxvLk1hcC5hZGRJbml0SG9vayhmdW5jdGlvbigpe3RoaXMub3B0aW9ucy56b29tQ29udHJvbCYmKHRoaXMuem9vbUNvbnRyb2w9bmV3IG8uQ29udHJvbC5ab29tLHRoaXMuYWRkQ29udHJvbCh0aGlzLnpvb21Db250cm9sKSl9KSxvLmNvbnRyb2wuem9vbT1mdW5jdGlvbih0KXtyZXR1cm4gbmV3IG8uQ29udHJvbC5ab29tKHQpfSxvLkNvbnRyb2wuQXR0cmlidXRpb249by5Db250cm9sLmV4dGVuZCh7b3B0aW9uczp7cG9zaXRpb246XCJib3R0b21yaWdodFwiLHByZWZpeDonPGEgaHJlZj1cImh0dHA6Ly9sZWFmbGV0anMuY29tXCIgdGl0bGU9XCJBIEpTIGxpYnJhcnkgZm9yIGludGVyYWN0aXZlIG1hcHNcIj5MZWFmbGV0PC9hPid9LGluaXRpYWxpemU6ZnVuY3Rpb24odCl7by5zZXRPcHRpb25zKHRoaXMsdCksdGhpcy5fYXR0cmlidXRpb25zPXt9fSxvbkFkZDpmdW5jdGlvbih0KXtyZXR1cm4gdGhpcy5fY29udGFpbmVyPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixcImxlYWZsZXQtY29udHJvbC1hdHRyaWJ1dGlvblwiKSxvLkRvbUV2ZW50LmRpc2FibGVDbGlja1Byb3BhZ2F0aW9uKHRoaXMuX2NvbnRhaW5lciksdC5vbihcImxheWVyYWRkXCIsdGhpcy5fb25MYXllckFkZCx0aGlzKS5vbihcImxheWVycmVtb3ZlXCIsdGhpcy5fb25MYXllclJlbW92ZSx0aGlzKSx0aGlzLl91cGRhdGUoKSx0aGlzLl9jb250YWluZXJ9LG9uUmVtb3ZlOmZ1bmN0aW9uKHQpe3Qub2ZmKFwibGF5ZXJhZGRcIix0aGlzLl9vbkxheWVyQWRkKS5vZmYoXCJsYXllcnJlbW92ZVwiLHRoaXMuX29uTGF5ZXJSZW1vdmUpfSxzZXRQcmVmaXg6ZnVuY3Rpb24odCl7cmV0dXJuIHRoaXMub3B0aW9ucy5wcmVmaXg9dCx0aGlzLl91cGRhdGUoKSx0aGlzfSxhZGRBdHRyaWJ1dGlvbjpmdW5jdGlvbih0KXtyZXR1cm4gdD8odGhpcy5fYXR0cmlidXRpb25zW3RdfHwodGhpcy5fYXR0cmlidXRpb25zW3RdPTApLHRoaXMuX2F0dHJpYnV0aW9uc1t0XSsrLHRoaXMuX3VwZGF0ZSgpLHRoaXMpOnZvaWQgMH0scmVtb3ZlQXR0cmlidXRpb246ZnVuY3Rpb24odCl7cmV0dXJuIHQ/KHRoaXMuX2F0dHJpYnV0aW9uc1t0XSYmKHRoaXMuX2F0dHJpYnV0aW9uc1t0XS0tLHRoaXMuX3VwZGF0ZSgpKSx0aGlzKTp2b2lkIDB9LF91cGRhdGU6ZnVuY3Rpb24oKXtpZih0aGlzLl9tYXApe3ZhciB0PVtdO2Zvcih2YXIgZSBpbiB0aGlzLl9hdHRyaWJ1dGlvbnMpdGhpcy5fYXR0cmlidXRpb25zW2VdJiZ0LnB1c2goZSk7dmFyIGk9W107dGhpcy5vcHRpb25zLnByZWZpeCYmaS5wdXNoKHRoaXMub3B0aW9ucy5wcmVmaXgpLHQubGVuZ3RoJiZpLnB1c2godC5qb2luKFwiLCBcIikpLHRoaXMuX2NvbnRhaW5lci5pbm5lckhUTUw9aS5qb2luKFwiIHwgXCIpfX0sX29uTGF5ZXJBZGQ6ZnVuY3Rpb24odCl7dC5sYXllci5nZXRBdHRyaWJ1dGlvbiYmdGhpcy5hZGRBdHRyaWJ1dGlvbih0LmxheWVyLmdldEF0dHJpYnV0aW9uKCkpfSxfb25MYXllclJlbW92ZTpmdW5jdGlvbih0KXt0LmxheWVyLmdldEF0dHJpYnV0aW9uJiZ0aGlzLnJlbW92ZUF0dHJpYnV0aW9uKHQubGF5ZXIuZ2V0QXR0cmlidXRpb24oKSl9fSksby5NYXAubWVyZ2VPcHRpb25zKHthdHRyaWJ1dGlvbkNvbnRyb2w6ITB9KSxvLk1hcC5hZGRJbml0SG9vayhmdW5jdGlvbigpe3RoaXMub3B0aW9ucy5hdHRyaWJ1dGlvbkNvbnRyb2wmJih0aGlzLmF0dHJpYnV0aW9uQ29udHJvbD0obmV3IG8uQ29udHJvbC5BdHRyaWJ1dGlvbikuYWRkVG8odGhpcykpfSksby5jb250cm9sLmF0dHJpYnV0aW9uPWZ1bmN0aW9uKHQpe3JldHVybiBuZXcgby5Db250cm9sLkF0dHJpYnV0aW9uKHQpfSxvLkNvbnRyb2wuU2NhbGU9by5Db250cm9sLmV4dGVuZCh7b3B0aW9uczp7cG9zaXRpb246XCJib3R0b21sZWZ0XCIsbWF4V2lkdGg6MTAwLG1ldHJpYzohMCxpbXBlcmlhbDohMCx1cGRhdGVXaGVuSWRsZTohMX0sb25BZGQ6ZnVuY3Rpb24odCl7dGhpcy5fbWFwPXQ7dmFyIGU9XCJsZWFmbGV0LWNvbnRyb2wtc2NhbGVcIixpPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIixlKSxuPXRoaXMub3B0aW9ucztyZXR1cm4gdGhpcy5fYWRkU2NhbGVzKG4sZSxpKSx0Lm9uKG4udXBkYXRlV2hlbklkbGU/XCJtb3ZlZW5kXCI6XCJtb3ZlXCIsdGhpcy5fdXBkYXRlLHRoaXMpLHQud2hlblJlYWR5KHRoaXMuX3VwZGF0ZSx0aGlzKSxpfSxvblJlbW92ZTpmdW5jdGlvbih0KXt0Lm9mZih0aGlzLm9wdGlvbnMudXBkYXRlV2hlbklkbGU/XCJtb3ZlZW5kXCI6XCJtb3ZlXCIsdGhpcy5fdXBkYXRlLHRoaXMpfSxfYWRkU2NhbGVzOmZ1bmN0aW9uKHQsZSxpKXt0Lm1ldHJpYyYmKHRoaXMuX21TY2FsZT1vLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsZStcIi1saW5lXCIsaSkpLHQuaW1wZXJpYWwmJih0aGlzLl9pU2NhbGU9by5Eb21VdGlsLmNyZWF0ZShcImRpdlwiLGUrXCItbGluZVwiLGkpKX0sX3VwZGF0ZTpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX21hcC5nZXRCb3VuZHMoKSxlPXQuZ2V0Q2VudGVyKCkubGF0LGk9NjM3ODEzNypNYXRoLlBJKk1hdGguY29zKGUqTWF0aC5QSS8xODApLG49aSoodC5nZXROb3J0aEVhc3QoKS5sbmctdC5nZXRTb3V0aFdlc3QoKS5sbmcpLzE4MCxvPXRoaXMuX21hcC5nZXRTaXplKCkscz10aGlzLm9wdGlvbnMsYT0wO28ueD4wJiYoYT1uKihzLm1heFdpZHRoL28ueCkpLHRoaXMuX3VwZGF0ZVNjYWxlcyhzLGEpfSxfdXBkYXRlU2NhbGVzOmZ1bmN0aW9uKHQsZSl7dC5tZXRyaWMmJmUmJnRoaXMuX3VwZGF0ZU1ldHJpYyhlKSx0LmltcGVyaWFsJiZlJiZ0aGlzLl91cGRhdGVJbXBlcmlhbChlKX0sX3VwZGF0ZU1ldHJpYzpmdW5jdGlvbih0KXt2YXIgZT10aGlzLl9nZXRSb3VuZE51bSh0KTt0aGlzLl9tU2NhbGUuc3R5bGUud2lkdGg9dGhpcy5fZ2V0U2NhbGVXaWR0aChlL3QpK1wicHhcIix0aGlzLl9tU2NhbGUuaW5uZXJIVE1MPTFlMz5lP2UrXCIgbVwiOmUvMWUzK1wiIGttXCJ9LF91cGRhdGVJbXBlcmlhbDpmdW5jdGlvbih0KXt2YXIgZSxpLG4sbz0zLjI4MDgzOTkqdCxzPXRoaXMuX2lTY2FsZTtvPjUyODA/KGU9by81MjgwLGk9dGhpcy5fZ2V0Um91bmROdW0oZSkscy5zdHlsZS53aWR0aD10aGlzLl9nZXRTY2FsZVdpZHRoKGkvZSkrXCJweFwiLHMuaW5uZXJIVE1MPWkrXCIgbWlcIik6KG49dGhpcy5fZ2V0Um91bmROdW0obykscy5zdHlsZS53aWR0aD10aGlzLl9nZXRTY2FsZVdpZHRoKG4vbykrXCJweFwiLHMuaW5uZXJIVE1MPW4rXCIgZnRcIil9LF9nZXRTY2FsZVdpZHRoOmZ1bmN0aW9uKHQpe3JldHVybiBNYXRoLnJvdW5kKHRoaXMub3B0aW9ucy5tYXhXaWR0aCp0KS0xMH0sX2dldFJvdW5kTnVtOmZ1bmN0aW9uKHQpe3ZhciBlPU1hdGgucG93KDEwLChNYXRoLmZsb29yKHQpK1wiXCIpLmxlbmd0aC0xKSxpPXQvZTtyZXR1cm4gaT1pPj0xMD8xMDppPj01PzU6aT49Mz8zOmk+PTI/MjoxLGUqaX19KSxvLmNvbnRyb2wuc2NhbGU9ZnVuY3Rpb24odCl7cmV0dXJuIG5ldyBvLkNvbnRyb2wuU2NhbGUodCl9LG8uQ29udHJvbC5MYXllcnM9by5Db250cm9sLmV4dGVuZCh7b3B0aW9uczp7Y29sbGFwc2VkOiEwLHBvc2l0aW9uOlwidG9wcmlnaHRcIixhdXRvWkluZGV4OiEwfSxpbml0aWFsaXplOmZ1bmN0aW9uKHQsZSxpKXtvLnNldE9wdGlvbnModGhpcyxpKSx0aGlzLl9sYXllcnM9e30sdGhpcy5fbGFzdFpJbmRleD0wLHRoaXMuX2hhbmRsaW5nQ2xpY2s9ITE7Zm9yKHZhciBuIGluIHQpdGhpcy5fYWRkTGF5ZXIodFtuXSxuKTtmb3IobiBpbiBlKXRoaXMuX2FkZExheWVyKGVbbl0sbiwhMCl9LG9uQWRkOmZ1bmN0aW9uKHQpe3JldHVybiB0aGlzLl9pbml0TGF5b3V0KCksdGhpcy5fdXBkYXRlKCksdC5vbihcImxheWVyYWRkXCIsdGhpcy5fb25MYXllckNoYW5nZSx0aGlzKS5vbihcImxheWVycmVtb3ZlXCIsdGhpcy5fb25MYXllckNoYW5nZSx0aGlzKSx0aGlzLl9jb250YWluZXJ9LG9uUmVtb3ZlOmZ1bmN0aW9uKHQpe3Qub2ZmKFwibGF5ZXJhZGRcIix0aGlzLl9vbkxheWVyQ2hhbmdlKS5vZmYoXCJsYXllcnJlbW92ZVwiLHRoaXMuX29uTGF5ZXJDaGFuZ2UpfSxhZGRCYXNlTGF5ZXI6ZnVuY3Rpb24odCxlKXtyZXR1cm4gdGhpcy5fYWRkTGF5ZXIodCxlKSx0aGlzLl91cGRhdGUoKSx0aGlzfSxhZGRPdmVybGF5OmZ1bmN0aW9uKHQsZSl7cmV0dXJuIHRoaXMuX2FkZExheWVyKHQsZSwhMCksdGhpcy5fdXBkYXRlKCksdGhpc30scmVtb3ZlTGF5ZXI6ZnVuY3Rpb24odCl7dmFyIGU9by5zdGFtcCh0KTtyZXR1cm4gZGVsZXRlIHRoaXMuX2xheWVyc1tlXSx0aGlzLl91cGRhdGUoKSx0aGlzfSxfaW5pdExheW91dDpmdW5jdGlvbigpe3ZhciB0PVwibGVhZmxldC1jb250cm9sLWxheWVyc1wiLGU9dGhpcy5fY29udGFpbmVyPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIix0KTtlLnNldEF0dHJpYnV0ZShcImFyaWEtaGFzcG9wdXBcIiwhMCksby5Ccm93c2VyLnRvdWNoP28uRG9tRXZlbnQub24oZSxcImNsaWNrXCIsby5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pOihvLkRvbUV2ZW50LmRpc2FibGVDbGlja1Byb3BhZ2F0aW9uKGUpLG8uRG9tRXZlbnQub24oZSxcIm1vdXNld2hlZWxcIixvLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbikpO3ZhciBpPXRoaXMuX2Zvcm09by5Eb21VdGlsLmNyZWF0ZShcImZvcm1cIix0K1wiLWxpc3RcIik7aWYodGhpcy5vcHRpb25zLmNvbGxhcHNlZCl7by5Ccm93c2VyLmFuZHJvaWR8fG8uRG9tRXZlbnQub24oZSxcIm1vdXNlb3ZlclwiLHRoaXMuX2V4cGFuZCx0aGlzKS5vbihlLFwibW91c2VvdXRcIix0aGlzLl9jb2xsYXBzZSx0aGlzKTt2YXIgbj10aGlzLl9sYXllcnNMaW5rPW8uRG9tVXRpbC5jcmVhdGUoXCJhXCIsdCtcIi10b2dnbGVcIixlKTtuLmhyZWY9XCIjXCIsbi50aXRsZT1cIkxheWVyc1wiLG8uQnJvd3Nlci50b3VjaD9vLkRvbUV2ZW50Lm9uKG4sXCJjbGlja1wiLG8uRG9tRXZlbnQuc3RvcCkub24obixcImNsaWNrXCIsdGhpcy5fZXhwYW5kLHRoaXMpOm8uRG9tRXZlbnQub24obixcImZvY3VzXCIsdGhpcy5fZXhwYW5kLHRoaXMpLHRoaXMuX21hcC5vbihcImNsaWNrXCIsdGhpcy5fY29sbGFwc2UsdGhpcyl9ZWxzZSB0aGlzLl9leHBhbmQoKTt0aGlzLl9iYXNlTGF5ZXJzTGlzdD1vLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsdCtcIi1iYXNlXCIsaSksdGhpcy5fc2VwYXJhdG9yPW8uRG9tVXRpbC5jcmVhdGUoXCJkaXZcIix0K1wiLXNlcGFyYXRvclwiLGkpLHRoaXMuX292ZXJsYXlzTGlzdD1vLkRvbVV0aWwuY3JlYXRlKFwiZGl2XCIsdCtcIi1vdmVybGF5c1wiLGkpLGUuYXBwZW5kQ2hpbGQoaSl9LF9hZGRMYXllcjpmdW5jdGlvbih0LGUsaSl7dmFyIG49by5zdGFtcCh0KTt0aGlzLl9sYXllcnNbbl09e2xheWVyOnQsbmFtZTplLG92ZXJsYXk6aX0sdGhpcy5vcHRpb25zLmF1dG9aSW5kZXgmJnQuc2V0WkluZGV4JiYodGhpcy5fbGFzdFpJbmRleCsrLHQuc2V0WkluZGV4KHRoaXMuX2xhc3RaSW5kZXgpKX0sX3VwZGF0ZTpmdW5jdGlvbigpe2lmKHRoaXMuX2NvbnRhaW5lcil7dGhpcy5fYmFzZUxheWVyc0xpc3QuaW5uZXJIVE1MPVwiXCIsdGhpcy5fb3ZlcmxheXNMaXN0LmlubmVySFRNTD1cIlwiO3ZhciB0LGUsaT0hMSxuPSExO2Zvcih0IGluIHRoaXMuX2xheWVycyllPXRoaXMuX2xheWVyc1t0XSx0aGlzLl9hZGRJdGVtKGUpLG49bnx8ZS5vdmVybGF5LGk9aXx8IWUub3ZlcmxheTt0aGlzLl9zZXBhcmF0b3Iuc3R5bGUuZGlzcGxheT1uJiZpP1wiXCI6XCJub25lXCJ9fSxfb25MYXllckNoYW5nZTpmdW5jdGlvbih0KXt2YXIgZT10aGlzLl9sYXllcnNbby5zdGFtcCh0LmxheWVyKV07aWYoZSl7dGhpcy5faGFuZGxpbmdDbGlja3x8dGhpcy5fdXBkYXRlKCk7dmFyIGk9ZS5vdmVybGF5P1wibGF5ZXJhZGRcIj09PXQudHlwZT9cIm92ZXJsYXlhZGRcIjpcIm92ZXJsYXlyZW1vdmVcIjpcImxheWVyYWRkXCI9PT10LnR5cGU/XCJiYXNlbGF5ZXJjaGFuZ2VcIjpudWxsO2kmJnRoaXMuX21hcC5maXJlKGksZSl9fSxfY3JlYXRlUmFkaW9FbGVtZW50OmZ1bmN0aW9uKHQsaSl7dmFyIG49JzxpbnB1dCB0eXBlPVwicmFkaW9cIiBjbGFzcz1cImxlYWZsZXQtY29udHJvbC1sYXllcnMtc2VsZWN0b3JcIiBuYW1lPVwiJyt0KydcIic7aSYmKG4rPScgY2hlY2tlZD1cImNoZWNrZWRcIicpLG4rPVwiLz5cIjt2YXIgbz1lLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7cmV0dXJuIG8uaW5uZXJIVE1MPW4sby5maXJzdENoaWxkfSxfYWRkSXRlbTpmdW5jdGlvbih0KXt2YXIgaSxuPWUuY3JlYXRlRWxlbWVudChcImxhYmVsXCIpLHM9dGhpcy5fbWFwLmhhc0xheWVyKHQubGF5ZXIpO3Qub3ZlcmxheT8oaT1lLmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKSxpLnR5cGU9XCJjaGVja2JveFwiLGkuY2xhc3NOYW1lPVwibGVhZmxldC1jb250cm9sLWxheWVycy1zZWxlY3RvclwiLGkuZGVmYXVsdENoZWNrZWQ9cyk6aT10aGlzLl9jcmVhdGVSYWRpb0VsZW1lbnQoXCJsZWFmbGV0LWJhc2UtbGF5ZXJzXCIscyksaS5sYXllcklkPW8uc3RhbXAodC5sYXllciksby5Eb21FdmVudC5vbihpLFwiY2xpY2tcIix0aGlzLl9vbklucHV0Q2xpY2ssdGhpcyk7dmFyIGE9ZS5jcmVhdGVFbGVtZW50KFwic3BhblwiKTthLmlubmVySFRNTD1cIiBcIit0Lm5hbWUsbi5hcHBlbmRDaGlsZChpKSxuLmFwcGVuZENoaWxkKGEpO3ZhciByPXQub3ZlcmxheT90aGlzLl9vdmVybGF5c0xpc3Q6dGhpcy5fYmFzZUxheWVyc0xpc3Q7cmV0dXJuIHIuYXBwZW5kQ2hpbGQobiksbn0sX29uSW5wdXRDbGljazpmdW5jdGlvbigpe3ZhciB0LGUsaSxuPXRoaXMuX2Zvcm0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJpbnB1dFwiKSxvPW4ubGVuZ3RoO2Zvcih0aGlzLl9oYW5kbGluZ0NsaWNrPSEwLHQ9MDtvPnQ7dCsrKWU9blt0XSxpPXRoaXMuX2xheWVyc1tlLmxheWVySWRdLGUuY2hlY2tlZCYmIXRoaXMuX21hcC5oYXNMYXllcihpLmxheWVyKT90aGlzLl9tYXAuYWRkTGF5ZXIoaS5sYXllcik6IWUuY2hlY2tlZCYmdGhpcy5fbWFwLmhhc0xheWVyKGkubGF5ZXIpJiZ0aGlzLl9tYXAucmVtb3ZlTGF5ZXIoaS5sYXllcik7dGhpcy5faGFuZGxpbmdDbGljaz0hMX0sX2V4cGFuZDpmdW5jdGlvbigpe28uRG9tVXRpbC5hZGRDbGFzcyh0aGlzLl9jb250YWluZXIsXCJsZWFmbGV0LWNvbnRyb2wtbGF5ZXJzLWV4cGFuZGVkXCIpfSxfY29sbGFwc2U6ZnVuY3Rpb24oKXt0aGlzLl9jb250YWluZXIuY2xhc3NOYW1lPXRoaXMuX2NvbnRhaW5lci5jbGFzc05hbWUucmVwbGFjZShcIiBsZWFmbGV0LWNvbnRyb2wtbGF5ZXJzLWV4cGFuZGVkXCIsXCJcIil9fSksby5jb250cm9sLmxheWVycz1mdW5jdGlvbih0LGUsaSl7cmV0dXJuIG5ldyBvLkNvbnRyb2wuTGF5ZXJzKHQsZSxpKX0sby5Qb3NBbmltYXRpb249by5DbGFzcy5leHRlbmQoe2luY2x1ZGVzOm8uTWl4aW4uRXZlbnRzLHJ1bjpmdW5jdGlvbih0LGUsaSxuKXt0aGlzLnN0b3AoKSx0aGlzLl9lbD10LHRoaXMuX2luUHJvZ3Jlc3M9ITAsdGhpcy5fbmV3UG9zPWUsdGhpcy5maXJlKFwic3RhcnRcIiksdC5zdHlsZVtvLkRvbVV0aWwuVFJBTlNJVElPTl09XCJhbGwgXCIrKGl8fC4yNSkrXCJzIGN1YmljLWJlemllcigwLDAsXCIrKG58fC41KStcIiwxKVwiLG8uRG9tRXZlbnQub24odCxvLkRvbVV0aWwuVFJBTlNJVElPTl9FTkQsdGhpcy5fb25UcmFuc2l0aW9uRW5kLHRoaXMpLG8uRG9tVXRpbC5zZXRQb3NpdGlvbih0LGUpLG8uVXRpbC5mYWxzZUZuKHQub2Zmc2V0V2lkdGgpLHRoaXMuX3N0ZXBUaW1lcj1zZXRJbnRlcnZhbChvLmJpbmQodGhpcy5fb25TdGVwLHRoaXMpLDUwKX0sc3RvcDpmdW5jdGlvbigpe3RoaXMuX2luUHJvZ3Jlc3MmJihvLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fZWwsdGhpcy5fZ2V0UG9zKCkpLHRoaXMuX29uVHJhbnNpdGlvbkVuZCgpLG8uVXRpbC5mYWxzZUZuKHRoaXMuX2VsLm9mZnNldFdpZHRoKSl9LF9vblN0ZXA6ZnVuY3Rpb24oKXt2YXIgdD10aGlzLl9nZXRQb3MoKTtyZXR1cm4gdD8odGhpcy5fZWwuX2xlYWZsZXRfcG9zPXQsdGhpcy5maXJlKFwic3RlcFwiKSx2b2lkIDApOih0aGlzLl9vblRyYW5zaXRpb25FbmQoKSx2b2lkIDApfSxfdHJhbnNmb3JtUmU6LyhbLStdPyg/OlxcZCpcXC4pP1xcZCspXFxEKiwgKFstK10/KD86XFxkKlxcLik/XFxkKylcXEQqXFwpLyxfZ2V0UG9zOmZ1bmN0aW9uKCl7dmFyIGUsaSxuLHM9dGhpcy5fZWwsYT10LmdldENvbXB1dGVkU3R5bGUocyk7aWYoby5Ccm93c2VyLmFueTNkKXtpZihuPWFbby5Eb21VdGlsLlRSQU5TRk9STV0ubWF0Y2godGhpcy5fdHJhbnNmb3JtUmUpLCFuKXJldHVybjtlPXBhcnNlRmxvYXQoblsxXSksaT1wYXJzZUZsb2F0KG5bMl0pfWVsc2UgZT1wYXJzZUZsb2F0KGEubGVmdCksaT1wYXJzZUZsb2F0KGEudG9wKTtyZXR1cm4gbmV3IG8uUG9pbnQoZSxpLCEwKX0sX29uVHJhbnNpdGlvbkVuZDpmdW5jdGlvbigpe28uRG9tRXZlbnQub2ZmKHRoaXMuX2VsLG8uRG9tVXRpbC5UUkFOU0lUSU9OX0VORCx0aGlzLl9vblRyYW5zaXRpb25FbmQsdGhpcyksdGhpcy5faW5Qcm9ncmVzcyYmKHRoaXMuX2luUHJvZ3Jlc3M9ITEsdGhpcy5fZWwuc3R5bGVbby5Eb21VdGlsLlRSQU5TSVRJT05dPVwiXCIsdGhpcy5fZWwuX2xlYWZsZXRfcG9zPXRoaXMuX25ld1BvcyxjbGVhckludGVydmFsKHRoaXMuX3N0ZXBUaW1lciksdGhpcy5maXJlKFwic3RlcFwiKS5maXJlKFwiZW5kXCIpKX19KSxvLk1hcC5pbmNsdWRlKHtzZXRWaWV3OmZ1bmN0aW9uKHQsZSxuKXtpZihlPXRoaXMuX2xpbWl0Wm9vbShlKSx0PW8ubGF0TG5nKHQpLG49bnx8e30sdGhpcy5fcGFuQW5pbSYmdGhpcy5fcGFuQW5pbS5zdG9wKCksdGhpcy5fbG9hZGVkJiYhbi5yZXNldCYmbiE9PSEwKXtuLmFuaW1hdGUhPT1pJiYobi56b29tPW8uZXh0ZW5kKHthbmltYXRlOm4uYW5pbWF0ZX0sbi56b29tKSxuLnBhbj1vLmV4dGVuZCh7YW5pbWF0ZTpuLmFuaW1hdGV9LG4ucGFuKSk7dmFyIHM9dGhpcy5fem9vbSE9PWU/dGhpcy5fdHJ5QW5pbWF0ZWRab29tJiZ0aGlzLl90cnlBbmltYXRlZFpvb20odCxlLG4uem9vbSk6dGhpcy5fdHJ5QW5pbWF0ZWRQYW4odCxuLnBhbik7aWYocylyZXR1cm4gY2xlYXJUaW1lb3V0KHRoaXMuX3NpemVUaW1lciksdGhpc31yZXR1cm4gdGhpcy5fcmVzZXRWaWV3KHQsZSksdGhpc30scGFuQnk6ZnVuY3Rpb24odCxlKXtpZih0PW8ucG9pbnQodCkucm91bmQoKSxlPWV8fHt9LCF0LngmJiF0LnkpcmV0dXJuIHRoaXM7aWYodGhpcy5fcGFuQW5pbXx8KHRoaXMuX3BhbkFuaW09bmV3IG8uUG9zQW5pbWF0aW9uLHRoaXMuX3BhbkFuaW0ub24oe3N0ZXA6dGhpcy5fb25QYW5UcmFuc2l0aW9uU3RlcCxlbmQ6dGhpcy5fb25QYW5UcmFuc2l0aW9uRW5kfSx0aGlzKSksZS5ub01vdmVTdGFydHx8dGhpcy5maXJlKFwibW92ZXN0YXJ0XCIpLGUuYW5pbWF0ZSE9PSExKXtvLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fbWFwUGFuZSxcImxlYWZsZXQtcGFuLWFuaW1cIik7dmFyIGk9dGhpcy5fZ2V0TWFwUGFuZVBvcygpLnN1YnRyYWN0KHQpO3RoaXMuX3BhbkFuaW0ucnVuKHRoaXMuX21hcFBhbmUsaSxlLmR1cmF0aW9ufHwuMjUsZS5lYXNlTGluZWFyaXR5KX1lbHNlIHRoaXMuX3Jhd1BhbkJ5KHQpLHRoaXMuZmlyZShcIm1vdmVcIikuZmlyZShcIm1vdmVlbmRcIik7cmV0dXJuIHRoaXN9LF9vblBhblRyYW5zaXRpb25TdGVwOmZ1bmN0aW9uKCl7dGhpcy5maXJlKFwibW92ZVwiKX0sX29uUGFuVHJhbnNpdGlvbkVuZDpmdW5jdGlvbigpe28uRG9tVXRpbC5yZW1vdmVDbGFzcyh0aGlzLl9tYXBQYW5lLFwibGVhZmxldC1wYW4tYW5pbVwiKSx0aGlzLmZpcmUoXCJtb3ZlZW5kXCIpfSxfdHJ5QW5pbWF0ZWRQYW46ZnVuY3Rpb24odCxlKXt2YXIgaT10aGlzLl9nZXRDZW50ZXJPZmZzZXQodCkuX2Zsb29yKCk7cmV0dXJuKGUmJmUuYW5pbWF0ZSk9PT0hMHx8dGhpcy5nZXRTaXplKCkuY29udGFpbnMoaSk/KHRoaXMucGFuQnkoaSxlKSwhMCk6ITF9fSksby5Qb3NBbmltYXRpb249by5Eb21VdGlsLlRSQU5TSVRJT04/by5Qb3NBbmltYXRpb246by5Qb3NBbmltYXRpb24uZXh0ZW5kKHtydW46ZnVuY3Rpb24odCxlLGksbil7dGhpcy5zdG9wKCksdGhpcy5fZWw9dCx0aGlzLl9pblByb2dyZXNzPSEwLHRoaXMuX2R1cmF0aW9uPWl8fC4yNSx0aGlzLl9lYXNlT3V0UG93ZXI9MS9NYXRoLm1heChufHwuNSwuMiksdGhpcy5fc3RhcnRQb3M9by5Eb21VdGlsLmdldFBvc2l0aW9uKHQpLHRoaXMuX29mZnNldD1lLnN1YnRyYWN0KHRoaXMuX3N0YXJ0UG9zKSx0aGlzLl9zdGFydFRpbWU9K25ldyBEYXRlLHRoaXMuZmlyZShcInN0YXJ0XCIpLHRoaXMuX2FuaW1hdGUoKX0sc3RvcDpmdW5jdGlvbigpe3RoaXMuX2luUHJvZ3Jlc3MmJih0aGlzLl9zdGVwKCksdGhpcy5fY29tcGxldGUoKSl9LF9hbmltYXRlOmZ1bmN0aW9uKCl7dGhpcy5fYW5pbUlkPW8uVXRpbC5yZXF1ZXN0QW5pbUZyYW1lKHRoaXMuX2FuaW1hdGUsdGhpcyksdGhpcy5fc3RlcCgpfSxfc3RlcDpmdW5jdGlvbigpe3ZhciB0PStuZXcgRGF0ZS10aGlzLl9zdGFydFRpbWUsZT0xZTMqdGhpcy5fZHVyYXRpb247ZT50P3RoaXMuX3J1bkZyYW1lKHRoaXMuX2Vhc2VPdXQodC9lKSk6KHRoaXMuX3J1bkZyYW1lKDEpLHRoaXMuX2NvbXBsZXRlKCkpfSxfcnVuRnJhbWU6ZnVuY3Rpb24odCl7dmFyIGU9dGhpcy5fc3RhcnRQb3MuYWRkKHRoaXMuX29mZnNldC5tdWx0aXBseUJ5KHQpKTtvLkRvbVV0aWwuc2V0UG9zaXRpb24odGhpcy5fZWwsZSksdGhpcy5maXJlKFwic3RlcFwiKX0sX2NvbXBsZXRlOmZ1bmN0aW9uKCl7by5VdGlsLmNhbmNlbEFuaW1GcmFtZSh0aGlzLl9hbmltSWQpLHRoaXMuX2luUHJvZ3Jlc3M9ITEsdGhpcy5maXJlKFwiZW5kXCIpfSxfZWFzZU91dDpmdW5jdGlvbih0KXtyZXR1cm4gMS1NYXRoLnBvdygxLXQsdGhpcy5fZWFzZU91dFBvd2VyKX19KSxvLk1hcC5tZXJnZU9wdGlvbnMoe3pvb21BbmltYXRpb246ITAsem9vbUFuaW1hdGlvblRocmVzaG9sZDo0fSksby5Eb21VdGlsLlRSQU5TSVRJT04mJm8uTWFwLmFkZEluaXRIb29rKGZ1bmN0aW9uKCl7dGhpcy5fem9vbUFuaW1hdGVkPXRoaXMub3B0aW9ucy56b29tQW5pbWF0aW9uJiZvLkRvbVV0aWwuVFJBTlNJVElPTiYmby5Ccm93c2VyLmFueTNkJiYhby5Ccm93c2VyLmFuZHJvaWQyMyYmIW8uQnJvd3Nlci5tb2JpbGVPcGVyYSx0aGlzLl96b29tQW5pbWF0ZWQmJm8uRG9tRXZlbnQub24odGhpcy5fbWFwUGFuZSxvLkRvbVV0aWwuVFJBTlNJVElPTl9FTkQsdGhpcy5fY2F0Y2hUcmFuc2l0aW9uRW5kLHRoaXMpfSksby5NYXAuaW5jbHVkZShvLkRvbVV0aWwuVFJBTlNJVElPTj97X2NhdGNoVHJhbnNpdGlvbkVuZDpmdW5jdGlvbigpe3RoaXMuX2FuaW1hdGluZ1pvb20mJnRoaXMuX29uWm9vbVRyYW5zaXRpb25FbmQoKX0sX25vdGhpbmdUb0FuaW1hdGU6ZnVuY3Rpb24oKXtyZXR1cm4hdGhpcy5fY29udGFpbmVyLmdldEVsZW1lbnRzQnlDbGFzc05hbWUoXCJsZWFmbGV0LXpvb20tYW5pbWF0ZWRcIikubGVuZ3RofSxfdHJ5QW5pbWF0ZWRab29tOmZ1bmN0aW9uKHQsZSxpKXtpZih0aGlzLl9hbmltYXRpbmdab29tKXJldHVybiEwO2lmKGk9aXx8e30sIXRoaXMuX3pvb21BbmltYXRlZHx8aS5hbmltYXRlPT09ITF8fHRoaXMuX25vdGhpbmdUb0FuaW1hdGUoKXx8TWF0aC5hYnMoZS10aGlzLl96b29tKT50aGlzLm9wdGlvbnMuem9vbUFuaW1hdGlvblRocmVzaG9sZClyZXR1cm4hMTt2YXIgbj10aGlzLmdldFpvb21TY2FsZShlKSxvPXRoaXMuX2dldENlbnRlck9mZnNldCh0KS5fZGl2aWRlQnkoMS0xL24pLHM9dGhpcy5fZ2V0Q2VudGVyTGF5ZXJQb2ludCgpLl9hZGQobyk7cmV0dXJuIGkuYW5pbWF0ZT09PSEwfHx0aGlzLmdldFNpemUoKS5jb250YWlucyhvKT8odGhpcy5maXJlKFwibW92ZXN0YXJ0XCIpLmZpcmUoXCJ6b29tc3RhcnRcIiksdGhpcy5fYW5pbWF0ZVpvb20odCxlLHMsbixudWxsLCEwKSwhMCk6ITF9LF9hbmltYXRlWm9vbTpmdW5jdGlvbih0LGUsaSxuLHMsYSl7dGhpcy5fYW5pbWF0aW5nWm9vbT0hMCxvLkRvbVV0aWwuYWRkQ2xhc3ModGhpcy5fbWFwUGFuZSxcImxlYWZsZXQtem9vbS1hbmltXCIpLHRoaXMuX2FuaW1hdGVUb0NlbnRlcj10LHRoaXMuX2FuaW1hdGVUb1pvb209ZSxvLkRyYWdnYWJsZSYmKG8uRHJhZ2dhYmxlLl9kaXNhYmxlZD0hMCksdGhpcy5maXJlKFwiem9vbWFuaW1cIix7Y2VudGVyOnQsem9vbTplLG9yaWdpbjppLHNjYWxlOm4sZGVsdGE6cyxiYWNrd2FyZHM6YX0pfSxfb25ab29tVHJhbnNpdGlvbkVuZDpmdW5jdGlvbigpe3RoaXMuX2FuaW1hdGluZ1pvb209ITEsby5Eb21VdGlsLnJlbW92ZUNsYXNzKHRoaXMuX21hcFBhbmUsXCJsZWFmbGV0LXpvb20tYW5pbVwiKSx0aGlzLl9yZXNldFZpZXcodGhpcy5fYW5pbWF0ZVRvQ2VudGVyLHRoaXMuX2FuaW1hdGVUb1pvb20sITAsITApLG8uRHJhZ2dhYmxlJiYoby5EcmFnZ2FibGUuX2Rpc2FibGVkPSExKX19Ont9KSxvLlRpbGVMYXllci5pbmNsdWRlKHtfYW5pbWF0ZVpvb206ZnVuY3Rpb24odCl7dGhpcy5fYW5pbWF0aW5nfHwodGhpcy5fYW5pbWF0aW5nPSEwLHRoaXMuX3ByZXBhcmVCZ0J1ZmZlcigpKTt2YXIgZT10aGlzLl9iZ0J1ZmZlcixpPW8uRG9tVXRpbC5UUkFOU0ZPUk0sbj10LmRlbHRhP28uRG9tVXRpbC5nZXRUcmFuc2xhdGVTdHJpbmcodC5kZWx0YSk6ZS5zdHlsZVtpXSxzPW8uRG9tVXRpbC5nZXRTY2FsZVN0cmluZyh0LnNjYWxlLHQub3JpZ2luKTtlLnN0eWxlW2ldPXQuYmFja3dhcmRzP3MrXCIgXCIrbjpuK1wiIFwiK3N9LF9lbmRab29tQW5pbTpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX3RpbGVDb250YWluZXIsZT10aGlzLl9iZ0J1ZmZlcjt0LnN0eWxlLnZpc2liaWxpdHk9XCJcIix0LnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodCksby5VdGlsLmZhbHNlRm4oZS5vZmZzZXRXaWR0aCksdGhpcy5fYW5pbWF0aW5nPSExfSxfY2xlYXJCZ0J1ZmZlcjpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX21hcDshdHx8dC5fYW5pbWF0aW5nWm9vbXx8dC50b3VjaFpvb20uX3pvb21pbmd8fCh0aGlzLl9iZ0J1ZmZlci5pbm5lckhUTUw9XCJcIix0aGlzLl9iZ0J1ZmZlci5zdHlsZVtvLkRvbVV0aWwuVFJBTlNGT1JNXT1cIlwiKX0sX3ByZXBhcmVCZ0J1ZmZlcjpmdW5jdGlvbigpe3ZhciB0PXRoaXMuX3RpbGVDb250YWluZXIsZT10aGlzLl9iZ0J1ZmZlcixpPXRoaXMuX2dldExvYWRlZFRpbGVzUGVyY2VudGFnZShlKSxuPXRoaXMuX2dldExvYWRlZFRpbGVzUGVyY2VudGFnZSh0KTtyZXR1cm4gZSYmaT4uNSYmLjU+bj8odC5zdHlsZS52aXNpYmlsaXR5PVwiaGlkZGVuXCIsdGhpcy5fc3RvcExvYWRpbmdJbWFnZXModCksdm9pZCAwKTooZS5zdHlsZS52aXNpYmlsaXR5PVwiaGlkZGVuXCIsZS5zdHlsZVtvLkRvbVV0aWwuVFJBTlNGT1JNXT1cIlwiLHRoaXMuX3RpbGVDb250YWluZXI9ZSxlPXRoaXMuX2JnQnVmZmVyPXQsdGhpcy5fc3RvcExvYWRpbmdJbWFnZXMoZSksY2xlYXJUaW1lb3V0KHRoaXMuX2NsZWFyQmdCdWZmZXJUaW1lciksdm9pZCAwKX0sX2dldExvYWRlZFRpbGVzUGVyY2VudGFnZTpmdW5jdGlvbih0KXt2YXIgZSxpLG49dC5nZXRFbGVtZW50c0J5VGFnTmFtZShcImltZ1wiKSxvPTA7Zm9yKGU9MCxpPW4ubGVuZ3RoO2k+ZTtlKyspbltlXS5jb21wbGV0ZSYmbysrO3JldHVybiBvL2l9LF9zdG9wTG9hZGluZ0ltYWdlczpmdW5jdGlvbih0KXt2YXIgZSxpLG4scz1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW1nXCIpKTtmb3IoZT0wLGk9cy5sZW5ndGg7aT5lO2UrKyluPXNbZV0sbi5jb21wbGV0ZXx8KG4ub25sb2FkPW8uVXRpbC5mYWxzZUZuLG4ub25lcnJvcj1vLlV0aWwuZmFsc2VGbixuLnNyYz1vLlV0aWwuZW1wdHlJbWFnZVVybCxuLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobikpfX0pLG8uTWFwLmluY2x1ZGUoe19kZWZhdWx0TG9jYXRlT3B0aW9uczp7d2F0Y2g6ITEsc2V0VmlldzohMSxtYXhab29tOjEvMCx0aW1lb3V0OjFlNCxtYXhpbXVtQWdlOjAsZW5hYmxlSGlnaEFjY3VyYWN5OiExfSxsb2NhdGU6ZnVuY3Rpb24odCl7aWYodD10aGlzLl9sb2NhdGVPcHRpb25zPW8uZXh0ZW5kKHRoaXMuX2RlZmF1bHRMb2NhdGVPcHRpb25zLHQpLCFuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pcmV0dXJuIHRoaXMuX2hhbmRsZUdlb2xvY2F0aW9uRXJyb3Ioe2NvZGU6MCxtZXNzYWdlOlwiR2VvbG9jYXRpb24gbm90IHN1cHBvcnRlZC5cIn0pLHRoaXM7dmFyIGU9by5iaW5kKHRoaXMuX2hhbmRsZUdlb2xvY2F0aW9uUmVzcG9uc2UsdGhpcyksaT1vLmJpbmQodGhpcy5faGFuZGxlR2VvbG9jYXRpb25FcnJvcix0aGlzKTtyZXR1cm4gdC53YXRjaD90aGlzLl9sb2NhdGlvbldhdGNoSWQ9bmF2aWdhdG9yLmdlb2xvY2F0aW9uLndhdGNoUG9zaXRpb24oZSxpLHQpOm5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZSxpLHQpLHRoaXN9LHN0b3BMb2NhdGU6ZnVuY3Rpb24oKXtyZXR1cm4gbmF2aWdhdG9yLmdlb2xvY2F0aW9uJiZuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uY2xlYXJXYXRjaCh0aGlzLl9sb2NhdGlvbldhdGNoSWQpLHRoaXMuX2xvY2F0ZU9wdGlvbnMmJih0aGlzLl9sb2NhdGVPcHRpb25zLnNldFZpZXc9ITEpLHRoaXN9LF9oYW5kbGVHZW9sb2NhdGlvbkVycm9yOmZ1bmN0aW9uKHQpe3ZhciBlPXQuY29kZSxpPXQubWVzc2FnZXx8KDE9PT1lP1wicGVybWlzc2lvbiBkZW5pZWRcIjoyPT09ZT9cInBvc2l0aW9uIHVuYXZhaWxhYmxlXCI6XCJ0aW1lb3V0XCIpO3RoaXMuX2xvY2F0ZU9wdGlvbnMuc2V0VmlldyYmIXRoaXMuX2xvYWRlZCYmdGhpcy5maXRXb3JsZCgpLHRoaXMuZmlyZShcImxvY2F0aW9uZXJyb3JcIix7Y29kZTplLG1lc3NhZ2U6XCJHZW9sb2NhdGlvbiBlcnJvcjogXCIraStcIi5cIn0pfSxfaGFuZGxlR2VvbG9jYXRpb25SZXNwb25zZTpmdW5jdGlvbih0KXt2YXIgZT10LmNvb3Jkcy5sYXRpdHVkZSxpPXQuY29vcmRzLmxvbmdpdHVkZSxuPW5ldyBvLkxhdExuZyhlLGkpLHM9MTgwKnQuY29vcmRzLmFjY3VyYWN5LzQwMDc1MDE3LGE9cy9NYXRoLmNvcyhvLkxhdExuZy5ERUdfVE9fUkFEKmUpLHI9by5sYXRMbmdCb3VuZHMoW2UtcyxpLWFdLFtlK3MsaSthXSksaD10aGlzLl9sb2NhdGVPcHRpb25zO2lmKGguc2V0Vmlldyl7dmFyIGw9TWF0aC5taW4odGhpcy5nZXRCb3VuZHNab29tKHIpLGgubWF4Wm9vbSk7dGhpcy5zZXRWaWV3KG4sbCl9dmFyIHU9e2xhdGxuZzpuLGJvdW5kczpyfTtmb3IodmFyIGMgaW4gdC5jb29yZHMpXCJudW1iZXJcIj09dHlwZW9mIHQuY29vcmRzW2NdJiYodVtjXT10LmNvb3Jkc1tjXSk7dGhpcy5maXJlKFwibG9jYXRpb25mb3VuZFwiLHUpfX0pfSh3aW5kb3csZG9jdW1lbnQpOyIsIi8qIVxuICogbXVzdGFjaGUuanMgLSBMb2dpYy1sZXNzIHt7bXVzdGFjaGV9fSB0ZW1wbGF0ZXMgd2l0aCBKYXZhU2NyaXB0XG4gKiBodHRwOi8vZ2l0aHViLmNvbS9qYW5sL211c3RhY2hlLmpzXG4gKi9cblxuLypnbG9iYWwgZGVmaW5lOiBmYWxzZSovXG5cbihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSkge1xuICBpZiAodHlwZW9mIGV4cG9ydHMgPT09IFwib2JqZWN0XCIgJiYgZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeTsgLy8gQ29tbW9uSlNcbiAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSBcImZ1bmN0aW9uXCIgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZShmYWN0b3J5KTsgLy8gQU1EXG4gIH0gZWxzZSB7XG4gICAgcm9vdC5NdXN0YWNoZSA9IGZhY3Rvcnk7IC8vIDxzY3JpcHQ+XG4gIH1cbn0odGhpcywgKGZ1bmN0aW9uICgpIHtcblxuICB2YXIgZXhwb3J0cyA9IHt9O1xuXG4gIGV4cG9ydHMubmFtZSA9IFwibXVzdGFjaGUuanNcIjtcbiAgZXhwb3J0cy52ZXJzaW9uID0gXCIwLjcuMlwiO1xuICBleHBvcnRzLnRhZ3MgPSBbXCJ7e1wiLCBcIn19XCJdO1xuXG4gIGV4cG9ydHMuU2Nhbm5lciA9IFNjYW5uZXI7XG4gIGV4cG9ydHMuQ29udGV4dCA9IENvbnRleHQ7XG4gIGV4cG9ydHMuV3JpdGVyID0gV3JpdGVyO1xuXG4gIHZhciB3aGl0ZVJlID0gL1xccyovO1xuICB2YXIgc3BhY2VSZSA9IC9cXHMrLztcbiAgdmFyIG5vblNwYWNlUmUgPSAvXFxTLztcbiAgdmFyIGVxUmUgPSAvXFxzKj0vO1xuICB2YXIgY3VybHlSZSA9IC9cXHMqXFx9LztcbiAgdmFyIHRhZ1JlID0gLyN8XFxefFxcL3w+fFxce3wmfD18IS87XG5cbiAgLy8gV29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9pc3N1ZXMuYXBhY2hlLm9yZy9qaXJhL2Jyb3dzZS9DT1VDSERCLTU3N1xuICAvLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2phbmwvbXVzdGFjaGUuanMvaXNzdWVzLzE4OVxuICBmdW5jdGlvbiB0ZXN0UmUocmUsIHN0cmluZykge1xuICAgIHJldHVybiBSZWdFeHAucHJvdG90eXBlLnRlc3QuY2FsbChyZSwgc3RyaW5nKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzV2hpdGVzcGFjZShzdHJpbmcpIHtcbiAgICByZXR1cm4gIXRlc3RSZShub25TcGFjZVJlLCBzdHJpbmcpO1xuICB9XG5cbiAgdmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09IFwiW29iamVjdCBBcnJheV1cIjtcbiAgfTtcblxuICBmdW5jdGlvbiBlc2NhcGVSZShzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoL1tcXC1cXFtcXF17fSgpKis/LixcXFxcXFxeJHwjXFxzXS9nLCBcIlxcXFwkJlwiKTtcbiAgfVxuXG4gIHZhciBlbnRpdHlNYXAgPSB7XG4gICAgXCImXCI6IFwiJmFtcDtcIixcbiAgICBcIjxcIjogXCImbHQ7XCIsXG4gICAgXCI+XCI6IFwiJmd0O1wiLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiMzOTsnLFxuICAgIFwiL1wiOiAnJiN4MkY7J1xuICB9O1xuXG4gIGZ1bmN0aW9uIGVzY2FwZUh0bWwoc3RyaW5nKSB7XG4gICAgcmV0dXJuIFN0cmluZyhzdHJpbmcpLnJlcGxhY2UoL1smPD5cIidcXC9dL2csIGZ1bmN0aW9uIChzKSB7XG4gICAgICByZXR1cm4gZW50aXR5TWFwW3NdO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gRXhwb3J0IHRoZSBlc2NhcGluZyBmdW5jdGlvbiBzbyB0aGF0IHRoZSB1c2VyIG1heSBvdmVycmlkZSBpdC5cbiAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYW5sL211c3RhY2hlLmpzL2lzc3Vlcy8yNDRcbiAgZXhwb3J0cy5lc2NhcGUgPSBlc2NhcGVIdG1sO1xuXG4gIGZ1bmN0aW9uIFNjYW5uZXIoc3RyaW5nKSB7XG4gICAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG4gICAgdGhpcy50YWlsID0gc3RyaW5nO1xuICAgIHRoaXMucG9zID0gMDtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgdGFpbCBpcyBlbXB0eSAoZW5kIG9mIHN0cmluZykuXG4gICAqL1xuICBTY2FubmVyLnByb3RvdHlwZS5lb3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMudGFpbCA9PT0gXCJcIjtcbiAgfTtcblxuICAvKipcbiAgICogVHJpZXMgdG8gbWF0Y2ggdGhlIGdpdmVuIHJlZ3VsYXIgZXhwcmVzc2lvbiBhdCB0aGUgY3VycmVudCBwb3NpdGlvbi5cbiAgICogUmV0dXJucyB0aGUgbWF0Y2hlZCB0ZXh0IGlmIGl0IGNhbiBtYXRjaCwgdGhlIGVtcHR5IHN0cmluZyBvdGhlcndpc2UuXG4gICAqL1xuICBTY2FubmVyLnByb3RvdHlwZS5zY2FuID0gZnVuY3Rpb24gKHJlKSB7XG4gICAgdmFyIG1hdGNoID0gdGhpcy50YWlsLm1hdGNoKHJlKTtcblxuICAgIGlmIChtYXRjaCAmJiBtYXRjaC5pbmRleCA9PT0gMCkge1xuICAgICAgdGhpcy50YWlsID0gdGhpcy50YWlsLnN1YnN0cmluZyhtYXRjaFswXS5sZW5ndGgpO1xuICAgICAgdGhpcy5wb3MgKz0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgcmV0dXJuIG1hdGNoWzBdO1xuICAgIH1cblxuICAgIHJldHVybiBcIlwiO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTa2lwcyBhbGwgdGV4dCB1bnRpbCB0aGUgZ2l2ZW4gcmVndWxhciBleHByZXNzaW9uIGNhbiBiZSBtYXRjaGVkLiBSZXR1cm5zXG4gICAqIHRoZSBza2lwcGVkIHN0cmluZywgd2hpY2ggaXMgdGhlIGVudGlyZSB0YWlsIGlmIG5vIG1hdGNoIGNhbiBiZSBtYWRlLlxuICAgKi9cbiAgU2Nhbm5lci5wcm90b3R5cGUuc2NhblVudGlsID0gZnVuY3Rpb24gKHJlKSB7XG4gICAgdmFyIG1hdGNoLCBwb3MgPSB0aGlzLnRhaWwuc2VhcmNoKHJlKTtcblxuICAgIHN3aXRjaCAocG9zKSB7XG4gICAgY2FzZSAtMTpcbiAgICAgIG1hdGNoID0gdGhpcy50YWlsO1xuICAgICAgdGhpcy5wb3MgKz0gdGhpcy50YWlsLmxlbmd0aDtcbiAgICAgIHRoaXMudGFpbCA9IFwiXCI7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDA6XG4gICAgICBtYXRjaCA9IFwiXCI7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgbWF0Y2ggPSB0aGlzLnRhaWwuc3Vic3RyaW5nKDAsIHBvcyk7XG4gICAgICB0aGlzLnRhaWwgPSB0aGlzLnRhaWwuc3Vic3RyaW5nKHBvcyk7XG4gICAgICB0aGlzLnBvcyArPSBwb3M7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1hdGNoO1xuICB9O1xuXG4gIGZ1bmN0aW9uIENvbnRleHQodmlldywgcGFyZW50KSB7XG4gICAgdGhpcy52aWV3ID0gdmlldztcbiAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB0aGlzLmNsZWFyQ2FjaGUoKTtcbiAgfVxuXG4gIENvbnRleHQubWFrZSA9IGZ1bmN0aW9uICh2aWV3KSB7XG4gICAgcmV0dXJuICh2aWV3IGluc3RhbmNlb2YgQ29udGV4dCkgPyB2aWV3IDogbmV3IENvbnRleHQodmlldyk7XG4gIH07XG5cbiAgQ29udGV4dC5wcm90b3R5cGUuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9jYWNoZSA9IHt9O1xuICB9O1xuXG4gIENvbnRleHQucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAodmlldykge1xuICAgIHJldHVybiBuZXcgQ29udGV4dCh2aWV3LCB0aGlzKTtcbiAgfTtcblxuICBDb250ZXh0LnByb3RvdHlwZS5sb29rdXAgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHZhciB2YWx1ZSA9IHRoaXMuX2NhY2hlW25hbWVdO1xuXG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgaWYgKG5hbWUgPT09IFwiLlwiKSB7XG4gICAgICAgIHZhbHVlID0gdGhpcy52aWV3O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGNvbnRleHQgPSB0aGlzO1xuXG4gICAgICAgIHdoaWxlIChjb250ZXh0KSB7XG4gICAgICAgICAgaWYgKG5hbWUuaW5kZXhPZihcIi5cIikgPiAwKSB7XG4gICAgICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KFwiLlwiKSwgaSA9IDA7XG5cbiAgICAgICAgICAgIHZhbHVlID0gY29udGV4dC52aWV3O1xuXG4gICAgICAgICAgICB3aGlsZSAodmFsdWUgJiYgaSA8IG5hbWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlW25hbWVzW2krK11dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRleHQudmlld1tuYW1lXTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29udGV4dCA9IGNvbnRleHQucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX2NhY2hlW25hbWVdID0gdmFsdWU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLmNhbGwodGhpcy52aWV3KTtcbiAgICB9XG5cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgZnVuY3Rpb24gV3JpdGVyKCkge1xuICAgIHRoaXMuY2xlYXJDYWNoZSgpO1xuICB9XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5jbGVhckNhY2hlID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2NhY2hlID0ge307XG4gICAgdGhpcy5fcGFydGlhbENhY2hlID0ge307XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5jb21waWxlID0gZnVuY3Rpb24gKHRlbXBsYXRlLCB0YWdzKSB7XG4gICAgdmFyIGZuID0gdGhpcy5fY2FjaGVbdGVtcGxhdGVdO1xuXG4gICAgaWYgKCFmbikge1xuICAgICAgdmFyIHRva2VucyA9IGV4cG9ydHMucGFyc2UodGVtcGxhdGUsIHRhZ3MpO1xuICAgICAgZm4gPSB0aGlzLl9jYWNoZVt0ZW1wbGF0ZV0gPSB0aGlzLmNvbXBpbGVUb2tlbnModG9rZW5zLCB0ZW1wbGF0ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZuO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUuY29tcGlsZVBhcnRpYWwgPSBmdW5jdGlvbiAobmFtZSwgdGVtcGxhdGUsIHRhZ3MpIHtcbiAgICB2YXIgZm4gPSB0aGlzLmNvbXBpbGUodGVtcGxhdGUsIHRhZ3MpO1xuICAgIHRoaXMuX3BhcnRpYWxDYWNoZVtuYW1lXSA9IGZuO1xuICAgIHJldHVybiBmbjtcbiAgfTtcblxuICBXcml0ZXIucHJvdG90eXBlLmNvbXBpbGVUb2tlbnMgPSBmdW5jdGlvbiAodG9rZW5zLCB0ZW1wbGF0ZSkge1xuICAgIHZhciBmbiA9IGNvbXBpbGVUb2tlbnModG9rZW5zKTtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKHZpZXcsIHBhcnRpYWxzKSB7XG4gICAgICBpZiAocGFydGlhbHMpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJ0aWFscyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgc2VsZi5fbG9hZFBhcnRpYWwgPSBwYXJ0aWFscztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBuYW1lIGluIHBhcnRpYWxzKSB7XG4gICAgICAgICAgICBzZWxmLmNvbXBpbGVQYXJ0aWFsKG5hbWUsIHBhcnRpYWxzW25hbWVdKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZuKHNlbGYsIENvbnRleHQubWFrZSh2aWV3KSwgdGVtcGxhdGUpO1xuICAgIH07XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAodGVtcGxhdGUsIHZpZXcsIHBhcnRpYWxzKSB7XG4gICAgcmV0dXJuIHRoaXMuY29tcGlsZSh0ZW1wbGF0ZSkodmlldywgcGFydGlhbHMpO1xuICB9O1xuXG4gIFdyaXRlci5wcm90b3R5cGUuX3NlY3Rpb24gPSBmdW5jdGlvbiAobmFtZSwgY29udGV4dCwgdGV4dCwgY2FsbGJhY2spIHtcbiAgICB2YXIgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cChuYW1lKTtcblxuICAgIHN3aXRjaCAodHlwZW9mIHZhbHVlKSB7XG4gICAgY2FzZSBcIm9iamVjdFwiOlxuICAgICAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHZhciBidWZmZXIgPSBcIlwiO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB2YWx1ZS5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIGJ1ZmZlciArPSBjYWxsYmFjayh0aGlzLCBjb250ZXh0LnB1c2godmFsdWVbaV0pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBidWZmZXI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB2YWx1ZSA/IGNhbGxiYWNrKHRoaXMsIGNvbnRleHQucHVzaCh2YWx1ZSkpIDogXCJcIjtcbiAgICBjYXNlIFwiZnVuY3Rpb25cIjpcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBzY29wZWRSZW5kZXIgPSBmdW5jdGlvbiAodGVtcGxhdGUpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYucmVuZGVyKHRlbXBsYXRlLCBjb250ZXh0KTtcbiAgICAgIH07XG5cbiAgICAgIHZhciByZXN1bHQgPSB2YWx1ZS5jYWxsKGNvbnRleHQudmlldywgdGV4dCwgc2NvcGVkUmVuZGVyKTtcbiAgICAgIHJldHVybiByZXN1bHQgIT0gbnVsbCA/IHJlc3VsdCA6IFwiXCI7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sodGhpcywgY29udGV4dCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFwiXCI7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5faW52ZXJ0ZWQgPSBmdW5jdGlvbiAobmFtZSwgY29udGV4dCwgY2FsbGJhY2spIHtcbiAgICB2YXIgdmFsdWUgPSBjb250ZXh0Lmxvb2t1cChuYW1lKTtcblxuICAgIC8vIFVzZSBKYXZhU2NyaXB0J3MgZGVmaW5pdGlvbiBvZiBmYWxzeS4gSW5jbHVkZSBlbXB0eSBhcnJheXMuXG4gICAgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9qYW5sL211c3RhY2hlLmpzL2lzc3Vlcy8xODZcbiAgICBpZiAoIXZhbHVlIHx8IChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sodGhpcywgY29udGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIFwiXCI7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5fcGFydGlhbCA9IGZ1bmN0aW9uIChuYW1lLCBjb250ZXh0KSB7XG4gICAgaWYgKCEobmFtZSBpbiB0aGlzLl9wYXJ0aWFsQ2FjaGUpICYmIHRoaXMuX2xvYWRQYXJ0aWFsKSB7XG4gICAgICB0aGlzLmNvbXBpbGVQYXJ0aWFsKG5hbWUsIHRoaXMuX2xvYWRQYXJ0aWFsKG5hbWUpKTtcbiAgICB9XG5cbiAgICB2YXIgZm4gPSB0aGlzLl9wYXJ0aWFsQ2FjaGVbbmFtZV07XG5cbiAgICByZXR1cm4gZm4gPyBmbihjb250ZXh0KSA6IFwiXCI7XG4gIH07XG5cbiAgV3JpdGVyLnByb3RvdHlwZS5fbmFtZSA9IGZ1bmN0aW9uIChuYW1lLCBjb250ZXh0KSB7XG4gICAgdmFyIHZhbHVlID0gY29udGV4dC5sb29rdXAobmFtZSk7XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHZhbHVlID0gdmFsdWUuY2FsbChjb250ZXh0LnZpZXcpO1xuICAgIH1cblxuICAgIHJldHVybiAodmFsdWUgPT0gbnVsbCkgPyBcIlwiIDogU3RyaW5nKHZhbHVlKTtcbiAgfTtcblxuICBXcml0ZXIucHJvdG90eXBlLl9lc2NhcGVkID0gZnVuY3Rpb24gKG5hbWUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZXhwb3J0cy5lc2NhcGUodGhpcy5fbmFtZShuYW1lLCBjb250ZXh0KSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIExvdy1sZXZlbCBmdW5jdGlvbiB0aGF0IGNvbXBpbGVzIHRoZSBnaXZlbiBgdG9rZW5zYCBpbnRvIGEgZnVuY3Rpb25cbiAgICogdGhhdCBhY2NlcHRzIHRocmVlIGFyZ3VtZW50czogYSBXcml0ZXIsIGEgQ29udGV4dCwgYW5kIHRoZSB0ZW1wbGF0ZS5cbiAgICovXG4gIGZ1bmN0aW9uIGNvbXBpbGVUb2tlbnModG9rZW5zKSB7XG4gICAgdmFyIHN1YlJlbmRlcnMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIHN1YlJlbmRlcihpLCB0b2tlbnMsIHRlbXBsYXRlKSB7XG4gICAgICBpZiAoIXN1YlJlbmRlcnNbaV0pIHtcbiAgICAgICAgdmFyIGZuID0gY29tcGlsZVRva2Vucyh0b2tlbnMpO1xuICAgICAgICBzdWJSZW5kZXJzW2ldID0gZnVuY3Rpb24gKHdyaXRlciwgY29udGV4dCkge1xuICAgICAgICAgIHJldHVybiBmbih3cml0ZXIsIGNvbnRleHQsIHRlbXBsYXRlKTtcbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN1YlJlbmRlcnNbaV07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh3cml0ZXIsIGNvbnRleHQsIHRlbXBsYXRlKSB7XG4gICAgICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgICAgIHZhciB0b2tlbiwgc2VjdGlvblRleHQ7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSB0b2tlbnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgdG9rZW4gPSB0b2tlbnNbaV07XG5cbiAgICAgICAgc3dpdGNoICh0b2tlblswXSkge1xuICAgICAgICBjYXNlIFwiI1wiOlxuICAgICAgICAgIHNlY3Rpb25UZXh0ID0gdGVtcGxhdGUuc2xpY2UodG9rZW5bM10sIHRva2VuWzVdKTtcbiAgICAgICAgICBidWZmZXIgKz0gd3JpdGVyLl9zZWN0aW9uKHRva2VuWzFdLCBjb250ZXh0LCBzZWN0aW9uVGV4dCwgc3ViUmVuZGVyKGksIHRva2VuWzRdLCB0ZW1wbGF0ZSkpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiXlwiOlxuICAgICAgICAgIGJ1ZmZlciArPSB3cml0ZXIuX2ludmVydGVkKHRva2VuWzFdLCBjb250ZXh0LCBzdWJSZW5kZXIoaSwgdG9rZW5bNF0sIHRlbXBsYXRlKSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCI+XCI6XG4gICAgICAgICAgYnVmZmVyICs9IHdyaXRlci5fcGFydGlhbCh0b2tlblsxXSwgY29udGV4dCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCImXCI6XG4gICAgICAgICAgYnVmZmVyICs9IHdyaXRlci5fbmFtZSh0b2tlblsxXSwgY29udGV4dCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJuYW1lXCI6XG4gICAgICAgICAgYnVmZmVyICs9IHdyaXRlci5fZXNjYXBlZCh0b2tlblsxXSwgY29udGV4dCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCJ0ZXh0XCI6XG4gICAgICAgICAgYnVmZmVyICs9IHRva2VuWzFdO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBidWZmZXI7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGb3JtcyB0aGUgZ2l2ZW4gYXJyYXkgb2YgYHRva2Vuc2AgaW50byBhIG5lc3RlZCB0cmVlIHN0cnVjdHVyZSB3aGVyZVxuICAgKiB0b2tlbnMgdGhhdCByZXByZXNlbnQgYSBzZWN0aW9uIGhhdmUgdHdvIGFkZGl0aW9uYWwgaXRlbXM6IDEpIGFuIGFycmF5IG9mXG4gICAqIGFsbCB0b2tlbnMgdGhhdCBhcHBlYXIgaW4gdGhhdCBzZWN0aW9uIGFuZCAyKSB0aGUgaW5kZXggaW4gdGhlIG9yaWdpbmFsXG4gICAqIHRlbXBsYXRlIHRoYXQgcmVwcmVzZW50cyB0aGUgZW5kIG9mIHRoYXQgc2VjdGlvbi5cbiAgICovXG4gIGZ1bmN0aW9uIG5lc3RUb2tlbnModG9rZW5zKSB7XG4gICAgdmFyIHRyZWUgPSBbXTtcbiAgICB2YXIgY29sbGVjdG9yID0gdHJlZTtcbiAgICB2YXIgc2VjdGlvbnMgPSBbXTtcblxuICAgIHZhciB0b2tlbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdG9rZW5zLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgIHN3aXRjaCAodG9rZW5bMF0pIHtcbiAgICAgIGNhc2UgJyMnOlxuICAgICAgY2FzZSAnXic6XG4gICAgICAgIHNlY3Rpb25zLnB1c2godG9rZW4pO1xuICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICAgIGNvbGxlY3RvciA9IHRva2VuWzRdID0gW107XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnLyc6XG4gICAgICAgIHZhciBzZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG4gICAgICAgIHNlY3Rpb25bNV0gPSB0b2tlblsyXTtcbiAgICAgICAgY29sbGVjdG9yID0gc2VjdGlvbnMubGVuZ3RoID4gMCA/IHNlY3Rpb25zW3NlY3Rpb25zLmxlbmd0aCAtIDFdWzRdIDogdHJlZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBjb2xsZWN0b3IucHVzaCh0b2tlbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyZWU7XG4gIH1cblxuICAvKipcbiAgICogQ29tYmluZXMgdGhlIHZhbHVlcyBvZiBjb25zZWN1dGl2ZSB0ZXh0IHRva2VucyBpbiB0aGUgZ2l2ZW4gYHRva2Vuc2AgYXJyYXlcbiAgICogdG8gYSBzaW5nbGUgdG9rZW4uXG4gICAqL1xuICBmdW5jdGlvbiBzcXVhc2hUb2tlbnModG9rZW5zKSB7XG4gICAgdmFyIHNxdWFzaGVkVG9rZW5zID0gW107XG5cbiAgICB2YXIgdG9rZW4sIGxhc3RUb2tlbjtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdG9rZW5zLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICB0b2tlbiA9IHRva2Vuc1tpXTtcbiAgICAgIGlmICh0b2tlblswXSA9PT0gJ3RleHQnICYmIGxhc3RUb2tlbiAmJiBsYXN0VG9rZW5bMF0gPT09ICd0ZXh0Jykge1xuICAgICAgICBsYXN0VG9rZW5bMV0gKz0gdG9rZW5bMV07XG4gICAgICAgIGxhc3RUb2tlblszXSA9IHRva2VuWzNdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGFzdFRva2VuID0gdG9rZW47XG4gICAgICAgIHNxdWFzaGVkVG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzcXVhc2hlZFRva2VucztcbiAgfVxuXG4gIGZ1bmN0aW9uIGVzY2FwZVRhZ3ModGFncykge1xuICAgIHJldHVybiBbXG4gICAgICBuZXcgUmVnRXhwKGVzY2FwZVJlKHRhZ3NbMF0pICsgXCJcXFxccypcIiksXG4gICAgICBuZXcgUmVnRXhwKFwiXFxcXHMqXCIgKyBlc2NhcGVSZSh0YWdzWzFdKSlcbiAgICBdO1xuICB9XG5cbiAgLyoqXG4gICAqIEJyZWFrcyB1cCB0aGUgZ2l2ZW4gYHRlbXBsYXRlYCBzdHJpbmcgaW50byBhIHRyZWUgb2YgdG9rZW4gb2JqZWN0cy4gSWZcbiAgICogYHRhZ3NgIGlzIGdpdmVuIGhlcmUgaXQgbXVzdCBiZSBhbiBhcnJheSB3aXRoIHR3byBzdHJpbmcgdmFsdWVzOiB0aGVcbiAgICogb3BlbmluZyBhbmQgY2xvc2luZyB0YWdzIHVzZWQgaW4gdGhlIHRlbXBsYXRlIChlLmcuIFtcIjwlXCIsIFwiJT5cIl0pLiBPZlxuICAgKiBjb3Vyc2UsIHRoZSBkZWZhdWx0IGlzIHRvIHVzZSBtdXN0YWNoZXMgKGkuZS4gTXVzdGFjaGUudGFncykuXG4gICAqL1xuICBleHBvcnRzLnBhcnNlID0gZnVuY3Rpb24gKHRlbXBsYXRlLCB0YWdzKSB7XG4gICAgdGVtcGxhdGUgPSB0ZW1wbGF0ZSB8fCAnJztcbiAgICB0YWdzID0gdGFncyB8fCBleHBvcnRzLnRhZ3M7XG5cbiAgICBpZiAodHlwZW9mIHRhZ3MgPT09ICdzdHJpbmcnKSB0YWdzID0gdGFncy5zcGxpdChzcGFjZVJlKTtcbiAgICBpZiAodGFncy5sZW5ndGggIT09IDIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0YWdzOiAnICsgdGFncy5qb2luKCcsICcpKTtcbiAgICB9XG5cbiAgICB2YXIgdGFnUmVzID0gZXNjYXBlVGFncyh0YWdzKTtcbiAgICB2YXIgc2Nhbm5lciA9IG5ldyBTY2FubmVyKHRlbXBsYXRlKTtcblxuICAgIHZhciBzZWN0aW9ucyA9IFtdOyAgICAgLy8gU3RhY2sgdG8gaG9sZCBzZWN0aW9uIHRva2Vuc1xuICAgIHZhciB0b2tlbnMgPSBbXTsgICAgICAgLy8gQnVmZmVyIHRvIGhvbGQgdGhlIHRva2Vuc1xuICAgIHZhciBzcGFjZXMgPSBbXTsgICAgICAgLy8gSW5kaWNlcyBvZiB3aGl0ZXNwYWNlIHRva2VucyBvbiB0aGUgY3VycmVudCBsaW5lXG4gICAgdmFyIGhhc1RhZyA9IGZhbHNlOyAgICAvLyBJcyB0aGVyZSBhIHt7dGFnfX0gb24gdGhlIGN1cnJlbnQgbGluZT9cbiAgICB2YXIgbm9uU3BhY2UgPSBmYWxzZTsgIC8vIElzIHRoZXJlIGEgbm9uLXNwYWNlIGNoYXIgb24gdGhlIGN1cnJlbnQgbGluZT9cblxuICAgIC8vIFN0cmlwcyBhbGwgd2hpdGVzcGFjZSB0b2tlbnMgYXJyYXkgZm9yIHRoZSBjdXJyZW50IGxpbmVcbiAgICAvLyBpZiB0aGVyZSB3YXMgYSB7eyN0YWd9fSBvbiBpdCBhbmQgb3RoZXJ3aXNlIG9ubHkgc3BhY2UuXG4gICAgZnVuY3Rpb24gc3RyaXBTcGFjZSgpIHtcbiAgICAgIGlmIChoYXNUYWcgJiYgIW5vblNwYWNlKSB7XG4gICAgICAgIHdoaWxlIChzcGFjZXMubGVuZ3RoKSB7XG4gICAgICAgICAgdG9rZW5zLnNwbGljZShzcGFjZXMucG9wKCksIDEpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzcGFjZXMgPSBbXTtcbiAgICAgIH1cblxuICAgICAgaGFzVGFnID0gZmFsc2U7XG4gICAgICBub25TcGFjZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIHZhciBzdGFydCwgdHlwZSwgdmFsdWUsIGNocjtcbiAgICB3aGlsZSAoIXNjYW5uZXIuZW9zKCkpIHtcbiAgICAgIHN0YXJ0ID0gc2Nhbm5lci5wb3M7XG4gICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKHRhZ1Jlc1swXSk7XG5cbiAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdmFsdWUubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICBjaHIgPSB2YWx1ZS5jaGFyQXQoaSk7XG5cbiAgICAgICAgICBpZiAoaXNXaGl0ZXNwYWNlKGNocikpIHtcbiAgICAgICAgICAgIHNwYWNlcy5wdXNoKHRva2Vucy5sZW5ndGgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgdG9rZW5zLnB1c2goW1widGV4dFwiLCBjaHIsIHN0YXJ0LCBzdGFydCArIDFdKTtcbiAgICAgICAgICBzdGFydCArPSAxO1xuXG4gICAgICAgICAgaWYgKGNociA9PT0gXCJcXG5cIikge1xuICAgICAgICAgICAgc3RyaXBTcGFjZSgpOyAvLyBDaGVjayBmb3Igd2hpdGVzcGFjZSBvbiB0aGUgY3VycmVudCBsaW5lLlxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzdGFydCA9IHNjYW5uZXIucG9zO1xuXG4gICAgICAvLyBNYXRjaCB0aGUgb3BlbmluZyB0YWcuXG4gICAgICBpZiAoIXNjYW5uZXIuc2Nhbih0YWdSZXNbMF0pKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICBoYXNUYWcgPSB0cnVlO1xuICAgICAgdHlwZSA9IHNjYW5uZXIuc2Nhbih0YWdSZSkgfHwgXCJuYW1lXCI7XG5cbiAgICAgIC8vIFNraXAgYW55IHdoaXRlc3BhY2UgYmV0d2VlbiB0YWcgYW5kIHZhbHVlLlxuICAgICAgc2Nhbm5lci5zY2FuKHdoaXRlUmUpO1xuXG4gICAgICAvLyBFeHRyYWN0IHRoZSB0YWcgdmFsdWUuXG4gICAgICBpZiAodHlwZSA9PT0gXCI9XCIpIHtcbiAgICAgICAgdmFsdWUgPSBzY2FubmVyLnNjYW5VbnRpbChlcVJlKTtcbiAgICAgICAgc2Nhbm5lci5zY2FuKGVxUmUpO1xuICAgICAgICBzY2FubmVyLnNjYW5VbnRpbCh0YWdSZXNbMV0pO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIntcIikge1xuICAgICAgICB2YXIgY2xvc2VSZSA9IG5ldyBSZWdFeHAoXCJcXFxccypcIiArIGVzY2FwZVJlKFwifVwiICsgdGFnc1sxXSkpO1xuICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuc2NhblVudGlsKGNsb3NlUmUpO1xuICAgICAgICBzY2FubmVyLnNjYW4oY3VybHlSZSk7XG4gICAgICAgIHNjYW5uZXIuc2NhblVudGlsKHRhZ1Jlc1sxXSk7XG4gICAgICAgIHR5cGUgPSBcIiZcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhbHVlID0gc2Nhbm5lci5zY2FuVW50aWwodGFnUmVzWzFdKTtcbiAgICAgIH1cblxuICAgICAgLy8gTWF0Y2ggdGhlIGNsb3NpbmcgdGFnLlxuICAgICAgaWYgKCFzY2FubmVyLnNjYW4odGFnUmVzWzFdKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuY2xvc2VkIHRhZyBhdCAnICsgc2Nhbm5lci5wb3MpO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBzZWN0aW9uIG5lc3RpbmcuXG4gICAgICBpZiAodHlwZSA9PT0gJy8nKSB7XG4gICAgICAgIGlmIChzZWN0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vub3BlbmVkIHNlY3Rpb24gXCInICsgdmFsdWUgKyAnXCIgYXQgJyArIHN0YXJ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzZWN0aW9uID0gc2VjdGlvbnMucG9wKCk7XG5cbiAgICAgICAgaWYgKHNlY3Rpb25bMV0gIT09IHZhbHVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmNsb3NlZCBzZWN0aW9uIFwiJyArIHNlY3Rpb25bMV0gKyAnXCIgYXQgJyArIHN0YXJ0KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB2YXIgdG9rZW4gPSBbdHlwZSwgdmFsdWUsIHN0YXJ0LCBzY2FubmVyLnBvc107XG4gICAgICB0b2tlbnMucHVzaCh0b2tlbik7XG5cbiAgICAgIGlmICh0eXBlID09PSAnIycgfHwgdHlwZSA9PT0gJ14nKSB7XG4gICAgICAgIHNlY3Rpb25zLnB1c2godG9rZW4pO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBcIm5hbWVcIiB8fCB0eXBlID09PSBcIntcIiB8fCB0eXBlID09PSBcIiZcIikge1xuICAgICAgICBub25TcGFjZSA9IHRydWU7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFwiPVwiKSB7XG4gICAgICAgIC8vIFNldCB0aGUgdGFncyBmb3IgdGhlIG5leHQgdGltZSBhcm91bmQuXG4gICAgICAgIHRhZ3MgPSB2YWx1ZS5zcGxpdChzcGFjZVJlKTtcblxuICAgICAgICBpZiAodGFncy5sZW5ndGggIT09IDIpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgdGFncyBhdCAnICsgc3RhcnQgKyAnOiAnICsgdGFncy5qb2luKCcsICcpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRhZ1JlcyA9IGVzY2FwZVRhZ3ModGFncyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWFrZSBzdXJlIHRoZXJlIGFyZSBubyBvcGVuIHNlY3Rpb25zIHdoZW4gd2UncmUgZG9uZS5cbiAgICB2YXIgc2VjdGlvbiA9IHNlY3Rpb25zLnBvcCgpO1xuICAgIGlmIChzZWN0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuY2xvc2VkIHNlY3Rpb24gXCInICsgc2VjdGlvblsxXSArICdcIiBhdCAnICsgc2Nhbm5lci5wb3MpO1xuICAgIH1cblxuICAgIHJldHVybiBuZXN0VG9rZW5zKHNxdWFzaFRva2Vucyh0b2tlbnMpKTtcbiAgfTtcblxuICAvLyBUaGUgaGlnaC1sZXZlbCBjbGVhckNhY2hlLCBjb21waWxlLCBjb21waWxlUGFydGlhbCwgYW5kIHJlbmRlciBmdW5jdGlvbnNcbiAgLy8gdXNlIHRoaXMgZGVmYXVsdCB3cml0ZXIuXG4gIHZhciBfd3JpdGVyID0gbmV3IFdyaXRlcigpO1xuXG4gIC8qKlxuICAgKiBDbGVhcnMgYWxsIGNhY2hlZCB0ZW1wbGF0ZXMgYW5kIHBhcnRpYWxzIGluIHRoZSBkZWZhdWx0IHdyaXRlci5cbiAgICovXG4gIGV4cG9ydHMuY2xlYXJDYWNoZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gX3dyaXRlci5jbGVhckNhY2hlKCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbXBpbGVzIHRoZSBnaXZlbiBgdGVtcGxhdGVgIHRvIGEgcmV1c2FibGUgZnVuY3Rpb24gdXNpbmcgdGhlIGRlZmF1bHRcbiAgICogd3JpdGVyLlxuICAgKi9cbiAgZXhwb3J0cy5jb21waWxlID0gZnVuY3Rpb24gKHRlbXBsYXRlLCB0YWdzKSB7XG4gICAgcmV0dXJuIF93cml0ZXIuY29tcGlsZSh0ZW1wbGF0ZSwgdGFncyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbXBpbGVzIHRoZSBwYXJ0aWFsIHdpdGggdGhlIGdpdmVuIGBuYW1lYCBhbmQgYHRlbXBsYXRlYCB0byBhIHJldXNhYmxlXG4gICAqIGZ1bmN0aW9uIHVzaW5nIHRoZSBkZWZhdWx0IHdyaXRlci5cbiAgICovXG4gIGV4cG9ydHMuY29tcGlsZVBhcnRpYWwgPSBmdW5jdGlvbiAobmFtZSwgdGVtcGxhdGUsIHRhZ3MpIHtcbiAgICByZXR1cm4gX3dyaXRlci5jb21waWxlUGFydGlhbChuYW1lLCB0ZW1wbGF0ZSwgdGFncyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIENvbXBpbGVzIHRoZSBnaXZlbiBhcnJheSBvZiB0b2tlbnMgKHRoZSBvdXRwdXQgb2YgYSBwYXJzZSkgdG8gYSByZXVzYWJsZVxuICAgKiBmdW5jdGlvbiB1c2luZyB0aGUgZGVmYXVsdCB3cml0ZXIuXG4gICAqL1xuICBleHBvcnRzLmNvbXBpbGVUb2tlbnMgPSBmdW5jdGlvbiAodG9rZW5zLCB0ZW1wbGF0ZSkge1xuICAgIHJldHVybiBfd3JpdGVyLmNvbXBpbGVUb2tlbnModG9rZW5zLCB0ZW1wbGF0ZSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbmRlcnMgdGhlIGB0ZW1wbGF0ZWAgd2l0aCB0aGUgZ2l2ZW4gYHZpZXdgIGFuZCBgcGFydGlhbHNgIHVzaW5nIHRoZVxuICAgKiBkZWZhdWx0IHdyaXRlci5cbiAgICovXG4gIGV4cG9ydHMucmVuZGVyID0gZnVuY3Rpb24gKHRlbXBsYXRlLCB2aWV3LCBwYXJ0aWFscykge1xuICAgIHJldHVybiBfd3JpdGVyLnJlbmRlcih0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMpO1xuICB9O1xuXG4gIC8vIFRoaXMgaXMgaGVyZSBmb3IgYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgd2l0aCAwLjQueC5cbiAgZXhwb3J0cy50b19odG1sID0gZnVuY3Rpb24gKHRlbXBsYXRlLCB2aWV3LCBwYXJ0aWFscywgc2VuZCkge1xuICAgIHZhciByZXN1bHQgPSBleHBvcnRzLnJlbmRlcih0ZW1wbGF0ZSwgdmlldywgcGFydGlhbHMpO1xuXG4gICAgaWYgKHR5cGVvZiBzZW5kID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHNlbmQocmVzdWx0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGV4cG9ydHM7XG5cbn0oKSkpKTtcbiIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuNS4xXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDEzIEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBnbG9iYWxgIG9uIHRoZSBzZXJ2ZXIuXG4gIHZhciByb290ID0gdGhpcztcblxuICAvLyBTYXZlIHRoZSBwcmV2aW91cyB2YWx1ZSBvZiB0aGUgYF9gIHZhcmlhYmxlLlxuICB2YXIgcHJldmlvdXNVbmRlcnNjb3JlID0gcm9vdC5fO1xuXG4gIC8vIEVzdGFibGlzaCB0aGUgb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCB0byBicmVhayBvdXQgb2YgYSBsb29wIGl0ZXJhdGlvbi5cbiAgdmFyIGJyZWFrZXIgPSB7fTtcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVGb3JFYWNoICAgICAgPSBBcnJheVByb3RvLmZvckVhY2gsXG4gICAgbmF0aXZlTWFwICAgICAgICAgID0gQXJyYXlQcm90by5tYXAsXG4gICAgbmF0aXZlUmVkdWNlICAgICAgID0gQXJyYXlQcm90by5yZWR1Y2UsXG4gICAgbmF0aXZlUmVkdWNlUmlnaHQgID0gQXJyYXlQcm90by5yZWR1Y2VSaWdodCxcbiAgICBuYXRpdmVGaWx0ZXIgICAgICAgPSBBcnJheVByb3RvLmZpbHRlcixcbiAgICBuYXRpdmVFdmVyeSAgICAgICAgPSBBcnJheVByb3RvLmV2ZXJ5LFxuICAgIG5hdGl2ZVNvbWUgICAgICAgICA9IEFycmF5UHJvdG8uc29tZSxcbiAgICBuYXRpdmVJbmRleE9mICAgICAgPSBBcnJheVByb3RvLmluZGV4T2YsXG4gICAgbmF0aXZlTGFzdEluZGV4T2YgID0gQXJyYXlQcm90by5sYXN0SW5kZXhPZixcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdCB2aWEgYSBzdHJpbmcgaWRlbnRpZmllcixcbiAgLy8gZm9yIENsb3N1cmUgQ29tcGlsZXIgXCJhZHZhbmNlZFwiIG1vZGUuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNS4xJztcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIG9iamVjdHMgd2l0aCB0aGUgYnVpbHQtaW4gYGZvckVhY2hgLCBhcnJheXMsIGFuZCByYXcgb2JqZWN0cy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZvckVhY2hgIGlmIGF2YWlsYWJsZS5cbiAgdmFyIGVhY2ggPSBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm47XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iai5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgaWYgKF8uaGFzKG9iaiwga2V5KSkge1xuICAgICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtrZXldLCBrZXksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdG9yIHRvIGVhY2ggZWxlbWVudC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYG1hcGAgaWYgYXZhaWxhYmxlLlxuICBfLm1hcCA9IF8uY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZU1hcCAmJiBvYmoubWFwID09PSBuYXRpdmVNYXApIHJldHVybiBvYmoubWFwKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXN1bHRzLnB1c2goaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICB2YXIgcmVkdWNlRXJyb3IgPSAnUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZSc7XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlYCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlICYmIG9iai5yZWR1Y2UgPT09IG5hdGl2ZVJlZHVjZSkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZShpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlKGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSB2YWx1ZTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gVGhlIHJpZ2h0LWFzc29jaWF0aXZlIHZlcnNpb24gb2YgcmVkdWNlLCBhbHNvIGtub3duIGFzIGBmb2xkcmAuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VSaWdodGAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZVJpZ2h0ICYmIG9iai5yZWR1Y2VSaWdodCA9PT0gbmF0aXZlUmVkdWNlUmlnaHQpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IpO1xuICAgIH1cbiAgICB2YXIgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoICE9PSArbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGluZGV4ID0ga2V5cyA/IGtleXNbLS1sZW5ndGhdIDogLS1sZW5ndGg7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IG9ialtpbmRleF07XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgb2JqW2luZGV4XSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZmlsdGVyYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVGaWx0ZXIgJiYgb2JqLmZpbHRlciA9PT0gbmF0aXZlRmlsdGVyKSByZXR1cm4gb2JqLmZpbHRlcihpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiAhaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZXZlcnlgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yIHx8IChpdGVyYXRvciA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlRXZlcnkgJiYgb2JqLmV2ZXJ5ID09PSBuYXRpdmVFdmVyeSkgcmV0dXJuIG9iai5ldmVyeShpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCEocmVzdWx0ID0gcmVzdWx0ICYmIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHNvbWVgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgdmFyIGFueSA9IF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yIHx8IChpdGVyYXRvciA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZVNvbWUgJiYgb2JqLnNvbWUgPT09IG5hdGl2ZVNvbWUpIHJldHVybiBvYmouc29tZShpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHJlc3VsdCB8fCAocmVzdWx0ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIG9iai5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gb2JqLmluZGV4T2YodGFyZ2V0KSAhPSAtMTtcbiAgICByZXR1cm4gYW55KG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiB2YWx1ZVtrZXldOyB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzLCBmaXJzdCkge1xuICAgIGlmIChfLmlzRW1wdHkoYXR0cnMpKSByZXR1cm4gZmlyc3QgPyB2b2lkIDAgOiBbXTtcbiAgICByZXR1cm4gX1tmaXJzdCA/ICdmaW5kJyA6ICdmaWx0ZXInXShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cnMpIHtcbiAgICAgICAgaWYgKGF0dHJzW2tleV0gIT09IHZhbHVlW2tleV0pIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbmRgOiBnZXR0aW5nIHRoZSBmaXJzdCBvYmplY3RcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5maW5kV2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8ud2hlcmUob2JqLCBhdHRycywgdHJ1ZSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgb3IgKGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICAvLyBDYW4ndCBvcHRpbWl6ZSBhcnJheXMgb2YgaW50ZWdlcnMgbG9uZ2VyIHRoYW4gNjUsNTM1IGVsZW1lbnRzLlxuICAvLyBTZWUgW1dlYktpdCBCdWcgODA3OTddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD04MDc5NylcbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzRW1wdHkob2JqKSkgcmV0dXJuIC1JbmZpbml0eTtcbiAgICB2YXIgcmVzdWx0ID0ge2NvbXB1dGVkIDogLUluZmluaXR5LCB2YWx1ZTogLUluZmluaXR5fTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgY29tcHV0ZWQgPiByZXN1bHQuY29tcHV0ZWQgJiYgKHJlc3VsdCA9IHt2YWx1ZSA6IHZhbHVlLCBjb21wdXRlZCA6IGNvbXB1dGVkfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0VtcHR5KG9iaikpIHJldHVybiBJbmZpbml0eTtcbiAgICB2YXIgcmVzdWx0ID0ge2NvbXB1dGVkIDogSW5maW5pdHksIHZhbHVlOiBJbmZpbml0eX07XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGNvbXB1dGVkIDwgcmVzdWx0LmNvbXB1dGVkICYmIChyZXN1bHQgPSB7dmFsdWUgOiB2YWx1ZSwgY29tcHV0ZWQgOiBjb21wdXRlZH0pO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQudmFsdWU7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhbiBhcnJheS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJhbmQ7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBbXTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJhbmQgPSBfLnJhbmRvbShpbmRleCsrKTtcbiAgICAgIHNodWZmbGVkW2luZGV4IC0gMV0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGxvb2t1cCBpdGVyYXRvcnMuXG4gIHZhciBsb29rdXBJdGVyYXRvciA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZSA6IGZ1bmN0aW9uKG9iail7IHJldHVybiBvYmpbdmFsdWVdOyB9O1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRvci5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIHZhbHVlLCBjb250ZXh0KSB7XG4gICAgdmFyIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IodmFsdWUpO1xuICAgIHJldHVybiBfLnBsdWNrKF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWx1ZSA6IHZhbHVlLFxuICAgICAgICBpbmRleCA6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYSA6IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IDwgcmlnaHQuaW5kZXggPyAtMSA6IDE7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24ob2JqLCB2YWx1ZSwgY29udGV4dCwgYmVoYXZpb3IpIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IodmFsdWUgPT0gbnVsbCA/IF8uaWRlbnRpdHkgOiB2YWx1ZSk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgdmFyIGtleSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgYmVoYXZpb3IocmVzdWx0LCBrZXksIHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGZ1bmN0aW9uKG9iaiwgdmFsdWUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZ3JvdXAob2JqLCB2YWx1ZSwgY29udGV4dCwgZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgICAoXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0gOiAocmVzdWx0W2tleV0gPSBbXSkpLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBmdW5jdGlvbihvYmosIHZhbHVlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIGdyb3VwKG9iaiwgdmFsdWUsIGNvbnRleHQsIGZ1bmN0aW9uKHJlc3VsdCwga2V5KSB7XG4gICAgICBpZiAoIV8uaGFzKHJlc3VsdCwga2V5KSkgcmVzdWx0W2tleV0gPSAwO1xuICAgICAgcmVzdWx0W2tleV0rKztcbiAgICB9KTtcbiAgfTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBpdGVyYXRvciA9PSBudWxsID8gXy5pZGVudGl0eSA6IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSAobG93ICsgaGlnaCkgPj4+IDE7XG4gICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGFycmF5W21pZF0pIDwgdmFsdWUgPyBsb3cgPSBtaWQgKyAxIDogaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHJldHVybiAobiAhPSBudWxsKSAmJiAhZ3VhcmQgPyBzbGljZS5jYWxsKGFycmF5LCAwLCBuKSA6IGFycmF5WzBdO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtICgobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuICE9IG51bGwpICYmICFndWFyZCkge1xuICAgICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIE1hdGgubWF4KGFycmF5Lmxlbmd0aCAtIG4sIDApKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBmaXJzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYHRhaWxgIGFuZCBgZHJvcGAuXG4gIC8vIEVzcGVjaWFsbHkgdXNlZnVsIG9uIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nIGFuICoqbioqIHdpbGwgcmV0dXJuXG4gIC8vIHRoZSByZXN0IE4gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKlxuICAvLyBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKTtcbiAgfTtcblxuICAvLyBUcmltIG91dCBhbGwgZmFsc3kgdmFsdWVzIGZyb20gYW4gYXJyYXkuXG4gIF8uY29tcGFjdCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBfLmlkZW50aXR5KTtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBvZiBhIHJlY3Vyc2l2ZSBgZmxhdHRlbmAgZnVuY3Rpb24uXG4gIHZhciBmbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQsIHNoYWxsb3csIG91dHB1dCkge1xuICAgIGlmIChzaGFsbG93ICYmIF8uZXZlcnkoaW5wdXQsIF8uaXNBcnJheSkpIHtcbiAgICAgIHJldHVybiBjb25jYXQuYXBwbHkob3V0cHV0LCBpbnB1dCk7XG4gICAgfVxuICAgIGVhY2goaW5wdXQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgICBzaGFsbG93ID8gcHVzaC5hcHBseShvdXRwdXQsIHZhbHVlKSA6IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb21wbGV0ZWx5IGZsYXR0ZW5lZCB2ZXJzaW9uIG9mIGFuIGFycmF5LlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0b3I7XG4gICAgICBpdGVyYXRvciA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGluaXRpYWwgPSBpdGVyYXRvciA/IF8ubWFwKGFycmF5LCBpdGVyYXRvciwgY29udGV4dCkgOiBhcnJheTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZWFjaChpbml0aWFsLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgIGlmIChpc1NvcnRlZCA/ICghaW5kZXggfHwgc2VlbltzZWVuLmxlbmd0aCAtIDFdICE9PSB2YWx1ZSkgOiAhXy5jb250YWlucyhzZWVuLCB2YWx1ZSkpIHtcbiAgICAgICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGFycmF5W2luZGV4XSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB1bmlvbjogZWFjaCBkaXN0aW5jdCBlbGVtZW50IGZyb20gYWxsIG9mXG4gIC8vIHRoZSBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLnVuaW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW5pcShfLmZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKF8udW5pcShhcnJheSksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBfLmV2ZXJ5KHJlc3QsIGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiBfLmluZGV4T2Yob3RoZXIsIGl0ZW0pID49IDA7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTsgfSk7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoXy5wbHVjayhhcmd1bWVudHMsIFwibGVuZ3RoXCIpLmNvbmNhdCgwKSk7XG4gICAgdmFyIHJlc3VsdHMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRzW2ldID0gXy5wbHVjayhhcmd1bWVudHMsICcnICsgaSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICBpZiAobGlzdCA9PSBudWxsKSByZXR1cm4ge307XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1dID0gdmFsdWVzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1bMF1dID0gbGlzdFtpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBJZiB0aGUgYnJvd3NlciBkb2Vzbid0IHN1cHBseSB1cyB3aXRoIGluZGV4T2YgKEknbSBsb29raW5nIGF0IHlvdSwgKipNU0lFKiopLFxuICAvLyB3ZSBuZWVkIHRoaXMgZnVuY3Rpb24uIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW5cbiAgLy8gaXRlbSBpbiBhbiBhcnJheSwgb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgaWYgKHR5cGVvZiBpc1NvcnRlZCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpID0gKGlzU29ydGVkIDwgMCA/IE1hdGgubWF4KDAsIGwgKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbDsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbGFzdEluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgXy5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBmcm9tKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaGFzSW5kZXggPSBmcm9tICE9IG51bGw7XG4gICAgaWYgKG5hdGl2ZUxhc3RJbmRleE9mICYmIGFycmF5Lmxhc3RJbmRleE9mID09PSBuYXRpdmVMYXN0SW5kZXhPZikge1xuICAgICAgcmV0dXJuIGhhc0luZGV4ID8gYXJyYXkubGFzdEluZGV4T2YoaXRlbSwgZnJvbSkgOiBhcnJheS5sYXN0SW5kZXhPZihpdGVtKTtcbiAgICB9XG4gICAgdmFyIGkgPSAoaGFzSW5kZXggPyBmcm9tIDogYXJyYXkubGVuZ3RoKTtcbiAgICB3aGlsZSAoaS0tKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gYXJndW1lbnRzWzJdIHx8IDE7XG5cbiAgICB2YXIgbGVuID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciBpZHggPSAwO1xuICAgIHZhciByYW5nZSA9IG5ldyBBcnJheShsZW4pO1xuXG4gICAgd2hpbGUoaWR4IDwgbGVuKSB7XG4gICAgICByYW5nZVtpZHgrK10gPSBzdGFydDtcbiAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV1c2FibGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHByb3RvdHlwZSBzZXR0aW5nLlxuICB2YXIgY3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICB2YXIgYXJncywgYm91bmQ7XG4gICAgaWYgKG5hdGl2ZUJpbmQgJiYgZnVuYy5iaW5kID09PSBuYXRpdmVCaW5kKSByZXR1cm4gbmF0aXZlQmluZC5hcHBseShmdW5jLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGZ1bmMpKSB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgYm91bmQpKSByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICB2YXIgc2VsZiA9IG5ldyBjdG9yO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQmluZCBhbGwgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0XG4gIC8vIGFsbCBjYWxsYmFja3MgZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgZnVuY3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKFwiYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lc1wiKTtcbiAgICBlYWNoKGZ1bmNzLCBmdW5jdGlvbihmKSB7IG9ialtmXSA9IF8uYmluZChvYmpbZl0sIG9iaik7IH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW8gPSB7fTtcbiAgICBoYXNoZXIgfHwgKGhhc2hlciA9IF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBfLmhhcyhtZW1vLCBrZXkpID8gbWVtb1trZXldIDogKG1lbW9ba2V5XSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpeyByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTsgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIF8uZGVsYXkuYXBwbHkoXywgW2Z1bmMsIDFdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcHJldmlvdXMgPSBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlID8gMCA6IG5ldyBEYXRlO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IG5ldyBEYXRlO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIH0gZWxzZSBpZiAoIXRpbWVvdXQgJiYgb3B0aW9ucy50cmFpbGluZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICAvLyBiZSB0cmlnZ2VyZWQuIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBpdCBzdG9wcyBiZWluZyBjYWxsZWQgZm9yXG4gIC8vIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICAvLyBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICBfLmRlYm91bmNlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNvbnRleHQgPSB0aGlzLCBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBpZiAoIWltbWVkaWF0ZSkgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIH07XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIGlmIChjYWxsTm93KSByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gW2Z1bmNdO1xuICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHdyYXBwZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBuYXRpdmVLZXlzIHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogIT09IE9iamVjdChvYmopKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG9iamVjdCcpO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSB2YWx1ZXMucHVzaChvYmpba2V5XSk7XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBwYWlycyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHBhaXJzLnB1c2goW2tleSwgb2JqW2tleV1dKTtcbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXN1bHRbb2JqW2tleV1dID0ga2V5O1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoY2xhc3NOYW1lID09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgZm9yICh2YXIga2V5IGluIGEpIHtcbiAgICAgICAgaWYgKF8uaGFzKGEsIGtleSkpIHtcbiAgICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlci5cbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIGIpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9ICFzaXplO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBlYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiAhIShvYmogJiYgXy5oYXMob2JqLCAnY2FsbGVlJykpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuXG4gIGlmICh0eXBlb2YgKC8uLykgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdG9ycy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBpKTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBtaW4gYW5kIG1heCAoaW5jbHVzaXZlKS5cbiAgXy5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgbWF4ID0gbWluO1xuICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG4gIH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICBlc2NhcGU6IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiN4Mjc7JyxcbiAgICAgICcvJzogJyYjeDJGOydcbiAgICB9XG4gIH07XG4gIGVudGl0eU1hcC51bmVzY2FwZSA9IF8uaW52ZXJ0KGVudGl0eU1hcC5lc2NhcGUpO1xuXG4gIC8vIFJlZ2V4ZXMgY29udGFpbmluZyB0aGUga2V5cyBhbmQgdmFsdWVzIGxpc3RlZCBpbW1lZGlhdGVseSBhYm92ZS5cbiAgdmFyIGVudGl0eVJlZ2V4ZXMgPSB7XG4gICAgZXNjYXBlOiAgIG5ldyBSZWdFeHAoJ1snICsgXy5rZXlzKGVudGl0eU1hcC5lc2NhcGUpLmpvaW4oJycpICsgJ10nLCAnZycpLFxuICAgIHVuZXNjYXBlOiBuZXcgUmVnRXhwKCcoJyArIF8ua2V5cyhlbnRpdHlNYXAudW5lc2NhcGUpLmpvaW4oJ3wnKSArICcpJywgJ2cnKVxuICB9O1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgXy5lYWNoKFsnZXNjYXBlJywgJ3VuZXNjYXBlJ10sIGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIF9bbWV0aG9kXSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgaWYgKHN0cmluZyA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gKCcnICsgc3RyaW5nKS5yZXBsYWNlKGVudGl0eVJlZ2V4ZXNbbWV0aG9kXSwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGVudGl0eU1hcFttZXRob2RdW21hdGNoXTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEFkZCB5b3VyIG93biBjdXN0b20gZnVuY3Rpb25zIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5taXhpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSl7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx0JzogICAgICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx0fFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHZhciByZW5kZXI7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICAgICAgLnJlcGxhY2UoZXNjYXBlciwgZnVuY3Rpb24obWF0Y2gpIHsgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdOyB9KTtcblxuICAgICAgaWYgKGVzY2FwZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGVzY2FwZSArIFwiKSk9PW51bGw/Jyc6Xy5lc2NhcGUoX190KSkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArIFwicmV0dXJuIF9fcDtcXG5cIjtcblxuICAgIHRyeSB7XG4gICAgICByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHJldHVybiByZW5kZXIoZGF0YSwgXyk7XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBmdW5jdGlvbiBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyAoc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicpICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24sIHdoaWNoIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHdyYXBwZXIuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXyhvYmopLmNoYWluKCk7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsncG9wJywgJ3B1c2gnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuX3dyYXBwZWQ7XG4gICAgICBtZXRob2QuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKChuYW1lID09ICdzaGlmdCcgfHwgbmFtZSA9PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIF8uZXh0ZW5kKF8ucHJvdG90eXBlLCB7XG5cbiAgICAvLyBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gICAgY2hhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fY2hhaW4gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICAgIH1cblxuICB9KTtcblxufSkuY2FsbCh0aGlzKTtcbiJdfQ==
;