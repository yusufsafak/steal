global.steal = {
	engine : "node",
	
	types : {
		"js" : function(options, success){
			try{
				if(options.text){
					eval(options.text);
				}else{
					require(options.src);
				}
			}catch(e){
				console.log(e);
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
require(steal.args[0]);
