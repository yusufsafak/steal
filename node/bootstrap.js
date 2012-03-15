var fs = require('fs');

global.steal = {
	engine : "node",
	
	types : {
		"js" : function(options, success){
			try{
				eval(options.text || fs.readFileSync(options.src, 'utf8'));
			}catch(e){
				//console.log(e);
				//console.log(e.stack);
				//throw e;
			}
			success();
		}
	}
};

require("steal/node/node.js");

steal.args = process.argv.slice(2);
steal.env = process.env;
