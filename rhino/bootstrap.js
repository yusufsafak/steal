// A Rhino-version of steal
(function(win, _args){
	
	load("steal/rhino/rhino.js");
	
	var script = _args[0];
	win._args = _args.slice(1);
	
	load(script);
	
})(this, arguments);
