var fs = require('fs'),
	murl = require('url'),
	jsdom = require('jsdom');

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

		// hook into loader so we know when steal and jquery are loaded
		var loader = jsdom.dom.level3.html.resourceLoader,
			oldLoad = loader.load;

		loader.load = function(element, href, callback){
			oldLoad.call(loader, element, href, callback);

			if( href.indexOf('jquery.js') >= 0 ){
				element.addEventListener('load', function(){
					win.jQuery.readyWait++;
				}, false);
			}else if( href.indexOf('steal.js') >= 0 ){
				element.addEventListener('load', function(){
					win.steal.one('done', doneCb);
				}, false);
			}
		};

		var	html = fs.readFileSync(url, 'utf8'),
			url = steal.File(url).joinFrom(process.cwd()),
			dom = jsdom.jsdom(html, null, { url: url }),
			win = dom.createWindow(),

			// what gets called by steal.done
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
					steal: steal,
					url: url,
					firstSteal: init
				});
			};

		steal.extend(win, {
			// let us see page output
			console: console,

			// stub
			postMessage: function(){},

			// patch in a barebones XHR for getting steal resources
			XMLHttpRequest: function(){}
		});

		steal.extend(win.XMLHttpRequest.prototype, {
			// dummy element for loading ajax requests
			script: dom.createElement('script'),

			setRequestHeader: function(){},

			open: function(method, url){
				this.src = url;
				this.readyState = 0;
			},
			
			send: function(){
				loader.load(this.script, this.src, function(data, url){
					this.responseText = data;
					this.readyState = 4;
					this.status = 200;

					if( this.onreadystatechange ){
						this.onreadystatechange();
					}
				}.bind(this));
			}
		});

		win.addEventListener('error', function(err, url, lineNum){
			console.log('============ ERROR =============');
			console.log(err, url, lineNum);
			console.log(err.stack);
			return false;
		}, false);
	};
	
	var loadScriptText = function( win, options ){
		if(options.text){
			return options.text;
		}
		
		// src is relative to the page, we need it relative
		// to the filesystem
		var src = options.src,
			text = "",
			base = win.location.href,
			url = src.match(/([^\?#]*)/)[1];
		
		url = murl.resolve(base, url);
		
		if( url.match(/^https?\:/) ){
			text = ''; // TODO: readUrl(url);
		}else{
			if( url.match(/^file\:/) ){
				url = url.replace("file:/", "");
			}
			text = fs.readFileSync(url, 'utf8');
		}

		return text;
	};
});
