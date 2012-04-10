# Uglify: JavaScript parser and compressor/beautifier toolkit -- 
# See https://github.com/mishoo/UglifyJS for more info
jsp = require( "uglify-js" ).parser
pro = require( "uglify-js" ).uglify

# A Node-compatible port of Douglas Crockford's JSLint -- 
jslint = require( "readyjslint" ).JSLINT

# Gzip for Node -- 
gzipper = require( "gzip" )

# CSS Minifier --
# See https://github.com/jbleuzen/node-cssmin
cssminifier = require( "cssmin" )

class StylePipeline

	constructor: ( @config, @fp, @minifier, @scheduler, @log ) ->
		_.bindAll( this )

	process: ( files, onComplete ) ->
		self = this
		forAll = @scheduler.parallel
		forAll files, @wrap, () ->
			minified = []
			if self.config.cssmin
				minified = _.map( files, ( x ) -> _.clone x )
			forAll files, self.finalize, () -> 
				forAll minified, self.minify, () -> 
					forAll minified, self.finalize, () -> 
						onComplete( files.concat minified )

	minify: ( file, onComplete ) ->
		if @config.cssmin
			self = this
			ext = file.ext()
			newFile = file.name.replace ext, ".min.css"
			self.fp.transform( 
				[ file.workingPath, file.name ],
				( content, onTransform ) ->
					onTransform( self.minifier.cssmin content )
				, [ file.workingPath, newFile ],
				( ) ->
					file.name = newFile
					onComplete()
			)
		else
			onComplete()

	finalize: ( file, onComplete ) ->
		self = this
		if @config.finalize and @config.finalize.style
			header = @config.finalize.style.header
			footer = @config.finalize.style.footer
			@fp.transform( 
				[ file.workingPath, file.name ], 
				( content, onTransform ) ->
					if header
						content = header + content
					if footer
						content = content + footer
					onTransform content
				, [ file.workingPath, file.name ],
				onComplete
			)
		else
			onComplete()

	wrap: ( file, onComplete ) ->
		self = this
		if @config.wrap and @config.wrap.style
			prefix = @config.wrap.style.prefix
			suffix = @config.wrap.style.suffix
			@fp.transform( 
				[ file.workingPath, file.name ], 
				( content, onTransform ) ->
					if prefix
						content = prefix + content
					if suffix
						content = content + suffix
					onTransform content
				, [ file.workingPath, file.name ],
				onComplete
			)
		else
			onComplete()

class SourcePipeline

	constructor: ( @config, @fp, @minifier, @scheduler, @log ) ->
		_.bindAll( this )

	process: ( files, onComplete ) ->
		self = this
		forAll = @scheduler.parallel
		forAll files, @wrap, () ->
			minify = []
			if self.config.uglify
				minify = _.map( files, ( x ) -> _.clone x )
			forAll files, self.finalize, () -> 
				forAll minify, self.minify, () -> 
					forAll minify, self.finalize, () -> 
						onComplete( files.concat minify )

	minify: ( file, onComplete ) ->
		if @config.uglify
			self = this
			ext = file.ext()
			newFile = file.name.replace ext, ".min.js"
			@log.onStep "Uglifying #{ newFile }"
			@fp.transform( 
				[ file.workingPath, file.name ],
				( content, onTransform ) ->
					self.minifier content, ( err, result ) ->
						if err
							self.log.onError "Error minifying #{ file.name } : \r\n\t #{ err }"
							result = content
						onTransform( result )
				, [ file.workingPath, newFile ],
				() ->
					file.name = newFile
					onComplete()
			)
		else
			onComplete()

	finalize: ( file, onComplete ) ->
		self = this
		if @config.finalize and @config.finalize.source
			@log.onStep "Finalizing #{ file.name }"
			header = @config.finalize.source.header
			footer = @config.finalize.source.footer
			@fp.transform( 
				[ file.workingPath, file.name ], 
				( content, onTransform ) ->
					if header
						content = header + content
					if footer
						content = content + footer
					onTransform content
				, [ file.workingPath, file.name ],
				() ->
					onComplete()
			)
		else
			onComplete()

	wrap: ( file, onComplete ) ->
		self = this
		if @config.wrap and @config.wrap.source
			prefix = @config.wrap.source.prefix
			suffix = @config.wrap.source.suffix  
			@fp.transform( 
				[ file.workingPath, file.name ], 
				( content, onTransform ) ->
					if prefix
						content = prefix + content
					if suffix
						content = content + suffix
					onTransform content
				, [ file.workingPath, file.name ],
				onComplete
			)
		else
			onComplete()

class MarkupPipeline

	constructor: () ->

class ImagePipeline

	constructor: () ->

class PostProcessor

	constructor: ( @config, @fp, @scheduler, @log ) ->

		uglify = ( source, callback ) ->
			try
				ast = jsp.parse source
				ast = pro.ast_mangle ast
				ast = pro.ast_squeeze ast
				callback undefined, pro.gen_code ast
			catch err
				callback err, ""

		@style = new StylePipeline @config, @fp, cssminifier, @scheduler, @log
		@source = new SourcePipeline @config, @fp, uglify, @scheduler, @log
		@markup = {
			process: ( files, onComplete ) -> onComplete files
		}


exports.postProcessor = PostProcessor