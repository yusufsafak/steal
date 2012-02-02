(function(win){
	
	var fs = require('fs'),
		path = require('path');
	
	win.steal = {
		engine : "node",
		
		types : {
			"js" : function(options, success){
				if(options.text){
					eval(text)
				}else{
					require(options.src);
				}
				success()
			}
		}
	};
	
	win.readFile = function( pathname ){
		return fs.readFileSync(pathname, 'utf8');
	};
	
	win.print = function(){
		console.log.apply(console, arguments);
	};
	
	win.quit = function(){
		process.exit();
	};
	
	require("steal/steal.js");
	require("steal/node/file.js");
	require("steal/node/system.js");
	require("steal/node/prompt.js");
	
})(global);
