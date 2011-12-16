(function( steal ) {
	
	var extend = function( d, s ) {
		for ( var p in s ) d[p] = s[p];
		return d;
	};

	if ( !steal.File ) {
		steal.File = function( path ) {
			if ( this.constructor != steal.File ) {
				return new steal.File(path);
			}
			this.path = path;
		}
	}
	
	
	
})(steal);
