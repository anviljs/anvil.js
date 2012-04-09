/*-----------------------------------------------------------------------------
 *	Anvil.JS v0.7.0
 *  Copyright (c) 2011-2012 Alex Robson
 *
 *	Permission is hereby granted, free of charge, to any person obtaining a 
 *	copy of this software and associated documentation files (the "Software"), 
 *	to deal in the Software without restriction, including without limitation 
 *	the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 *	and/or sell copies of the Software, and to permit persons to whom the 
 *	Software is furnished to do so, subject to the following conditions:
 *
 *	The above copyright notice and this permission notice shall be included in 
 *	all copies or substantial portions of the Software.
 *
 *	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 *	OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL 
 *	THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 *	FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 *	DEALINGS IN THE SOFTWARE.
 *---------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------
 *	Anvil.JS v0.7.0
 *  Copyright (c) 2011-2012 Alex Robson
 *
 *	Permission is hereby granted, free of charge, to any person obtaining a 
 *	copy of this software and associated documentation files (the "Software"), 
 *	to deal in the Software without restriction, including without limitation 
 *	the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 *	and/or sell copies of the Software, and to permit persons to whom the 
 *	Software is furnished to do so, subject to the following conditions:
 *
 *	The above copyright notice and this permission notice shall be included in 
 *	all copies or substantial portions of the Software.
 *
 *	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 *	OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL 
 *	THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 *	FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 *	DEALINGS IN THE SOFTWARE.
 *---------------------------------------------------------------------------*/
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

# Generates HTML via an API -- 
# See https://github.com/insin/DOMBuilder for more info
builder = require "DOMBuilder"##
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

exports.log = log##
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

