_ = require "underscore"
path = require "path"

class FileMock
	constructor: ( @name ) ->
		@delay = 10
		@available = true

	delete: ( onComplete ) ->
		if @available
			@content = ""
			onComplete()
		else
			throw new Error "Cannot delete file #{ @name }"

	read: ( onContent ) ->
		self = this
		if @available
			@available = false
			setTimeout () ->
				onContent self.content
				self.available = true
			, self.delay
		else
			throw new Error "Cannot read file #{ @name }"

	write: ( content, onComplete ) ->
		self = this
		if @available
			setTimeout( () ->
					self.content = content
					onComplete()
				, self.delay
			)
		else
			throw new Error "Cannot write file #{ @name }"

	
class FSMock
	
	constructor: () ->
		@files = {}
		@paths = {}

	buildPath: ( pathSpec ) ->
		fullPath = pathSpec
		if _( pathSpec ).isArray()
			fullPath = path.join.apply {}, pathSpec
		fullPath

	delete: ( filePath, onDeleted ) ->
		filePath = this.buildPath filePath
		file = @files[ filePath ]
		if file
			delete @files filePath
			file.delete onDeleted
		else
			throw new Error "Cannot delete #{filePath} - it does not exist"

	ensurePath: ( pathSpec, onComplete ) ->
		pathSpec = this.buildPath pathSpec
		@paths[ pathSpec ] = true
		onComplete()

	getFiles: ( filePath, onFiles ) ->
		filePath = this.buildPath filePath
		files = _.chain( @files )
				.keys()
				.filter( ( name ) ->
					( name.indexOf filePath ) >= 0
				).value()

	pathExists: ( pathSpec ) -> 
		pathSpec = this.buildPath pathSpec
		if path.extname pathSpec 
			return @files[ pathSpec ]
		else
			return @paths[ pathSpec ]

	transform = ( filePath, transform, outputPath, onComplete ) ->
		self = this
		filePath = this.buildPath filePath
		outputPath = this.buildPath outputPath
		this.read( filePath,
			( content ) ->
				transform content, ( newContent ) ->
					self.write outputPath, newContent, onComplete
		)

	read: ( filePath, onContent ) ->
		filePath = this.buildPath filePath
		file = @files[ filePath ]
		if file
			file.read ( content ) ->
				onContent content
		else
			throw new Error "Cannot read #{filePath} - it does not exist"

	write: ( filePath, content, onComplete ) ->
		filePath = this.buildPath filePath
		file = @files[ filePath ]
		unless file
			file = new FileMock filePath
			@files[ filePath ] = file
		file.write content, onComplete

exports.fsProvider = FSMock