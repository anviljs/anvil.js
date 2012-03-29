class StylePipeline

	constructor: ( @config, @fp, @minifier, @scheduler, @log ) ->

	process: ( files, onComplete ) ->
		minified = _.map( files, ( x ) -> _.clone x )
		@scheduler.parallel minified, @minify, () -> onComplete( files.concat minifed )

	minify: ( file, onComplete ) ->
		self = this
		ext = file.ext()
		newFile = file.name.replace ext, "min.css"
		self.fp.transform( 
			[ file.workingPath, file.name ],
			( content, onTransform ) ->
				onTransform( self.minifier.cssmin content )
			, [ file.workingPath, newFile ],
			( ) ->
				file.name = newFile
				onComplete()
		)

class SourcePipeline

	constructor: ( @config, @fp, @minifier, @scheduler, @log ) ->

	process: ( files, onComplete ) ->
		self = this
		minified = _.map( files, ( x ) -> _.clone x )
		

		@scheduler.parallel files, @finalize, () -> 
			self.scheduler.parallel files, self.minify, () -> 
				self.scheduler.parallel files, self.finalize, () -> onComplete()

	minify: ( file, onComplete ) ->
		self = this
		ext = file.ext()
		newFile = file.name.replace ext, "min.js"
		@fp.transform( 
			[ file.workingPath, file.name ],
			( content, onTransform ) ->
				self.minifier content, ( err, result ) ->
					if err
						self.onError "Error minifying #{ file.name } : \r\n\t #{ err }"
						result = content
					onTransform( content )
			, [ file.workingPath, newFile ],
			( ) ->
				file.name = newFile
				onComplete()
		)

	finalize: ( file, onComplete ) ->
		self = this
		if @config.finalize
			header = @config.finalize.header
			footer = @config.finalize.footer

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



class MarkupPipeline

	constructor: () ->



class ImagePipeline

	constructor: () ->
