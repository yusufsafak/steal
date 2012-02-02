(function( steal ) {

	var fs = require('fs'),
		path = require('path'),
		mkdirsSync = function( pathname ){
			try {
				if ( !fs.statSync(pathname).isDirectory() ){
					throw new Error('Unable to create directory at: ' + pathname);
				}
			} catch(e){
				if( e.code == 'ENOENT' ){
					mkdirsSync(path.dirname(pathname));
					fs.mkdirSync(pathname, 0755);
				}else{
					throw e;
				}
			}
		},
		extend = function( d, s ) {
			for ( var p in s ) d[p] = s[p];
			return d;
		};

	if (!steal.File ) {
		steal.File = function( path ) {
			if ( this.constructor != steal.File ) {
				return new steal.File(path)
			}
			this.path = path;
		}
	}
	
	var copy = function( f1, f2 ) {
		var bufLen = 1024,
			buf = new Buffer(bufLen),
			fin = fs.openSync(f1, 'r'),
			fout = fs.openSync(f2, 'w');

		var len, pos = 0;
		while ( (len = fs.readSync(fin, buf, 0, bufLen, pos)) > 0 ) {
			fs.writeSync(fout, buf, 0, len, pos);
			pos += len;
		}
		
		fs.closeSync(fin);
		fs.closeSync(fout);
	}
	
	var addDir = function( dirObj, out, replacePath ) {
		throw new Error('steal.File.addDir not implemented');
		/*
		var files = dirObj.listFiles();
		var tmpBuf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);

		for ( var i = 0; i < files.length; i++ ) {
			if ( files[i].isDirectory() ) {
				addDir(files[i], out, replacePath);
				continue;
			}
			var inarr = new java.io.FileInputStream(files[i].getAbsolutePath());
			var zipPath = files[i].getPath().replace(replacePath, "").replace("\\", "/")
			if (/\.git|\.zip/.test(zipPath) ) continue;
			print(zipPath)
			out.putNextEntry(new java.util.zip.ZipEntry(zipPath));
			var len;
			while ((len = inarr.read(tmpBuf)) > 0 ) {
				out.write(tmpBuf, 0, len);
			}
			out.closeEntry();
			inarr.close();
		}
		*/
	}
	extend(steal.File.prototype, {
		/**
		 * Removes hash and params
		 * @return {String}
		 */
		clean: function() {
			return this.path.match(/([^\?#]*)/)[1];
		},
		/**
		 * Returns everything before the last /
		 */
		dir: function() {
			var last = this.clean().lastIndexOf('/'),
				dir = (last != -1) ? this.clean().substring(0, last) : '',
				parts = dir != '' && dir.match(/^(https?:\/|file:\/)$/);
			return parts && parts[1] ? this.clean() : dir;
		},
		/**
		 * Returns the domain for the current path.
		 * Returns null if the domain is a file.
		 */
		domain: function() {
			if ( this.path.indexOf('file:') == 0 ) return null;
			var http = this.path.match(/^(?:https?:\/\/)([^\/]*)/);
			return http ? http[1] : null;
		},
		/**
		 * Joins url onto path
		 * @param {Object} url
		 */
		join: function( url ) {
			return new steal.File(url).joinFrom(this.path);
		},
		/**
		 * Returns the path of this file referenced form another url.
		 * @codestart
		 * new steal.File('a/b.c').joinFrom('/d/e')//-> /d/e/a/b.c
		 * @codeend
		 * @param {Object} url
		 * @param {Object} expand
		 * @return {String} 
		 */
		joinFrom: function( url, expand ) {
			if ( this.isDomainAbsolute() ) {
				var u = new steal.File(url);
				if ( this.domain() && this.domain() == u.domain() ) return this.afterDomain();
				else if ( this.domain() == u.domain() ) { // we are from a file
					return this.toReferenceFromSameDomain(url);
				} else return this.path;
			} else if ( url == steal.pageDir && !expand ) {
				return this.path;
			} else if ( this.isLocalAbsolute() ) {
				var u = new steal.File(url);
				if (!u.domain() ) return this.path;
				return u.protocol() + "//" + u.domain() + this.path;
			}
			else {

				if ( url == '' ) return this.path.replace(/\/$/, '');
				var urls = url.split('/'),
					paths = this.path.split('/'),
					path = paths[0];
				if ( url.match(/\/$/) ) urls.pop();
				while ( path == '..' && paths.length > 0 ) {
					paths.shift();
					urls.pop();
					path = paths[0];
				}
				return urls.concat(paths).join('/');
			}
		},
		/**
		 * Returns true if the file is relative
		 */
		relative: function() {
			return this.path.match(/^(https?:|file:|\/)/) == null;
		},
		/**
		 * Returns the part of the path that is after the domain part
		 */
		after_domain: function() {
			return this.path.match(/(?:https?:\/\/[^\/]*)(.*)/)[1];
		},
		afterDomain: function() {
			return this.path.match(/https?:\/\/[^\/]*(.*)/)[1];
		},
		/**
		 * 
		 * @param {Object} url
		 */
		toReferenceFromSameDomain: function( url ) {
			var parts = this.path.split('/'),
				other_parts = url.split('/'),
				result = '';
			while ( parts.length > 0 && other_parts.length > 0 && parts[0] == other_parts[0] ) {
				parts.shift();
				other_parts.shift();
			}
			for ( var i = 0; i < other_parts.length; i++ ) result += '../';
			return result + parts.join('/');
		},
		/**
		 * Is the file on the same domain as our page.
		 */
		is_cross_domain: function() {
			if ( this.isLocalAbsolute() ) return false;
			return this.domain() != new steal.File(location.href).domain();
		},
		isLocalAbsolute: function() {
			return this.path.indexOf('/') === 0
		},
		isDomainAbsolute: function() {
			return this.path.match(/^(https?:|file:)/) != null
		},
		/**
		 * For a given path, a given working directory, and file location, update the path so 
		 * it points to the right location.
		 */


		mkdir: function() {
			fs.mkdirSync(this.path);
		},
		mkdirs: function() {
			mkdirsSync(this.path);
		},
		exists: function() {
			return path.existsSync(this.path);
		},
		copyTo: function( dest, ignore ) {
			var st = fs.statSync(this.path);
			if( st.isDirectory() ){
				this.contents(function( file, type ){
					// if no files to ignore, or file not in ignore list
					if( !ignore || ignore.indexOf(file) == -1 ){
						var oldPath = path.join(this.path, file);
						if( type == 'directory' ){
							// create the new directory under dest, and recursively copyTo it
							var newPath = path.join(dest, file);
							fs.mkdirSync(newPath);
							new steal.File(oldPath).copyTo(newPath);
						}else{
							// just copying a file
							copy(oldPath, newPath);
						}
					}
				});
			}else{
				// just copying a file
				copy(this.path, dest);
			}
			return this;
		},
		moveTo: function(dest){
			try {
				fs.renameSync(this.path, dest);
				return true;
			} catch(e){
				return false;
			}
		},
		setExecutable: function(){
			fs.chmodSync(this.path, 0755);
			return this;
		},
		save: function( src, encoding ) {
			fs.writeFileSync(this.path, src, 'utf8');
			/*
			var fout = new java.io.FileOutputStream(new java.io.File(this.path));

			var out = new java.io.OutputStreamWriter(fout, "UTF-8");
			var s = new java.lang.String(src || "");

			var text = new java.lang.String((s).getBytes(), encoding || "UTF-8");
			out.write(text, 0, text.length());
			out.flush();
			out.close();
			*/
		},
		download_from: function( address ) {
			throw new Error('steal.File.download_from not implemented');
			/*
			var input =
			new java.io.BufferedInputStream(
			new java.net.URL(address).openStream());

			bout = new java.io.BufferedOutputStream(
			new java.io.FileOutputStream(this.path), 1024);
			var data = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 1024);
			var num_read = 0;
			while ((num_read = input.read(data, 0, 1024)) >= 0 ) {
				bout.write(data, 0, num_read);
			}
			bout.close();
			*/
		},
		basename: function() {
			return this.path.match(/\/?([^\/]*)\/?$/)[1];
		},
		remove: function() {
			try {
				fs.unlinkSync(this.path);
				return true;
			} catch(e){
				return false;
			}
		},
		isFile: function() {
			try {
				var s = fs.statSync(this.path);
				return s.isFile();
			} catch(e){
				return false;
			}
		},
		removeDir: function() {
			var p = this.path;
			this.contents(function( file, type ){
				var f = new steal.File(path.join(p, file));
				if( type == 'directory' ){
					f.removeDir();
				}else{
					f.remove();
				}
			});
			return true;
		},
		zipDir: function( name, replacePath ) {
			throw new Error('steal.File.zipDir not impemented');
			/*
			var dirObj = new java.io.File(this.path);
			var out = new java.util.zip.ZipOutputStream(new java.io.FileOutputStream(name));
			addDir(dirObj, out, replacePath);
			out.close();
			*/
		},
		contents: function( func, current ) {
			try {
				var files = fs.readdirSync(this.path);
				for ( var i = 0; i < files.length; i++ ){
					var st = fs.statSync(path.join(this.path, files[i]));
					func(files[i], st.isFile() ? 'file' : 'directory', current)
				}
			} catch(e){
			}
		},
		/**
		 * Returns the path to the root jmvc folder
		 */
		pathToRoot: function( isFile ) {
			var root = steal.File.getRoot(),
				rootFolders = root.split(/\/|\\/),
				targetDir = rootFolders[rootFolders.length-1]
				i = 0,
				adjustedPath = (targetDir? this.path.replace(new RegExp(".*"+targetDir+"\/?"),""): 
					this.path),
				myFolders = adjustedPath.split(/\/|\\/);

			//for each .. in loc folders, replace with steal folder
			if ( myFolders[i] == ".." ) {
				while ( myFolders[i] == ".." ) {
					myFolders[i] = rootFolders.pop();
					i++;
				}
			} else {
				for ( i = 0; i < myFolders.length - 1; i++ ) {
					myFolders[i] = ".."
				}
			}
			myFolders.pop();

			if (!isFile ) {
				myFolders.push('..')
			}

			return myFolders.join("/")
		}
	});

	/**
	 * If there's a CMD system variable (like "documentjs/document.bat"), 
	 * assumes the root is the folder one below the scripts folder.
	 * 
	 * Otherwise, assumes the current directory IS the root jmvc folder (framework)
	 * 
	 */
	steal.File.getRoot = function() {
		return steal.File.cwd();
		/*
		var cwd = steal.File.cwd(),
			cmd = ""+java.lang.System.getProperty("cmd"),
			root = cwd,
			relativeRoot;
		
		if(cmd) {
			relativeRoot = cmd.replace(/\/?[^\/]*\/[^\/]*$/, "")
			root = cwd+'/'+relativeRoot;
		} 
		return root;
		*/
	}
	steal.File.cwdURL = function() {
		return 'file://' + steal.File.cwd();
	}
	steal.File.cwd = function() {
		return process.cwd();
	}
	
	var isArray = function( arr ) {
		return Object.prototype.toString.call(arr) === "[object Array]"
	}
	
	/**
	 * Converts args or a string into options
	 * @param {Object} args
	 * @param {Object} options something like 
	 * {
	 * name : {
	 * 	shortcut : "-n",
	 * 	args: ["first","second"]
	 * },
	 * other : 1
	 * }
	 */
	steal.opts = function( args, options ) {
		if ( typeof args == 'string' ) {
			args = args.split(' ')
		}
		if (!isArray(args) ) {
			return args
		}

		var opts = {};
		//normalizes options
		(function() {
			var name, val, helper
			for ( name in options ) {
				val = options[name];
				if ( isArray(val) || typeof val == 'number' ) {
					options[name] = {
						args: val
					};
				}
				options[name].name = name;
				//move helper
				helper = options[name].helper || name.substr(0, 1);

				options[helper] = options[name]
			}
		})();
		var latest, def;
		for ( var i = 0; i < args.length; i++ ) {
			if ( args[i].indexOf('-') == 0 && (def = options[args[i].substr(1)]) ) {
				latest = def.name;
				opts[latest] = true;
				//opts[latest] = []
			} else {
				if ( opts[latest] === true ) {
					opts[latest] = args[i]
				} else {
					if (!isArray(opts[latest]) ) {
						opts[latest] = [opts[latest]]
					}
					opts[latest].push(args[i])
				}

			}
		}

		return opts;
	}
	
	// a way to turn off printing (mostly for testing purposes)
	steal.print = function(){

		if(typeof STEALPRINT == "undefined" || STEALPRINT !== false){
			print.apply(null, arguments)
		}
	}
	

})(steal);