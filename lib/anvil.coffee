# Node's event emitter for all engines.
events = require("events")
emitter = events.EventEmitter

# JavaScript's functional programming helper library -- 
# See http://documentcloud.github.com/underscore for more info
_ = require "underscore"

# Console colors for Node -- 
# See https://github.com/Marak/colors.js for more info
colors = require "colors"

# Filesystem API
fs = require "fs"

# Recursive mkdir for Node (think _mkdir -p_) -- 
# See ://github.com/substack/node-mkdirp for more info
mkdir = require( "mkdirp" ).mkdirp

# Node's path helper library
path = require "path"

# Parses command line args and options -- 
# See https://github.com/shinout/argparser for more info
ArgParser = require "argparser"

# A Sinatra inspired web development framework for Node -- 
# See http://expressjs.com for more info
express = require "express"

# Resourceful routing for express -- 
# See https://github.com/visionmedia/express-resource for more info
resource = require "express-resource"

# Generates HTML via an API -- 
# See https://github.com/insin/DOMBuilder for more info
builder = require "DOMBuilder"

# A tool to walk through directory trees and apply an action to every file -- 
# See http://github.com/pvorb/node-dive for more info
dive = require "dive"

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

class Log

	# ## onEvent ##
	# Logs events in default console color
	# ### Args:
	# * _x {String}_: message to log
	onEvent: (x) ->
	    unless quiet
	        console.log "   #{x}"


	# ## onStep ##
	# Logs steps in blue
	# ### Args:
	# * _x {String}_: message to log
	onStep: (x) ->
	    unless quiet
	        console.log "#{x}".blue


	# ## onComplete ##
	# Logs successful process completions in green
	# ### Args:
	# * _x {String}_: message to log
	onComplete: (x) ->
	    console.log "#{x}".green


	# ## onError ##
	# Logs errors in red
	# ### Args:
	# * _x {String}_: message to log
	onError: (x) ->
	    console.log "!!! #{x} !!!".red

log = new Log()

exports.log = log

_ = require "underscore"
path = require "path"

# Configuration container
config = { }

# Configuration defaults
siteConfig =
	"source": "src"
	"style": "style"
	"markup": "markup"
	"output": 
		{
			"source": [ "lib", "site/js" ],
			"style": [ "css", "site/css" ],
			"markup": "site/"
		}
	"spec": "spec"
	"ext": "ext"
	"lint": {}
	"uglify": {}
	"cssmin": {}
	"gzip": {}
	"hosts": {
	  "/": "site"
	}

libConfig = 
	"source": "src"
	"output": "lib"
	"spec": "spec"
	"ext": "ext"
	"lint": {}
	"uglify": {}
	"gzip": {}
	"hosts": {
	  "/": "spec"
	}

continuous = test = inProcess = quiet = debug = false
version = "0.8.0"

ext =
	gzip: "gz"
	uglify: "min"
	cssmin: "min"

extensionLookup = 
	".css": "style"
	".scss": "style"
	".sass": "style"
	".less": "style"
	".stylus": "style"
	".js": "source"
	".coffee": "source"
	".markdown": "markup"
	".md": "markup"
	".markdown": "markup"
	".html": "markup"