defaultMocha =
	growl: true
	ignoreLeaks: true
	reporter: "spec"
	ui: "bdd"
	colors: true

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

		#Quiet mode
		quiet = @parser.getOptions "q", "quiet"

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
		self = this
		prefix = prefix or= ""
		config.working = config.working || "./tmp"
		fp = @fp
		paths = [
			config[ "source" ]
			config[ "style" ]
			config[ "markup" ]
			config[ "spec" ]
			config[ "ext" ]
			config[ "working" ] 
		]
		
		# if the output is an object
		if _.isObject config.output
			paths = paths.concat _.flatten config.output
		else
			# if output is a single path
			paths.push config.output

		worker = ( p, done ) -> 
			try 
				fp.ensurePath [ prefix, p ], () ->
					done()
			catch err
				done()

		@scheduler.parallel paths, worker, () -> self.copyPrereqs onComplete

	# ## prepConfig ##
	# Fallback to default config, if specified config doesn't exist
	# ### Args:
	# * _exists {Boolean}_: does the specified config file exist?
	# * _file {String}_: config file name
	# * _onComplete {Function}_: what to do after config is prepped
	prepConfig: ( exists, file, onComplete ) ->
		self = this
		onDone = () -> self.normalizeConfig onComplete		
		unless exists
			@loadConvention( onDone )
		else
			@loadConfig( file, onDone )


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

	# ## normalizeConfig ##
	# Tries to normalize differences in configuration formats
	# between options and site vs. lib configurations
	# #### Args:
	# * _onComplete {Function}_: what to call when finished
	normalizeConfig: ( onComplete ) ->
		self = this
		fp = @fp
		config.output = config.output || "lib"
		if _.isString config.output
			outputPath = config.output
			config.output =
				style: outputPath
				source: outputPath
				markup: outputPath

		calls = []

		# finalization?
		finalize = config.finalize
		if finalize 
			calls.push ( done ) -> 
				self.getFinalization finalize, ( result ) -> 
					config.finalize = result
					done()
		# wrapping?
		wrap = config.wrap
		if wrap
			calls.push ( done ) -> 
				self.getWrap wrap, ( result ) -> 
					config.wrap = result
					done()

		# specs without a specific runner?
		spec = config.spec
		if spec and not config.mocha and not config.qunit
			calls.push ( done ) ->
				fp.getFiles spec, ( files ) ->
					if files.length == 0
						done()
					else
						specFile = files[ 0 ]
						if not specFile
							done()
						else
							try
								fp.read specFile, ( content ) ->
									hasQUnit = ///QUnit///g.test content
									if hasQUnit
										config.qunit = {}
									else
										config.mocha = defaultMocha
									done()
							catch err
								done()
						

		# any calls?
		if calls.length > 0
			@scheduler.parallel calls, 
				( call, done ) -> 
					call( done )
				, () -> onComplete()
		else
			onComplete()


	# ## getFinalization ##
	# Build up a custom state machine to address how
	# finalization should happen for this project
	# ### Args:
	# * _original {Object}_: the existing finalization block
	getFinalization: ( original, onComplete ) ->
		self = this
		finalization = {}
		result = {}
		aggregation = {}
		aggregate = @scheduler.aggregate
		
		# if there's no finalization
		if not original or _.isEqual original, {}
			onComplete finalization
		# if there's only one section
		else if original.header or 
				original["header-file"] or 
				original.footer or 
				original["footer-file"]
			# build out aggregation for resolving header and footer
			@getContentBlock original, "header", aggregation
			@getContentBlock original, "footer", aggregation
			# make sure we don't try to aggregate on empty
			if _.isEqual aggregation, {}
				onComplete finalization
			else
				aggregate aggregation, ( constructed ) ->
					finalization.source = constructed
					onComplete finalization
		# there are multiple sections
		else
			sources = {}
			blocks = { 
				"source": original[ "source" ], 
				"style": original[ "style" ], 
				"markup": original[ "markup" ] 
			}
			_.each( blocks, ( block, name ) -> 
				subAggregate = {}
				self.getContentBlock block, "header", subAggregate
				self.getContentBlock block, "footer", subAggregate
				sources[ name ] = ( done ) -> 
					aggregate subAggregate, done
			)
			aggregate sources, onComplete

	# ## getWrap ##
	# Build up a custom state machine to address how
	# wrapping should happen for this project
	# ### Args:
	# * _original {Object}_: the existing wrap block
	getWrap: ( original, onComplete ) ->
		self = this
		wrap = {}
		result = {}
		aggregation = {}
		aggregate = @scheduler.aggregate
		# if there's no wrap
		if not original or _.isEqual original, {}
			onComplete wrap
		# if there's only one section
		else if original.prefix or 
				original["prefix-file"] or 
				original.suffix or 
				original["suffix-file"]
			# build out aggregation for resolving prefix and suffix
			@getContentBlock original, "prefix", aggregation
			@getContentBlock original, "suffix", aggregation
			# make sure we don't try to aggregate on empty
			if _.isEqual aggregation, {}
				onComplete finalization
			else
				aggregate aggregation, ( constructed ) ->
					wrap.source = constructed
					onComplete finalization
		# there are multiple sections
		else
			sources = {}
			blocks = { 
				"source": original[ "source" ], 
				"style": original[ "style" ], 
				"markup": original[ "markup" ] 
			}
			_.each( blocks, ( block, name ) -> 
				subAggregate = {}
				self.getContentBlock block, "prefix", subAggregate
				self.getContentBlock block, "suffix", subAggregate
				sources[ name ] = ( done ) -> aggregate subAggregate, done
			)
			aggregate sources, onComplete
		
	# ## getContentBlock ##
	# Normalizes a wrapper or finalizer segment
	# ### Args:
	# * _property {string}: the property name to check for
	# * _source {Object}_: the configuration block
	# * _aggregation {Object}_: the fsm to build up
	getContentBlock: ( source, property, aggregation ) ->
		aggregation[ property ] = ( done ) -> done ""
		fp = @fp
		if source
			propertyPath = source["#{ property }-file"]
			propertyValue = source[ property ]
			if propertyPath and @fp.pathExists propertyPath
				aggregation[ property ] = ( done ) -> 
					fp.read propertyPath, ( content ) ->
						done content
			else if propertyValue
				aggregation[ property ] = ( done ) -> done propertyValue

	copyPrereqs: ( onComplete ) ->
		fp = @fp
		forAll = @scheduler.parallel
		if config.ext
			prereqPath = path.resolve __dirname, '../ext'
			fp.getFiles prereqPath, ( files ) ->
				console.log "Found #{ files.length } pre-reqs"
				copy = ( file, done ) ->
					fileName = path.basename( file )
					if not fp.pathExists [ config.ext, fileName ]
						fp.move file, [ config.ext, fileName ], done
					else
						done()
				forAll files, copy, () -> 
					onComplete()
		else
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
##
_ = require "underscore"
class Scheduler

	constructor: () ->

	parallel: ( items, worker, onComplete ) ->
		# Fail fast if list is empty
		if not items or items.length == 0
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

	aggregate: ( calls, onComplete ) ->
		results = {}
		isDone = () -> 
			_.chain( calls ).keys().all( ( x ) -> results[ x ] != undefined ).value()
		
		getCallback = ( name ) ->
			( result ) ->
				results[ name ] = result
				if isDone()
					onComplete results

		_.each( calls, ( call, name ) ->
			callback = getCallback name
			call callback
		)

