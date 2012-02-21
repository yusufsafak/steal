steal.then(function( steal ){
	//various compressors
	steal.build.builders.scripts.compressors = {
		none: function(){
			steal.print("steal.compress - Using no compression");
			return function(src){
				return src;
			};
		},
		// needs shrinksafe.jar at steal/build/javascripts/shrinksafe.jar
		shrinksafe: function() {
			steal.print("steal.compress - Using ShrinkSafe");
			// importPackages/Class doesn't really work
			var URLClassLoader = Packages.java.net.URLClassLoader,
				URL = java.net.URL,
				File = java.io.File,
				ss = new File("steal/build/javascripts/shrinksafe.jar"),
				ssurl = ss.toURL(),
				urls = java.lang.reflect.Array.newInstance(URL, 1);
			urls[0] = new URL(ssurl);

			var clazzLoader = new URLClassLoader(urls),
				mthds = clazzLoader.loadClass("org.dojotoolkit.shrinksafe.Compressor").getDeclaredMethods(),
				rawCompress = null;

			//iterate through methods to find the one we are looking for
			for ( var i = 0; i < mthds.length; i++ ) {
				var meth = mthds[i];
				if ( meth.toString().match(/compressScript\(java.lang.String,int,int,boolean\)/) ) {
					rawCompress = meth;
				}
			}
			return function( src ) {
				var zero = new java.lang.Integer(0),
					one = new java.lang.Integer(1),
					tru = new java.lang.Boolean(false),
					script = new java.lang.String(src);
				return rawCompress.invoke(null, script, zero, one, tru);
			};
		},
		closureService: function() {
			steal.print("steal.compress - Using Google Closure Service");

			return function( src ) {
				var xhr = new XMLHttpRequest();
				xhr.open("POST", "http://closure-compiler.appspot.com/compile", false);
				xhr.setRequestHeader["Content-Type"] = "application/x-www-form-urlencoded";
				var params = "js_code=" + encodeURIComponent(src) + "&compilation_level=WHITESPACE_ONLY" + "&output_format=text&output_info=compiled_code";
				xhr.send(params);
				return "" + xhr.responseText;
			};
		},
		uglify: function() {
			steal.print("steal.compress - Using Uglify");
			return function( src, quiet ) {
				var rnd = Math.floor(Math.random() * 1000000 + 1),
					origFileName = "tmp" + rnd + ".js",
					origFile = new steal.File(origFileName);

				origFile.save(src);


				var outBaos = new java.io.ByteArrayOutputStream(),
					output = new java.io.PrintStream(outBaos);
					
				runCommand("node", "steal/build/scripts/uglify/bin/uglifyjs", origFileName,
					{ output: output }
				);
			
				origFile.remove();

				return outBaos.toString();
			};
		},
		localClosure: function() {
			//was unable to use SS import method, so create a temp file
			steal.print("steal.compress - Using Google Closure app");
			return function( src, quiet, currentLineMap ) {
				var rnd = Math.floor(Math.random() * 1000000 + 1),
					filename = "tmp" + rnd + ".js",
					tmpFile = new steal.File(filename);

				tmpFile.save(src);

				var outBaos = new java.io.ByteArrayOutputStream(),
					output = new java.io.PrintStream(outBaos),
					options = {
						err: '',
						output: output
					};
				if ( quiet ) {
					runCommand("java", "-jar", "steal/build/scripts/compiler.jar", "--compilation_level", "SIMPLE_OPTIMIZATIONS", 
						"--warning_level", "QUIET", "--js", filename, options);
				} else {
					runCommand("java", "-jar", "steal/build/scripts/compiler.jar", "--compilation_level", "SIMPLE_OPTIMIZATIONS", 
						"--js", filename, options);
				}
				// print(options.err);
				// if there's an error, go through the lines and find the right location
				if( /ERROR/.test(options.err) ){
					if (!currentLineMap) {
						print(options.err)
					}
					else {
					
						var errMatch;
						while (errMatch = /\:(\d+)\:\s(.*)/g.exec(options.err)) {
							var lineNbr = parseInt(errMatch[1], 10), 
								found = false, 
								item, 
								lineCount = 0, 
								i = 0, 
								realLine,
								error = errMatch[2];
							while (!found) {
								item = currentLineMap[i];
								lineCount += item.lines;
								if (lineCount >= lineNbr) {
									found = true;
									realLine = lineNbr - (lineCount - item.lines);
								}
								i++;
							}
							
							steal.print('ERROR in ' + item.src + ' at line ' + realLine + ': ' + error + '\n');
							var text = readFile(item.src), split = text.split(/\n/), start = realLine - 2, end = realLine + 2;
							if (start < 0) 
								start = 0;
							if (end > split.length - 1) 
								end = split.length - 1;
							steal.print(split.slice(start, end).join('\n') + '\n')
						}
					}
				}
				tmpFile.remove();

				return outBaos.toString();
			};
		},
		yui: function() {
			// needs yuicompressor.jar at steal/build/scripts/yuicompressor.jar
			steal.print("steal.compress - Using YUI compressor");

			return function( src ) {
				var rnd = Math.floor(Math.random() * 1000000 + 1),
					filename = "tmp" + rnd + ".js",
					tmpFile = new steal.File(filename);

				tmpFile.save(src);

				var outBaos = new java.io.ByteArrayOutputStream(),
					output = new java.io.PrintStream(outBaos);
					
				runCommand(
					"java", 
					"-jar", 
					"steal/build/scripts/yuicompressor.jar", 
					"--charset",
					"utf-8",
					filename, 
					{ output: output }
				);
			
				tmpFile.remove();

				return outBaos.toString();
			};
		}
	};
});