# ## configure ##
# Do all the things!
# Calling anvil from the command line runs this.
class Configuration 

	constructor: ( @fp, @parser, @scheduler, @log ) ->

	configure: ( onConfig ) ->
		self = this
		
		# Setup the CLI arg parser and parse all the args
		@parser.addValueOptions [ "b", "build", "n", "html", "site", "lib", "libfile", "sitefile" ]
		@parser.parse()

		# Get build file from CLI args or use default
		buildOpt = @parser.getOptions "b", "build"
		buildFile = if buildOpt then buildOpt else "./build.json"

		# create a new lib build file?
		createLibFile = @parser.getOptions "libfile"

		# create a new site build file?
		createSiteFile = @parser.getOptions "sitefile"

		# Run as CI server?
		continuous = @parser.getOptions "ci"

		# host site ?
		host = @parser.getOptions "h", "host"

		# Make an html page with our final JS included?
		htmlPage = @parser.getOptions "html"

		# Generate scaffold for new lib project?
		libScaffold = @parser.getOptions "lib"

		# Run tests?
		mocha = @parser.getOptions "m", "mocha"

		#Quiet mode
		quiet = @parser.getOptions "q", "quiet"

		# Host tests?
		pavlov = @parser.getOptions "p", "pavlov"

		# Show version info?
		showVersion = @parser.getOptions "v", "version"

		# Generate scaffold for new site project?
		siteScaffold = @parser.getOptions "site"

		if showVersion
			# Display version info and exit
			@log.onEvent "Anvil.js " + version
			onConfig config
		else if createLibFile or createSiteFile
			# Generate all the directories and the config file
			name = createLibFile or= createSiteFile
			type = if createSiteFile then 'site' else 'lib'
			@writeConfig type, "#{name}.json", () ->
				onConfig config
		else if siteScaffold or libScaffold
			# Generate all the directories and the config file
			scaffold = siteScaffold or= libScaffold
			type = if siteScaffold then 'site' else 'lib'
			@log.onStep "Creating scaffolding for new #{ type } project"
			@writeConfig type, scaffold + "/build.json", () ->
				# Create all the directories
				self.ensurePaths( () ->
					onConfig config
				, scaffold )

		else if htmlPage
			config.genHtml = htmlPage
			onConfig config
		else
			@log.onStep "Checking for config..."
			exists = @fp.pathExists buildFile
			@prepConfig exists, buildFile, () ->
				if pavlov or mocha
					config.testWith = if mocha then "mocha" else "pavlov"

				if host
					config.host = true

				if continuous
					config.continuous = true

				# Run transforms and generate output
				self.ensurePaths () ->
					onConfig config		


	createLibBuild: () ->
		# build lib template?
		if buildLibTemplate
			output = if buildLibTemplate == true then "build.json" else buildLibTemplate
			writeConfig "lib", output
			global.process.exit(0)
			config


	createSiteBuild: () ->
		# build site template?
		if buildSiteTemplate
			output = if buildSiteTemplate == true then "build.json" else buildSiteTemplate
			writeConfig "site", output
			global.process.exit(0)
			config


	# ## ensurePaths ##
	# Make sure that the output and temp directories exist then call _callback_
	# ### Args:
	# * _onComplete {Function}_: what do do once we're sure that the paths exist
	ensurePaths: ( onComplete, prefix ) ->
		prefix = prefix or= ""
		config.tmp = "./tmp"
		fp = @fp
		if _.isObject config.output
			paths = _.flatten config.output
			paths.push config["source"]
			paths.push config["style"]
			paths.push config["markup"]
			paths.push config["spec"]
			paths.push config["ext"]
			paths.push config["tmp"] 
			worker = ( p, done ) -> 
				fp.ensurePath [ prefix, p ], done
			@scheduler.parallel paths, worker, () -> onComplete()
		else
			# if output is a single path
			fp.ensurePath config.output, () ->
				fp.ensurePath config.tmp, () -> 
					onComplete()

	# ## prepConfig ##
	# Fallback to default config, if specified config doesn't exist
	# ### Args:
	# * _exists {Boolean}_: does the specified config file exist?
	# * _file {String}_: config file name
	# * _onComplete {Function}_: what to do after config is prepped
	prepConfig: ( exists, file, onComplete ) ->
		unless exists
			@loadConvention( onComplete )
		else
			@loadConfig( file, onComplete )


	# ## loadConfig ##
	# Setup full configuration using specified config file 
	# For example, anvil -b custom.json
	# ### Args:
	# * _file {String}_: config file name
	# * _onComplete {Function}_: what to do after config is loaded
	loadConfig: ( file, onComplete ) ->
		@log.onStep "Loading config..."
		fp = @fp
		fp.read file, ( content ) ->
			config = JSON.parse( content )
			if config.extensions
				ext.gzip = config.extensions.gzip || ext.gzip
				ext.uglify = config.extensions.uglify || ext.uglify

			# Setup final output wrapper
			if config.finalize
				if config.finalize['header-file']
					config.finalize.header = fp.readSync config.finalize['header-file'], 'utf-8'
				if config.finalize['footer-file']
					config.finalize.footer = fp.readSync config.finalize['footer-file'], 'utf-8'

			# Carry on!
			onComplete()


	# ## loadConvention ##
	# Sets up default config if no config file is found
	# ### Args:
	# * _onComplete {Function}_: what to do after config is setup
	loadConvention: ( onComplete ) ->
		conventionConfig = if @fp.pathExists "./site" then siteConfig else libConfig
		@log.onStep "Loading convention..."
		config = conventionConfig
		onComplete()


	# ## writeConfig ##
	# Creates new default config file
	# ### Args:
	# * _name {String}_: the config file name
	writeConfig: ( type, name, onComplete ) ->
		config = if type == "lib" then libConfig else siteConfig
		log = @log
		json = JSON.stringify( config, null, "\t" )
		@fp.write name, json, () ->
			log.onComplete "#{name} created successfully!"
			onComplete()