scheduler = new Scheduler()

exports.scheduler = scheduler
##
fs = require "fs"
path = require "path"
_ = require "underscore"

class FSCrawler

	constructor: ( @scheduler ) ->
		_.bindAll( this )

	crawl: ( directory, onComplete ) ->
		self = this
		fileList = []
		forAll = @scheduler.parallel
		if directory and directory != ""
			directory = path.resolve directory
			fs.readdir directory, ( err, contents ) ->
				if not err and contents.length > 0
					qualified = []
					for item in contents
						qualified.push path.resolve directory, item
					
					self.classifyHandles qualified, ( files, directories ) ->
						fileList = fileList.concat files
						if directories.length > 0
							forAll directories, self.crawl, ( files ) ->
								fileList = fileList.concat _.flatten files
								onComplete fileList
						else
							onComplete fileList
				else
					onComplete fileList
		else
			onComplete fileList

	classifyHandles: ( list, onComplete ) ->
		if list and list.length > 0
			@scheduler.parallel list, @classifyHandle, ( classified ) ->
				files = []
				directories = []
				for item in classified
					if item.isDirectory then directories.push item.file else files.push item.file
				onComplete files, directories
		else
			onComplete [], []


	classifyHandle: ( file, onComplete ) ->
		fs.stat file, ( err, stat ) ->
			if err
				onComplete { file: file, err: err }
			else
				onComplete { file: file, isDirectory: stat.isDirectory() }

exports.crawler = FSCrawler##
fs = require "fs"
_ = require "underscore"

class FSProvider
	
	constructor: () ->
		@crawler = new FSCrawler scheduler
		_.bindAll this

	# ## buildPath ##
	# Given an array or string pathspec, return a string pathspec
	# ### Args:
	# * _pathSpec {Array, String}_: pathspec of either an array of strings or a single string
	buildPath: ( pathSpec ) ->
		if not pathSpec 
			""
		else
			fullPath = pathSpec
			if _.isArray( pathSpec )
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
	ensurePath: ( pathSpec, onComplete ) ->
		pathSpec = @buildPath pathSpec
		path.exists pathSpec, ( exists ) ->
			unless exists
				# No _target_ yet. Let's make it!
				mkdir pathSpec, "0755", ( err ) ->
					# Couldn't make the path. Report and abort!
					if err
						log.onError "Could not create #{pathSpec}. #{err}"
					else
						onComplete()
			else
				onComplete()


	getFiles: ( filePath, onFiles ) ->
		if not filePath 
			onFiles []
		else
			filePath = @buildPath filePath
			files = []
			@crawler.crawl filePath, onFiles

	move: ( from, to, done ) ->
		from = this.buildPath from
		to = this.buildPath to
		readStream = undefined
		writeStream = fs.createWriteStream( to )
		( readStream = fs.createReadStream( from ) ).pipe( writeStream )
		readStream.on 'end', () ->
			if writeStream
				writeStream.destroySoon()
			done()

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

##
# Unfancy JavaScript -- 
# See http://coffeescript.org/ for more info
coffeeScript = require "coffee-script"

# LESS Compiler --
# See http://lesscss.org
less = require( "less" )

# STYLUS Compiler --
# See http://learnboost.github.com/stylus/
stylus = require( "stylus" )

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


_ = require "underscore"

