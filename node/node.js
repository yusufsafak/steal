(function(win){
	
	win.steal = {
		//isRhino : true,
		
		engine : "node",
		
		types : {
			"js" : function(options, success){
				if(options.text){
					eval(text)
				}else{
					console.log('stealing', options.src);
					require(options.src);
				}
				success()
			}
		}
	}
	
	require("steal/steal.js");
	require("steal/node/file.js");
	require("steal/node/system.js");
	require("steal/node/prompt.js");
	
	var script = process.argv[2]
	win._args = process.argv.slice(3);
	
	require(script);

})(global);