exports.configuration = Configuration


class Scheduler

	constructor: () ->

	parallel: ( items, worker, onComplete ) ->
		# Fail fast if list is empty
		if not items or items == []
			onComplete []
		count = items.length
		results = []
		# Pushes _result_ (if truthy) onto the _results_ list and, if there are no more
		# items, calls _onComplete_ with _results_
		done = ( result ) ->
			count = count - 1
			# Is _result_ truthy?
			if result
				# Append to _results_!
				results.push result
			# Is iteration complete?
			if count == 0
				# Call _onComplete_!
				onComplete( results )
		# Iteration occurs here
		worker( item, done ) for item in items


	pipeline: ( item, workers, onComplete ) ->
		# Fail fast if list is empty
		if item == undefined or not workers or workers.length == 0
			onComplete item || {}

		iterate = ( done ) ->
			worker = workers.shift()
			worker item, done
		done = ->

		done = ( product ) ->
			item = product
			# Any workers remaining?
			if workers.length == 0
				# Call _onComplete_!
				onComplete( product )
			else
				iterate done

		iterate done

scheduler = new Scheduler()

exports.scheduler = scheduler


class FSProvider
	
	constructor: () ->

	# ## buildPath ##
	# Given an array or string pathspec, return a string pathspec
	# ### Args:
	# * _pathSpec {Array, String}_: pathspec of either an array of strings or a single string
	buildPath: ( pathSpec ) ->
		fullPath = pathSpec
		if _( pathSpec ).isArray()
			fullPath = path.join.apply {}, pathSpec
		fullPath

	# ## delete ##
	# Deletes a file, given the file name (_file_) and its parent (_dir_)
	# ### Args:
	# * _dir {String}_: pathspec of parent dir
	# * _filePath {String}_: file name or path spec array
	# * _onDeleted {Function}_: callback called if the file delete is successful
	delete: ( filePath, onDeleted ) ->
		filePath = @buildPath filePath
		file = @files[ filePath ]
		if file
			delete @files filePath
			file.delete onDeleted
		else
			throw new Error "Cannot delete #{filePath} - it does not exist"
			process.exit 1

	# ## ensurePath ##
	# Makes sure _pathSpec_ path exists before calling _onComplete_ by
	# calling _mkdir pathSpec..._ if _pathSpec_ does not initially exist
	# ### Args:
	# * _pathSpec {String}_: path string or array
	# * _onComplete {Function}_: called if path exists or is successfully created
	ensurePath = ( pathSpec, onComplete ) ->
		pathSpec = @buildPath pathSpec
		path.exists pathSpec, ( exists ) ->
			unless exists
				# No _target_ yet. Let's make it!
				mkdir pathSpec, "0755", ( err ) ->
					# Couldn't make the path. Report and abort!
					if err
						log.onError "Could not create #{pathSpec}. #{err}"
					else
						callback()
			else
				callback()


	getFiles: ( filePath, onFiles ) ->
		filePath = @buildPath filePath
		files = []
		dive( 
			filePath, 
			{ recursive: true },
			( err, file ) -> if not err then files.push file
			, () -> onFiles files
		)


	pathExists: ( pathSpec ) ->
		pathSpec = this.buildPath pathSpec
		path.existsSync pathSpec

	# ## read ##
	# Reads a file from _filePath_ and calls _onFile_ callback with contents (Asynchronously)
	# ### Args:
	# * _filePath {String}_: pathspec of file to read and pass contents from
	# * _onContent {Function}_: callback to pass file's contents to
	read: ( filePath, onContent ) ->
		filePath = @buildPath filePath
		fs.readFile filePath, "utf8", ( err, content ) ->
		if err
			log.onError "Could not read #{ filePath } : #{ err }"
			onContent "", err
		else
			onContent content

	# ## readSync ##
	# Reads a file from _filePath_ ... synchronously ... SHAME! SHAAAAAAME! (ok, not really)
	# This function only exists for a specific use case in config, where there's literally
	# no advantage to reading files asynchronously but writing the code that way would
	# be a huge pain. Rationalization FTW
	# ### Args:
	# * _filePath {String}_: pathspec of file to read and pass contents from
	readSync: ( filePath ) ->
		filePath = @buildPath filePath
		try
			fs.readFileSync filePath, "utf8"
		catch err
			log.onError "Could not read #{ filePath } : #{ err }"
			err

	# ## transformFile ##
	# Given input file _filePath_, perform _transform_ upon it then write the transformed content
	# to _outputPath_ and call _onComplete_. (All operations performed asynchronously.)
	# ### Args:
	# * _filePath {String}_: pathspec of file to transform
	# * _transform {Function}_: transform to perform on the file
	# * _outputPath {String}_: pathspec of output file
	# * _onComplete {Function}_: called when all operations are complete
	transform: ( filePath, transform, outputPath, onComplete ) ->
		self = this
		filePath = @buildPath filePath
		outputPath = @buildPath outputPath
		this.read(
			filePath,
			( content ) ->
				transform content, ( newContent, error ) ->
					if not error
						self.write outputPath, newContent, onComplete
					else
						onComplete error
		)

	# ## write ##
	# Writes _content_ to file at _filePath_ calling _done_ after writing is complete (Asynchronously)
	# ### Args:
	# * _filePath {String}_: pathspec of file to write
	# * _content {String}_: content to write to the file
	# * _onComplete {Function}_: called when all operations are complete
	write: ( filePath, content, onComplete ) ->
		filePath = @buildPath filePath
		fs.writeFile filePath, content, "utf8", ( err ) ->
			if err
				log.onError "Could not write #{ filePath } : #{ err }"
				onComplete err
			else
				onComplete()


