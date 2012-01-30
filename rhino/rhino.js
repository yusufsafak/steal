// A Rhino-version of steal
(function(win){
	
	if(typeof console == 'undefined'){
		console = {
			log: function(){
				print.apply(null, arguments)
			}
		}
	}
	
	win.steal = {
		engine : "rhino",
		
		types : {
			"js" : function(options, success){
				if(options.text){
					eval(text)
				}else{
					load(options.src)
				}
				success()
			}
		}
	}
	
	load("steal/steal.js");
	load("steal/rhino/file.js");
	load("steal/rhino/system.js");
	load("steal/rhino/prompt.js");
	
	var script = _args[0];
	win._args = _args.slice(1);
	
	load(script);
	
})(this, arguments);