class Compiler

	constructor: (@fp, @log) ->
		_.bindAll( this )

	# ## compile ##
	# Compiles a file with the correct compiler
	# ### Args:
	# * _file {Object}_: file metadata for the file to compile
	# * _onComplete {Function}_: function to invoke when done
	compile: ( file, onComplete ) ->
		self = this
		ext = file.ext()
		newExt = @extensionMap[ ext ]
		newFile = file.name.replace ext, newExt
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			@compilers[ ext ],
			[ file.workingPath, newFile ],
			( err ) ->
				unless err
					file.name = newFile
					onComplete()
				else
					onComplete err
		)

	extensionMap:
		".coffee" : ".js"
		".kup": ".html"
		".less": ".css"
		".styl": ".css"
		".sass": ".css"
		".scss": ".css"
		".haml": ".html"
		".md": ".html"
		".markdown": ".html"

	compilers:
		".coffee" : ( content, onContent ) ->
			try
				js = coffeeScript.compile content, { bare: true }
				onContent js
			catch error
				onContent "", error
		".less" : ( content, onContent ) ->
			try
				less.render( content, {}, (e, css) -> onContent(css) )
			catch error
				onContent "", error
		".sass" : ( content, onContent ) ->
			try
				onContent content
			catch error
				onContent "", error
		".scss" : ( content, onContent ) ->
			try
				onContent content
			catch error
				onContent "", error
		".styl" : ( content, onContent ) ->
			try
				stylus.render( content, {}, (e, css) -> onContent( css, e ) )
			catch error
				onContent "", error
		".haml" : ( content, onContent ) ->
			try
				html = haml.render content
				onContent html
			catch error
				onContent "", error
		".md" : ( content, onContent ) ->
			try
				onContent( marked.parse( content ) )
			catch error
				onContent "", error
		".markdown" : ( content, onContent ) ->
			try
				onContent( marked.parse( content ) )
			catch error
				onContent "", error
		".kup" : ( content, onContent ) ->
			try
				html =( coffeeKup.compile content, {} )()
				onContent html
			catch error
				onContent "", error

exports.compiler = Compiler
##
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

exports.combiner = Combiner##
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
			minified = []
			if self.config.uglify
				minified = _.map( files, ( x ) -> _.clone x )
			forAll files, self.finalize, () -> 
				forAll minified, self.minify, () -> 
					forAll minified, self.finalize, () -> 
						onComplete( files.concat minified )

	minify: ( file, onComplete ) ->
		if @config.minify
			self = this
			ext = file.ext()
			newFile = file.name.replace ext, ".min.js"
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