fp = new FSProvider()

exports.fsProvider = fp



# Unfancy JavaScript -- 
# See http://coffeescript.org/ for more info
coffeeScript = require "coffee-script"

# LESS Compiler --
# See http://lesscss.org
less = require( "less" )

# STYLUS Compiler --
# See http://learnboost.github.com/stylus/
stylus = require( "stylus" )

# SCSS Compiler --
# See http://learnboost.github.com/stylus/
scss = require( "scss" )

# HAML Compiler --
# See http://haml-lang.com/
haml = require( "haml" )

# Markdown Compiler --
# See http://github.com/chjj/marked
marked = require( "marked" )
marked.setOptions { sanitize: false }

# HAML Compiler --
# See http://haml-lang.com/
coffeeKup = require( "coffeekup" )


class Compiler

	constructor: (@fp, @log) ->

	# ## compile ##
	# Compiles a file with the correct compiler
	# ### Args:
	# * _sourcePath {String}_: directory pathspec where _file_ is located
	# * _file {Object}_: file metadata for the file to compile
	# * _onComplete {Function}_: function to invoke when done
	compile: ( file, onComplete ) ->
		self = this
		switch file.ext()
			when ".coffee" then self.compileCoffee file, onComplete
			when ".less" then self.compileLess file, onComplete
			when ".sass" then self.compileSass file, onComplete
			when ".scss" then self.compileScss file, onComplete
			when ".styl" then self.compileStylus file, onComplete
			when ".haml" then self.compileHaml file, onComplete
			when ".md" then self.compileMarkdown file, onComplete
			when ".markdown" then self.compileMarkdown file, onComplete
			when ".kup" then self.compileCoffeeKup file, onComplete


	# ## compileCoffee ##
	# Compiles CoffeeScript _file_ to a Javascript file
	# ### Args:
	# * _sourcePath {String}_: directory pathspec where _file_ is located
	# * _file {String}_: filename to compile
	compileCoffee: ( file, onComplete ) ->
		newFile = file.name.replace ".coffee", ".js"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( content, onContent ) ->
				try
					js = coffeeScript.compile content, { bare: true }
					onContent js
				catch error
					log.onError "Coffee compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				unless err
					file.name = newFile
					onComplete()
				else
					onComplete err
		)
		

	# ## compileCoffeeKup ##
	# Compiles CoffeeKup _file_ to a HTML file
	# ### Args:
	# * _sourcePath {String}_: directory pathspec where _file_ is located
	# * _file {String}_: filename to compile
	compileCoffeeKup: ( file, onComplete ) ->
		newFile = file.name.replace ".kup", ".html"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( content, onContent ) ->
				try
					html =( coffeeKup.compile content, {} )()
					onContent html
				catch error
					log.onError "CoffeeKup compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				unless err
					file.name = newFile
					onComplete()
				else
					onComplete err
		)

	# ## compileHaml ##
	# Compiles HAML _file_ to a HTML file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileHaml: ( file, onComplete ) ->
		newFile = file.name.replace ".haml", ".html"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( content, onContent ) ->
				try
					html = haml.render content
					onContent html
				catch error
					log.onError "Haml compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

	# ## compileLess ##
	# Compiles LESS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileLess: ( file, onComplete ) ->
		newFile = file.name.replace ".less", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					less.render( x, {}, (e, css) -> onContent(css) )
				catch error
					log.onError "LESS compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

	# ## compileMarkdown ##
	# Compiles Markdown _file_ to a HTML file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileMarkdown: ( file, onComplete ) ->
		newFile = file.name.replace ///[.](markdown|md)$///, ".html"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					onContent( marked.parse( x ) )
				catch error
					log.onError "Markdown compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

	# ## compileSass ##
	# Compiles SASS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileSass: ( file, onComplete ) ->
		newFile = file.name.replace ".sass", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					onContent ""
					#scss.parse( x, (e, css) -> 
					#	onContent( css, e ) 
					#)
				catch error
					log.onError "SASS compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				file.name = newFile
				onComplete()
		)

	# ## compileScss ##
	# Compiles SCSS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileScss: ( file, onComplete ) ->
		newFile = file.name.replace ".scss", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					onContent ""
					#scss.parse( x, (e, css) -> 
					#	onContent( css, e ) 
					#)
				catch error
					console.log error
					log.onError "SCSS compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				file.name = newFile
				onComplete()
		)

	# ## compileStylus ##
	# Compiles STYLUS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileStylus: ( file, onComplete ) ->
		newFile = file.name.replace ".styl", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					stylus.render( x, {}, (e, css) -> onContent( css, e ) )
				catch error
					log.onError "Stylus compiler exception on file: #{ file } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

