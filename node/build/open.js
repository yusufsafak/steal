var fs = require('fs'),
	murl = require('url'),
	jsdom = require('jsdom');

steal(/*'steal/build/scripts', */function(s){
	// Methods for walking through steal and its dependencies
	
	// which steals have been touched in this cycle
	var touched = {},
		
		//recursively goes through dependencies
		// stl - a steal
		// CB - a callback for each steal
		// depth - true if it should be depth first search, defaults to breadth
		iterate = function(stl, CB, depth){
			// load each dependency until
			var i =0,
				depends = stl.dependencies.slice(0); 

			// this goes through the scripts until it finds one that waits for 
			// everything before it to complete
			while(i < depends.length){
				
				if(depends[i].waits){
					// once we found something like this ...
					
					var steals = depends.splice(0,i);
					
					// load all these steals, and their dependencies
					loadset(steals, CB, depth);
					
					// does it need to load the depend itself?
					
					// load any dependencies 
					loadset(depends.shift().dependencies, CB)
					i=0;
				}else{
					i++;
				}
			}
			
			// if there's a remainder, load them
			if(depends.length){
				loadset(depends, CB, depth);
			}
		  
		},
		// loads each steal 'in parallel', then 
		// loads their dependencies one after another
		loadset = function(steals, CB, depth){
			// doing depth first
			if(depth){
				// do dependencies first
				eachSteal(steals, CB, depth)
				
				// then mark
				touch(steals, CB);
			} else {
				touch(steals, CB);
				eachSteal(steals, CB, depth)
			}
		},
		touch = function(steals, CB){
			for(var i =0; i < steals.length; i++){
				// print("  Touching "+steals[i].options.rootSrc)
				if(!touched[steals[i].options.rootSrc]){
					
					CB( steals[i] );
					touched[steals[i].options.rootSrc] = true;
				}
				
			}
		},
		eachSteal = function(steals, CB, depth){
			for(var i =0; i < steals.length; i++){
				iterate(steals[i], CB, depth)
			}
		};
	
	/**
	 * @function open
	 * 
	 * Opens a page and returns helpers that can be used to extract steals and their 
	 * content
	 * 
	 * Opens a page by:
	 *   temporarily deleting the rhino steal
	 *   opening the page with Envjs
	 *   setting back rhino steal, saving envjs's steal as steal._steal;
	 * @param {String} url the html page to open
	 * @return {Object} an object with properties that makes extracting 
	 * the content for a certain tag slightly easier.
	 * 
	 */ 
	steal.build.open = function( url, stealData, cb, depth ){
		// TODO: need to handle setting up the steal config in the new window
		if ( typeof stealData == 'object') {
		}else{
			cb = stealData;
		}

		// what gets called by steal.done
		var html = fs.readFileSync(url, 'utf8'),
			dom = jsdom.jsdom(html, null, { url: url }),
			win = dom.createWindow(),

			doneCb = function(init){
				// callback with the following
				cb({
					/**
					 * @hide
					 * Goes through each steal and gives its content.
					 * How will this work with packages?
					 * @param {Object} [type] the tag to get
					 * @param {Object} func a function to call back with the element and its content
					 */
					each: function( filter, func ) {
						// reset touched
						touched = {};
						if ( !func ) {
							func = filter;
							filter = function(){return true;};
						}

						if(typeof filter == 'string'){
							var resource = filter;
							filter = function(stl){
								return stl.options.buildType === resource;
							}
						}
						
						iterate(init, function(stealer){
							if(filter(stealer)){
								func(stealer.options, loadScriptText(win, stealer.options), stealer);
							}
						}, depth);
					},
					steal: win.steal,
					url: url,
					firstSteal: init
				});
			};
		
		win.onload = function(){
			// if there's timers (like in less) we'll never reach next line 
			// unless we bind to done here and kill timers
			win.steal.one('done', function(init){
				// prevent $(document).ready from being called even though load is fired
				//win.jQuery && win.jQuery.readyWait++;

				// fire the done callback
				doneCb(init);
			});
		};
	};
	
	var loadScriptText = function( win, options ){
		if(options.text){
			return options.text;
		}
		
		// src is relative to the page, we need it relative
		// to the filesystem
		var src = options.src,
			text = "",
			base = "" + win.location,
			url = src.match(/([^\?#]*)/)[1];
		
		url = murl.resolve(base, url);
		
		if( url.match(/^https?\:/) ){
			text = ''; //readUrl(url);
		}else{
			if( url.match(/^file\:/) ){
				url = url.replace("file:/", "");
			}
			text = fs.readFileSync(url);
		}

		return text;
	};
});
