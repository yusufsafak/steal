var readline = require('readline'),
	sleep = require('node-sleep').sleep;

steal(function( steal ) {
	
	/**
	 * 
	 * @param {String} question
	 * @return {Deferred} resolution of the prompt
	 */
	steal.prompt = function( question ){
		var rl = readline.createInterface(process.stdin, process.stdout, null),
			response;
		
		console.log(question);
		
		rl.question(question, function( r ){
			response = r;
			rl.close();
			process.stdin.destroy(); //?
		});
		
		// it's an ugly hack, but for now too much logic in steal is dependent on
		// steal.prompt being synchronous, so we wait until we get a response
		while( response === undefined ){
			sleep(1);
		}
		
		return response;
	};
	
	/**
	 * 
	 * @param {String} question
	 * @return {Deferred} resolution of the prompt
	 */
	steal.prompt.yesno = function( question ){
		var response = "";
		while (!response.match(/^\s*[yn]\s*$/i) ) {
			response = steal.prompt(question)
		}
		return response.match(/[yn]/i)[0].toLowerCase() == "y";
	};

	/**
	 * Accepts an array of possible arguments and creates global variables for each that is found in args
	 * ie: steal.handleArgs(_args, ["path"])
	 * Args are passed in via command line scripts like this:
	 * js run.js path=/one/two docsLocation=docs
	 * @param {Object} possibleArgs
	 */
	steal.handleArgs = function( args, possibleArgs ) {
		var i, arg, j, possibleArg, matchedArg, results = {};
		for ( i = 0; i < args.length; i++ ) {
			arg = args[i];
			for ( j = 0; j < possibleArgs.length; j++ ) {
				possibleArg = possibleArgs[j];
				reg = new RegExp("^" + possibleArg + "\=([^\\s]+)");
				matchedArg = arg.match(reg);
				if ( matchedArg && matchedArg[1] ) {
					results[possibleArg] = matchedArg[1];
				}
			}
		}
		return results;
	}
});