'use strict';

function ErrorUtils(source) {
	this.source = source;
}

ErrorUtils.prototype.createError = function() {
	return {
	  code: 0,
	  name: 'Error',
	  source: this.source,
	  messages: ['An error occured']
	}
}

ErrorUtils.prototype.createValidationError = function(messages) {
	return {
		code: 101,
		name: 'Validation Error',
		source: this.source,
		messages: messages
	}
}

exports.ErrorUtils = ErrorUtils;
