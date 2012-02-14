(function(win, args){
	
	// Node/CommonJS compatibility layer
	
	if( typeof require == 'undefined' ){
		win.require = function(module){
			if( module != 'steal' ){
				throw new Error('tried to require non-steal');
			}
		}
	}
	
	if( typeof console == 'undefined' ){
		win.console = {
			log: function(){
				print.apply(null, arguments)
			}
		}
	}
	
	// steal config
	win.steal = {
		engine: "rhino",
		
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
	};
	
	// load steal and the Rhino adapters
	load("steal/rhino/rhino.js");
	
	steal.args = args.slice(1);
	steal.env = (function(javaEnv, env){
		while( javaEnv.hasNext() ){
			var entry = javaEnv.next();
			env[entry.key] = entry.value;
		}
		return env;
	}(java.lang.System.getenv().entrySet().iterator(), {}));
	
	// run the user script
	load(args[0]);
	
})(this, arguments);