exports.compiler = Compiler


_ = require "underscore"
class Combiner

	constructor: ( @fp, @scheduler, @findPatterns, @replacePatterns ) ->

	# ## combineList ##
	# combine all the files in the _list_ and call onComplete when finished
	# ### Args:
	# * _list {Array}_: collection of file metadata
	# * _onComplete {Function}_: callback to invoke on completion
	combineList: ( list, onComplete ) ->
		self = this
		forAll = @scheduler.parallel
		# for all files in the list
		# 	find all the imports for every file
		#	then find all the files that depend on each file
		#	then combine all the files in the list
		findImports = _.bind( ( file, done ) ->
				self.findImports file, list, done
			, this )

		findDependents = _.bind( ( file, done ) ->
				self.findDependents file, list, done
			, this )

		combineFile = _.bind( ( file, done ) ->
			self.combineFile file, done
			, this )

		forAll list, findImports, () ->
			for f1 in list
				findDependents f1, list
			forAll list, combineFile, onComplete

	# ## combineFile ##
	# combine a specifc _file_ after ensuring it's dependencies have been combined
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _onComplete {Function}_: callback to invoke on completion
	combineFile: ( file, onComplete ) ->
		self = this
		forAll = @scheduler.parallel
		# if we've already combined this file, just call complete
		if file.combined
			onComplete()
		# otherwise, combine all the file's dependencies first, then combine the file
		else
			combineFile = ( file, done ) ->
				self.combineFile file, done

			dependencies = file.imports
			if dependencies and dependencies.length > 0
				forAll dependencies, combineFile, () ->
					self.combine file, () ->
						file.combined = true
						onComplete()
			else
				self.combine file, () ->
					file.combined = true
					onComplete()

	# ## fileImports ##
	# search the _file_ using regex patterns and store all referenced files
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _list {Array}_: collection of file metadata
	# * _onComplete {Function}_: callback to invoke on completion
	findImports: ( file, list, onComplete ) ->
		self = this
		imports = []
		@fp.read [ file.workingPath, file.name ], ( content ) ->
			# find the import statements in the file contents using @findPatterns
			for pattern in self.findPatterns
				imports = imports.concat content.match pattern
			imports = _.filter imports, ( x ) -> x
			# strip out all the raw file names from the import statements
			# find the matching file metadata for the import
			for imported in imports
				importName = ( imported.match ///['\"].*['\"]/// )[ 0 ].replace(///['\"]///g, "" )
				importedFile = _.find( list, ( i ) -> 
					i.name == importName )
				file.imports.push importedFile
			onComplete()

	# ## fileDependents ##
	# search the _list_ to see if any files import _file_
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _list {Array}_: collection of file metadata
	# * _onComplete {Function}_: callback to invoke on completion
	findDependents: ( file, list ) ->
		imported = ( importFile ) ->
			file.name == importFile.name
		for item in list
			if _.any item.imports, imported then file.dependents++

	# ## combine ##
	# combine all the _file_'s imports into its contents
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _onComplete {Function}_: callback to invoke on completion
	combine: ( file, onComplete ) ->
		self = this
		unless file.combined
			pipe = @scheduler.pipeline
			fp = @fp
			if file.imports.length > 0
				# creates a closure around a specific import to prevent
				# access to a changing variable
				steps = for imported in file.imports
						self.getStep imported
				fp.read [ file.workingPath, file.name ], ( main ) ->
					pipe main, steps, ( result ) ->
						fp.write [ file.workingPath, file.name ], result, () -> onComplete()
			else
				onComplete()
		else
			onComplete()

	getStep: ( i ) -> 
		self = this
		( text, onDone ) -> self.replace text, i, onDone

	# ## replace ##
	# create a replacement regex that will take the _imported_ content and replace the
	# matched patterns within the main file's _content_
	# ### Args:
	# * _content {Object}_: the content of the main file
	# * _imported {Object}_: file metadata for the imported
	# * _onComplete {Function}_: callback to invoke on completion
	replace: ( content, imported, onComplete ) ->
		patterns = @replacePatterns
		pipe = @scheduler.pipeline
		source = imported.name
		working = imported.workingPath
		@fp.read [ working, source ], ( newContent ) ->
			steps = for pattern in patterns
				( current, done ) ->
					stringified = pattern.toString().replace ///replace///, source
					stringified = stringified.substring( 1, stringified.length - 2 )
					fullPattern = new RegExp stringified, "g"
					done( current.replace fullPattern, newContent )
			pipe content, steps, ( result ) ->
				onComplete result

exports.combiner = Combiner

class StylePipeline

	constructor: ( @config, @fp, @minifier, @scheduler, @log ) ->

	process: ( files, onComplete ) ->
		@scheduler.parallel files, @minify, () -> onComplete

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


class Anvil

	constructor: ( @config, @fp, @compiler, @combiner, @scheduler, @log ) ->
		config = @config
		@filesBuilt = {}
		@scheduler = new ForkJoiner()
		@compiler = new Compiler @fp
		# mini FSM - basically we don't want to start building markup until
		# everything else is done since markup can import other built resources
		@steps = 
			source: false
			style: false
			markup: false
			hasSource: config.source
			hasStyle: config.style
			hasMarkup: config.markup
			markupReady: () -> ( source or not hasSource ) and ( style or not hasStyle )
			allDone: () -> 
				( source or not hasSource ) and ( style or not hasStyle ) and ( markup or not hasMarkup )


	build: () ->
		@buildSource()
		@buildStyle()


	buildMarkup: () ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		findPatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"].*['\"].?[)]?.?[-]{2}[\>]///g ]
		replacePatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"]replace['\"].?[)]?.?[-]{2}[\>]///g ]
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )

		prepFiles "markup", ( list ) ->
			scheduler.parallel list, compiler.compile, () ->
				combiner.combine list, () ->
					self.stepComplete "markup"
			

	buildSource: () ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		findPatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?///g ]
		replacePatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?///g ]
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )

		prepFiles "source", ( list ) ->
			scheduler.parallel list, compiler.compile, () ->
				combiner.combine list, () ->
					self.stepComplete "source"


	buildStyle: () ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		findPatterns = [ ///@import[(]?.?[\"'].*[.]css[\"'].?[)]?///g ]
		replacePatterns = [ ///@import[(]?.?[\"']replace[\"'].?[)]?///g ]
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )

		prepFiles "style", ( list ) ->
			scheduler.parallel list, compiler.compile, () ->
				combiner.combine list, () ->
					self.stepComplete "style"


	fileBuilt: ( file ) ->
		@filesBuilt[ file.fullPath ] = file


	prepFiles: ( type, onComplete ) ->
		working = @config.working
		path = @config[ type ]
		output = @config.output[ type ]

		@fp.getFiles @config.markup, ( files ) ->
			list = for file in files
						name = path.basename file
						{
							dependents: 0
							ext: () -> path.extname this.name
							fullPath: file
							imports: []
							name: name
							originalName: name
							outputPaths: output
							relativePath: file.replace path, ""
							workingPath: working
						}
			onComplete list


	report: () ->
		# tests
		# re-start watchers
		onComplete "Hey, it's done, bro-ham"


	stepComplete: ( step ) ->
		@steps[ step ] = true
		if @steps.markupReady()
			@buildMarkup()
		if @steps.allDone()
			@report()

# ( @config, @fp, @compiler, @combiner, @scheduler, @log )

exports.run = ->
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	compiler = new Compiler fp, log 
	configuration.configure ( config ) ->
		anvil = new Anvil config, fp, compiler, Combiner, scheduler, log
		