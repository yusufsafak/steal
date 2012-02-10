(function( window, steal, undefined ) {


	// Grab helper functions off of steal
	var each			= steal.each,
		extend			= steal.extend,
		isString		= steal.isString,
		isFunction		= steal.isFn,
		isObject		= steal.isObject,
		URI				= steal.URI,
		error			= steal.error,
		Deferred		= steal.Deferred,
		isEmptyObject	= function( o ) {
			for ( var name in o ) {
				return false;
			}
			return true;
		},
		indexOf			= function( arr, item ) {
			for ( var i = 0, len = arr.length; i < len; i++ ) {
				if ( arr[i] == item ) {
					return i;
				}
			}
			return -1;
		},
		map				= function( arr, callback ) {
			var results = [];
			each( arr, function( i, value ) {
				var temp = callback ? callback.call( arr, value, i, arr ) : value;
				if ( temp !== false ) {
					results.push( temp );
				}
			});
			return results;
		},

		// Array to store what's current being required to track circular
		// dependencies
		idQueue			= [],
		defineQueue		= [],
		requiring		= [],
		defining		= [],
		callbacks		= [],
		plugins			= {},

		// Key-value store for modules
		paths			= {},
		modules			= {},
		mappings		= {
			urlToId : {},
			idToUrl : {}
		},
		
		geval = window.execScript || eval,

		isRequiring = false,

		// Thanks lsjs
		funcStrRegex = /[^\d\w\.]require\(["']([^'"\s]+)["']\)/g,

		// Given an array of dependencies, return an array of modules
		// that we don't have defined yet
		getUnmet		= function( needs ) {
			return map( needs || [], function( id ) {
				if ( ! isString( id )) {
					return false;
				}
				
				if (	id != "exports" && 
						id != "module"  && 
						indexOf( requiring, id ) < 0 &&
						indexOf( defining, id ) < 0 ) {
					if ( ! modules[ id ] ) {
						return id;
					} else {
						return false;
					}
				} else {
					return false;
				}
			});
		},
		// Given an array of dependencies, return an array of the module
		// definitions for them while returning undefined for circular
		// dependencies
		getArgs			= function ( needs ) {
			return map( needs || [], function( id ) {
				if ( isString( id )) {
					if ( indexOf( requiring, id ) > -1 || indexOf( defining, id ) > -1 ) {
						return undefined;
					} else {
						return modules[ id ];
					}
				} else {
					return id;
				}
			});
		},
		idToUri = (function() {

			var pathParts = window.location.pathname.split("/"),
				origin = [ window.location.protocol, window.location.host ].join("//"),
				root;

			pathParts.pop();

			return function( id, ext ) {

				if ( id.indexOf("://") > -1 ) {
					return id;
				}

				var pathPartsCopy = pathParts.slice(),
					idParts = id.split("/"),
					temp;

				// Join paths
				while ( idParts[0] == ".." ) {
					pathPartsCopy.pop();
					idParts.shift();
				}

				// Remove relative dot
				if ( idParts[0] == "." ) {
					idParts.shift();
				}

				// Remove plugins
				temp = idParts.pop();
				idParts.push( temp.split("!").pop() );
				
				// Add js if it doesn't have an extension
				if ( ! ext && idParts.slice( -1 ).pop().split(".").length == 1 ) {
					ext = ".js"
				}

				return origin + ( pathPartsCopy.concat( idParts ).join("/") ) + ext;
			}
		}()),
		// Given an array of module ids, return an array of URI's they resolve
		// to
		resolveUris		= function( unmet ) {
			return map( unmet, function( id ) {
				var path = idToUri( id );
				mappings.urlToId[ path ] = id;
				mappings.idToUrl[ id ] = path;
				return path;
			});
		},
		evalDefine		= function( id, deps, factory, callback ) {
			var exports = {},
				module = {},
				definition,
				args,
				unmet;

			// Replace module and exports in the deps if they exist
			if ( deps ) {
				each({
					"module" : module,
					"exports" : exports
				}, function( key, value ) {
					var index = indexOf( deps, key );
					if ( index > -1 ) {
						deps.splice( index, 1, value );
					}
				});
			}

			// Figure out which dependencies haven't been defined yet
			unmet = getUnmet( deps );

			// Define them
			if ( unmet.length ) {
				each(unmet, function( i, dep ) {
					process( dep );
				});
			}

			// Grab arguments
			args = getArgs( deps );

			definition = isFunction( factory ) ? 
				factory.apply( window, args ) : 
				factory;


			if ( ! isEmptyObject( exports )) {
				modules[ id ] = exports;
			} else if ( ! isEmptyObject( module )) {
				modules[ id ] = module;
			} else {
				modules[ id ] = definition;
			}

			if ( modules[ id ].load ) {
				plugins[ id ] = modules[ id ];
			}

			extend( modules[ id ], {
				module : {
					id : id
				},
				url : modules[ id ].url || mappings.idToUrl[id]
			});


			// Clean up requiring
			requiring.splice( indexOf( requiring, id ), 1);
			defining.splice( indexOf( defining, id ), 1);

		},
		process = function( dep, holdCallbacks ) {

			var args, id, index;

			// If we're processing a specific dependency...
			if ( dep ) {
				index = indexOf( idQueue, dep );
				args = defineQueue.splice( index, 1 )[0];
				id = idQueue.splice( index, 1 )[0];
			} else {
				args = defineQueue.pop();
				id = idQueue.pop();
			}
			if ( args ) {

				// Set id if anonymous
				args[0] = args[0] || id;

				defining.push( id );
				evalDefine.apply( window, args );

				if ( ! dep ) {
					if ( defineQueue.length ) {
						process();
					}
					if ( callbacks.length && ! holdCallbacks ) {
						runCallbacks();
					}
				}
			}
		},
		runCallbacks = function() {
			var temp	= callbacks.pop(),
				deps	= temp.shift(),
				cb		= temp.shift(),
				args	= getArgs( deps );

			cb.apply( window, args );

			if ( callbacks.length && ! isRequiring ) {
				runCallbacks();
			}
			
		},
		replacePaths = function( arr ) {
			return map( arr, function( dep ) {
				return paths[ dep ] || dep;
			});
		},
		oldJsTypeRequire = steal.types.js.require;
	
	// Add globals to the window
	extend( window, {

		// cases to handle:
		// define ("foo", ["bar", "lol", "wat"], function() {});
		// define ("foo", ["bar", "lol", "wat"], {});
		define: function( id, deps, factory ) {

			var dfd = new Deferred();

			// A bunch of checks to figure out what we actually have for
			// arguments
			if ( id && deps && ! factory ) {
				
				// define ("foo", function() {});
				// define ("foo", {});
				if ( isString( id ) ) {
					factory = deps;
					deps = undefined;

				// define (["bar", "lol", "wat"], function() {});
				// define (["bar", "lol", "wat"], {});
				} else {
					factory = deps;
					deps = id;
					id = undefined;
				}

			// define (function() {});
			// define ({});
			} else if ( id && ! deps && ! factory ) {
				factory = id;
				id = undefined;
			}

			deps = deps || [];

			// Find dependencies in the define function
			if ( ! deps.length && isFunction( factory )) {

				factory.toString().replace( funcStrRegex, function( t, dep ) {
					deps.push( dep );
				});
				/** /
				try {
					factory(function( dep ) {
						deps.push( dep );
					}, {}, {})
				} catch( e ) {}
				/**/

				deps = (factory.length === 1 ? 
							["require"] : 
							["require", "exports", "module"]
						).concat( deps );
			}


			defineQueue.push([id, deps, factory]);
			// Grab unmet dependencies
			unmet = getUnmet( deps );
			
			// If we have unmet deps
			if ( unmet.length ) {
				each( unmet, function( i, dep ) {
					require( [dep] );
				});
			}

		},

		require: function( deps, callback ) {

			var pluginsArr = [],
				pluginsDfd = new Deferred(),
				dfd, unmet, uris;

			// Synchronous call
			if ( isString( deps )) {


				if ( modules[ deps ] ) {
					return modules[ deps ];
				} else {
					error( "Synchronous require: no module definition " + 
						"exists for " + deps );
				}

			// Asynchronous call
			} else {
				
				// Find plugins, if any and load them
				each( deps, function( i, dep ) {
					var parts = dep.split("!");
					if ( parts.length > 1 ) {
						parts.pop();
						pluginsArr = pluginsArr.concat( parts );
					}
				});

				// Update paths from config
				deps = replacePaths( deps );
				
				// Make sure we don't load anything until we have all the
				// plugins
				pluginsDfd.done(function() {
					
					// Add callback to stack
					if ( callback ) {
						callbacks.push( [ deps, callback ] );
					}

					// Get the list of unmet dependencies 
					unmet = getUnmet( deps );

					// If we have unmet dependencies
					if ( unmet.length ) {

						isRequiring = true;

						// Keep track of what we're requiring so we can track down
						// circular dependencies
						requiring.push.apply( requiring, unmet );

						// Get the URIs of all the unmet dependencies
						uris = resolveUris( unmet )

						// Get a single callback for when all the unmet
						// dependencies have loaded
						Deferred.when.apply( Deferred, map( uris, function( dep, i ) {
							
							// Figure out if we need to load a plugin
							var parts = deps[i].split("!"),
								innerDeferred = new Deferred(),
								load = function( value ) {
									modules[ unmet[i] ] = value;
									innerDeferred.resolve();
								},
								plugin, normalized;
								
							// This means theres a plugin
							if ( parts.length == 2 ) {
								plugin = parts.shift();

								extend( load, {
									fromText : function( name, text ) {
										geval( text );
										idQueue.push( mappings.urlToId[name] );
										process( mappings.urlToId[name] );
									}
								});

								// if the plugin has a normalize method, use it
								normalized = plugins[ plugin ].normalize ?
									plugins[ plugin ].normalize( unmet[i], idToUri ) :
									dep;



								plugins[ plugin ].load( normalized, require, load, {});
							} else {
								steal({
									src: dep,
									type: "js",
									onload: function( script ) {
										idQueue.push( mappings.urlToId[script.src] );
										innerDeferred.resolve();
									}
								});
							}
							return innerDeferred;
						})).done(function() {
							var shouldProcess = true;

							// Clean up our requiring list for circular deps 
							each( unmet, function( i, id ) {
								requiring.splice( indexOf( requiring, id ), 1);
							});


							each( requiring, function( i, id ) {
								if ( indexOf( idQueue, id ) == -1) {
									shouldProcess = false;
								}
							});

							if ( shouldProcess ) {
								isRequiring = false;
								process();
							}

						});

					}
				});

				if ( pluginsArr.length ) {
					Deferred.when.apply( Deferred, map( pluginsArr, function( plugin ) {
						var dep = idToUri( plugin ),
							innerDeferred = new Deferred();

						steal({
							src: dep,
							type: "js",
							onload: function( script ) {
								idQueue.push( plugin );
								process( plugin, false );
								innerDeferred.resolve();
							}
						});
						return innerDeferred;
					})).done(function() {
						pluginsDfd.resolve();
					})
				} else {
					pluginsDfd.resolve();
				}
				
			}
			return dfd;
		},

		config: function( o ) {

			if ( o.paths ) {
				extend( paths, o.paths );
			}

		}
	});

	extend( window.require, {
		toUrl : function( uri ) {
			var parts = uri.split("."),
				ext = "." + parts.pop();
			return idToUri( parts.join("."), ext);
		}
	});

	// Clobber js type so we can get access to the event object
	steal.types.js.require = function( options, success, error ) {
		var duck = function() {
			if ( options.onload ) {
				options.onload.apply( this, arguments );
			}
			success.apply( this, arguments );
		};
		oldJsTypeRequire.call( this, options, duck, error );
	};

	extend( window.define, {
		amd : {}
	});

	modules.require = window.require;

}( window, steal ));
