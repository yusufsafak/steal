require("steal/node/node.js");

(function(win){
	
	var script = process.argv[2]
	win._args = process.argv.slice(3);

	require(script);
	
})(global);
