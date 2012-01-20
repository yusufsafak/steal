(function( window, steal, undefined ) {

	console.log = console.info;

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

		// Key-value store for modules
		modules			= {},
		// Array to store what's current being required to track circular
		// dependencies
		idQueue			= [],
		defineQueue		= [],
		requiring		= [],
		getUnmet		= function( needs ) {
			return map( needs || [], function( id ) {
				if (	id != "exports" && 
						id != "module"  && 
						indexOf( requiring, id ) < 0 ) {
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
		getArgs			= function ( needs ) {
			return map( needs || [], function( id ) {
				if ( isString( id )) {
					if ( indexOf( requiring, id ) > -1 ) {
						return undefined;
					} else {
						return modules[ id ];
					}
				} else {
					return id;
				}
			});
		},
		resolveUris		= (function(){
			var parts = window.location.pathname.split("/"),
				currentPage;
			parts.pop();
			currentPage = parts.join("/");

			return function( unmet ) {
				return map( unmet, function( uri ) {
					return currentPage + "/" + uri + ".js";
				});
			}
		}()),
		evalDefine		= function( id, deps, factory ) {
			var exports = {},
				module = {};

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

			args = getArgs( deps );

			definition = isFunction( factory ) ? 
				factory.apply( window, args ) : 
				factory;

			/**/
			if ( ! isEmptyObject( exports )) {
				modules[ id ] = exports;
			} else if ( ! isEmptyObject( module )) {
				modules[ id ] = module;
			} else {
				modules[ id ] = definition;
			}
			modules[ id ].module = {
				id : id
			}
		}
	
	// Add globals to the window
	extend( window, {

		// cases to handle:
		// define ("foo", ["bar", "lol", "wat"], function() {});
		// define ("foo", ["bar", "lol", "wat"], {});
		define: function( id, deps, factory ) {

			var deferred = new Deferred(),
				unmet;

			//console.info( "define(", id, deps, factory, ") - init");

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

			console.log("pushing", [ id, deps, factory ], "onto defineQueue");
			defineQueue.push([ id, deps, factory ]);

			unmet = getUnmet( deps );
			
			// If we have unmet deps
			if ( unmet.length ) {
				Deferred
					.when( map( unmet, function( id, i ) {
						var dfd = new Deferred();
						require( [id], function() {
							dfd.resolve();
						});
						return dfd;
					}))
					.done(function() {
						deferred.resolve();
					});
			}
			// No unmet deps, just resolve!
			else {
				deferred.resolve();
			}

		},

		require: function( deps, callback ) {

			var deferred, unmet, uris;

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

				// Create a deferred to control flow
				deferred = new Deferred();

				deferred.done(function() {
					while( defineQueue.length ) {
						var id, args;
						id = idQueue.shift(); 
						args = defineQueue.shift();
						args[0] = args[0] || id;
						console.info("defining module with args", args );
						evalDefine.apply( window, args);
					}
					callback.apply( window, getArgs( deps ));
				});

				// Get the list of unmet dependencies 
				unmet = getUnmet( deps );

				// If we have unmet dependencies
				if ( unmet.length ) {

					// Keep track of what we're requiring so we can track down
					// circular dependencies
					requiring = requiring.concat( unmet );

					// Get the URIs of all the unmet dependencies
					uris = resolveUris( unmet )

					// Get a single callback for when all the unment
					// dependencies have loaded
					Deferred.when.apply( Deferred, map( uris, function( dep, i ) {
						var innerDeferred = new Deferred();
						console.log("stealing", dep);
						steal( dep, function() {
							console.log("in then for", dep);
							idQueue.push( unmet[i] ); 
							innerDeferred.resolve(unmet[i]);
						});
						return innerDeferred;
					})).done(function() {
						console.log("DONE", arguments);

						// Clean up our requiring list for circular deps 
						each( unmet, function( i, id ) {
							requiring.splice( indexOf( requiring, id ), 1);
						});

						// if there's a callback, call it with the dependencies
						deferred.resolve();

					});
				}
				// No unmet dependencies, just resolve!
				else {
					deferred.resolve();
				}
			}
			return deferred;
		}

	});

	extend( window.define, {
		amd : {}
	});

	modules.require = window.require;

}( window, steal ));