exports.postProcessor = PostProcessor##
class Anvil

	constructor: ( @config, @fp, @compiler, @combiner, @scheduler, @postProcessor, @log, @callback ) ->
		config = @config
		@filesBuilt = {}
		@inProcess = false
		# mini FSM - basically we don't want to start building markup until
		# everything else is done since markup can import other built resources
		@steps = 
			source: false
			style: false
			markup: false
			hasSource: config.source
			hasStyle: config.style
			hasMarkup: config.markup
			markupReady: () -> ( this.source or not this.hasSource ) and ( this.style or not this.hasStyle )
			allDone: () -> 
				status = ( this.source or not this.hasSource ) and ( this.style or not this.hasStyle ) and ( this.markup or not this.hasMarkup )
				status


	build: () ->
		if not @inProcess
			@inProcess = true
			@buildSource()
			@buildStyle()
		else
			@log.onError "NOOOOOO"


	buildMarkup: () ->
		findPatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"].*['\"].?[)]?.?[-]{2}[\>]///g ]
		replacePatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"]replace['\"].?[)]?.?[-]{2}[\>]///g ]
		@processType( "markup", findPatterns, replacePatterns )
			

	buildSource: () ->
		findPatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?.?([/]{2}|[\#]{3})?///g ]
		replacePatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?.?([/]{2}|[\#]{3})?///g ]
		@processType( "source", findPatterns, replacePatterns )


	buildStyle: () ->
		findPatterns = [ ///@import[(]?.?[\"'].*[.]css[\"'].?[)]?///g ]
		replacePatterns = [ ///@import[(]?.?[\"']replace[\"'].?[)]?///g ]
		@processType( "style", findPatterns, replacePatterns )


	processType: ( type, findPatterns, replacePatterns ) ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )
		postProcessor = @postProcessor

		self.prepFiles type, ( list ) ->
			self.moveFiles list, () ->
				combiner.combineList list, () ->
					scheduler.parallel list, compiler.compile, () ->
						final = _.filter( list, ( x ) -> x.dependents == 0 )
						postProcessor[ type ].process final, ( list ) ->
							self.finalOutput list, () ->
								self.stepComplete type


	fileBuilt: ( file ) ->
		@filesBuilt[ file.fullPath ] = file


	finalOutput: ( files, onComplete ) ->
		fp = @fp
		forAll = @scheduler.parallel
		move = ( file, done ) ->
			forAll( file.outputPaths, ( destination, moved ) ->
				fp.move [ file.workingPath, file.name ], [ destination, file.name ], moved
			, done )
		forAll files, move, onComplete


	moveFiles: ( files, onComplete ) ->
		fp = @fp
		move = ( file, done ) -> 
			fp.move file.fullPath, [ file.workingPath, file.name ], done
		@scheduler.parallel files, move, onComplete


	prepFiles: ( type, onComplete ) ->
		working = @config.working
		typePath = @config[ type ]
		output = @config.output[ type ]
		output = if _.isArray( output ) then output else [ output ]
		log = @log
		@fp.getFiles typePath, ( files ) ->
			log.onEvent "Scanning #{ files.length } #{ type } files ..."
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
							relativePath: file.replace typePath, ""
							workingPath: working
						}
			onComplete list


	stepComplete: ( step ) ->
		@steps[ step ] = true
		if step != "markup" and @steps.markupReady()
			@buildMarkup()
		if step == "markup" and @steps.allDone()
			@inProcess = false
			@callback()##
class Continuous

	constructor: ( @fp, @config, @onChange ) ->
		@style = @normalize @config.style
		@source = @normalize @config.source
		@markup = @normalize @config.markup
		@spec = @normalize @config.spec
		@watchers = []
		@watching = false
		_.bindAll( this )
		this

	normalize: ( x ) -> if _.isArray x then x else [ x ]

	setup: () ->
		if not @watching
			if @style then @watchPath p for p in @style
			if @source then @watchPath p for p in @source
			if @markup then @watchPath p for p in @markup
			if @spec then @watchPath p for p in @spec

		@watching = true

	watchPath: ( path ) ->
		@fp.getFiles path, @watchFiles

	watchFiles: ( files ) ->
		for file in files
			@watchers.push fs.watch file, @onEvent

	onEvent: ( event, file ) ->
		console.log " File System Event: #{ event } on #{ file }"

		@watching = false
		while @watchers.length > 0
			@watchers.pop().close()
		@onChange()
##
mocha = require "mocha"
reporters = mocha.reporters
interfaces = mocha.interfaces
Context = mocha.Context
Runner = mocha.Runner
Suite = mocha.Suite

###
	This class is an adaptation of the code found in _mocha
	from TJ Holowaychuk's Mocha repository:
	https://github.com/visionmedia/mocha/blob/master/bin/_mocha
###
class MochaRunner

	constructor: ( @fp, @scheduler, @config, @onComplete ) ->
		
	run: () ->
		self = this
		if @config.spec
			forAll = @scheduler.parallel
			filesIn = @fp.getFiles

			opts = @config.mocha or=
				growl: true
				ignoreLeaks: true
				reporter: "spec"
				ui: "bdd"
				colors: true

			reporterName = opts.reporter.toLowerCase().replace( ///([a-z])///, ( x ) -> x.toUpperCase() )
			uiName = opts.ui.toLowerCase()

			suite = new Suite '', new Context
			Base = reporters.Base
			Reporter = reporters[reporterName]
			ui = interfaces[uiName]( suite )
			if opts.colors then Base.useColors = true
			if opts.slow then Base.slow = opts.slow
			if opts.timeout then suite.timeout opts.timeout

			specs = if _.isString @config.spec then [ @config.spec ] else @config.spec

			forAll specs, @fp.getFiles, ( lists ) ->
				files = _.flatten lists
				for file in files
					delete require.cache[ file ]
					suite.emit 'pre-require', global, file
					suite.emit 'require', require file, file
					suite.emit 'post-require', global, file

				suite.emit 'run'
				runner = new Runner suite
				reporter = new Reporter runner
				if opts.ignoreLeaks then runner.ignoreLeaks = true
				runner.run () -> 
					self.onComplete()
##
class QUnitRunner
	##
class TestRunner

	constructor: ( @fp, @scheduler, @config, @onComplete ) ->
		@runners.mocha = new MochaRunner @fp, @scheduler, @config, @onComplete
		@runners.qunit = new QUnitRunner @fp, @scheduler, @config, @onComplete

	run: () ->
		if @config.mocha
			@runners.mocha.run()
		else @config.qunit
			@runners.qunit.run()
##
# ## SocketServer ##
# Class to manage client notifications via socket.io
class SocketServer
  
  constructor: ( app ) ->
    _.bindAll( this )
    @clients = []
    @io = require( "socket.io" ).listen(app)
    @io.set "log level", 1
    # When a "connection" event occurs, call _@addClient_
    @io.sockets.on "connection", @addClient

  # ## addClient ##
  # Adds a new client to be notified upon change to watched files
  # ### Args:
  # * _socket {Object}_: Socket object that is generated by a socket.io 
  #   connection event.
  addClient: ( socket ) ->
    @clients.push socket
    socket.on "end", @removeClient
    socket.on "disconnect", @removeClient
    log.onEvent "client connected"

  removeClient: ( socket ) ->
    index = @clients.indexOf socket
    @clients.splice, i, 1
    log.onEvent "client connected"

  refreshClients: ->
    log.onEvent "Refreshing hooked clients"
    notifyClients "refresh"

  # ## notifyClients ##
  # Send a "refresh" message to all connected clients.
  notifyClients: ( msg ) ->
    for client in @clients
      client.emit msg, {}##
express = require 'express'

class Host

	constructor: ( @fp, @scheduler, @compiler, @config ) ->
		self = this
		_.bindAll( this )

		@app = express.createServer()
		app = @app
		app.use express.bodyParser()
		app.use app.router

		hosts = @config.hosts
		# if the user told us what to do, make no assumptions
		# only host exactly what they specify
		if hosts
			_.each( hosts, ( value, key ) ->
				console.log "Hosting #{ value } at #{ key }"
				app.use key, express.static( path.resolve value )
			)
		# otherwise, let's have some fun...
		else 
			output = @config.output
			target = ""
			if @config.markup # this is a site
				if _.isString output 
					target = output
				else if _.isArray output
					target = output[ 0 ]
				else
					target = output.markup
			else # this is a lib
				if _.isString output 
					target = output
				else if _.isArray output
					target = output[ 0 ]
				else
					target = output.source
			app.use "/", express.static( path.resolve target )

			if @config.ext
				app.use "/ext", express.static( path.resolve @config.ext )
			if @config.spec
				app.use "/spec", express.static( path.resolve @config.spec )

		app.get ///.*[.](coffee|kup|less|styl|md|markdown|haml)///, ( req, res ) ->
			fileNmae = req.get 'content-disposition', 'filename'
			ext = path.extname fileName

			res.header 'Content-Type', 'application/javascript'
			self.fp.read ".#{ req.url }", ( content ) ->
				self.compiler.compilers[ext] content, ( compiled ) ->
					res.send compiled

		port = if @config.port then @config.port else 3080
		app.listen port

	contentTypes:
		".coffee": "application/javascript"
		".less": "text/css"
		".styl": "text/css"
		".md": "text/html"
		".markdown": "text/html"
		".haml": "text/html"
		".kup": "text/html"##
exports.run = ->
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	compiler = new Compiler fp, log
	mochaRunner = undefined
	ci = undefined
	anvil = {}
	socketServer = {}
	fileChange = ->
	configuration.configure ( config ) ->
		
		if config.continuous
			ci = new Continuous fp, config, () ->
				fileChange()

		if config.spec
			mochaRunner = new MochaRunner fp, scheduler, config, () ->
				log.onComplete "tests complete"

		if config.host
			server = new Host fp, scheduler, compiler, config
			socketServer = new SocketServer server.app

		postProcessor = new PostProcessor config, fp, scheduler, log 
		anvil = new Anvil config, fp, compiler, Combiner, scheduler, postProcessor, log, () ->
			log.onComplete "build done"
			if mochaRunner
				setTimeout( 
					() -> mochaRunner.run(),
					200
				)

			if ci
				setTimeout( 
					() -> ci.setup(),
					200
				)

			if socketServer.refreshClients
				setTimeout(
					() -> socketServer.refreshClients(),
					200
				)

		fileChange = -> anvil.build()
		
		anvil.build()
		if ci
			ci.setup()

		##