var fs = require('fs'),
	murl = require('url'),
	phantom = require('phantom');

steal(function(s){
	// Methods for walking through steal and its dependencies
	
	// which steals have been touched in this cycle
	var touched = {},
		
		//recursively goes through dependencies
		// stl - a steal
		// CB - a callback for each steal
		// depth - true if it should be depth first search, defaults to breadth
		iterate = function(stl, CB, depth){
			// load each dependency until
			var i = 0,
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

		var pageRoot;

		phantom.create(['--local-to-remote-url-access=yes'], function(ph){
			ph.createPage(function(page){
				page.set('onResourceReceived', function(res){
					if(res.stage == 'end'){
						if(/steal\.js/.test(res.url)){
							page.evaluate(function(){
								steal.isBuilding = true;
								steal.one('done', function(deps){
									alert(JSON.stringify(deps));
								});
								return steal.root.path;
							}, function(result){
								pageRoot = result;
								console.log('pageRoot=', pageRoot);
							});
						}else{
							if(/jquery\.js/.test(res.url)){
								page.evaluate(function(){
									jQuery.readyWait++;
								});
							}
						}
					}
				});
				page.set('onAlert', function(msg){
					console.log('here?')
					try{
						var deps = JSON.parse(msg);
						if(deps.dependencies){
							setTimeout(function(){
								doneCb(deps);
							}, 0);
							ph.exit();
						}
					}catch(e){}
				});
				page.open(url);
			});
		});

		// what gets called by steal.done
		function doneCb(init){
			console.log('page load completed')
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
							func(stealer.options, loadScriptText(stealer.options), stealer);
						}
					}, depth);
				},
				steal: steal,
				url: url,
				firstSteal: init
			});
		}

		function loadScriptText(options){
			if(options._skip){ // if we skip this script, we don't care about its contents
				return "";
			}
			
			if(options.text){
				return options.text;
			}
			
			// src is relative to the page, we need it relative
			// to the filesystem
			var src = options.src,
				url = src.match(/([^\?#]*)/)[1],
				text = "";
			
			url = murl.resolve(pageRoot, url);
			
			if( url.match(/^https?\:/) ){
				text = ''; // TODO: readUrl(url);
			}else{
				if( url.match(/^file\:/) ){
					url = url.replace("file://", "");
				}
				text = fs.readFileSync(url, 'utf8');
			}

			return text;
		}
	};
});
