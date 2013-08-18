var fs = require('fs');

function include(path, originalRequire, context) {
	var path = __dirname + '/' + path;
	var code = String(fs.readFileSync(path));
	(function() {
		var exports = {};
		var require = function(path) {
			if (path[0] === '.') {
				console.log('../lib/' + path);
				return originalRequire('../lib/' + path);
			} else {
				return originalRequire(path);
			}
		};
		with() {
			global.eval(code, path);
		}
	})();
}

exports.include = include;