global.steal = {
	engine : "node",
	
	types : {
		"js" : function(options, success){
			if(options.text){
				eval(text);
			}else{
				require(options.src);
			}
			success();
		}
	}
};

require("steal/node/node.js");

steal.args = process.argv.slice(2);
steal.env = process.env;
