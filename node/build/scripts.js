var parser = require('uglify-js').parser,
	uglify = require('uglify-js').uglify;

steal.then(function( steal ){
	//various compressors
	steal.build.builders.scripts.compressors = {
		uglify: function(){
			steal.print("steal.compress - Using Uglify");
			return function( src, quiet ){
				var ast = parser.parse(src);
				ast = uglify.ast_mangle(ast);
				ast = uglify.ast_squeeze(ast);
				return uglify.gen_code(ast);
			};
		}
	};
});