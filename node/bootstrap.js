var fs = require('fs');

global.steal = {
	engine : "node",
	
	types : {
		"js" : function(options, success){
			eval(options.text || fs.readFileSync(options.src, 'utf8'));
			success();
		}
	}
};

require("steal/node/node.js");

steal.args = process.argv.slice(2);
steal.env = process.env;
