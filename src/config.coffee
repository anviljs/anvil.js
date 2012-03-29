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
		config.working = config.working || "./tmp"
		fp = @fp
		if _.isObject config.output
			paths = _.flatten config.output
			paths.push config["source"]
			paths.push config["style"]
			paths.push config["markup"]
			paths.push config["spec"]
			paths.push config["ext"]
			paths.push config["working"] 
			worker = ( p, done ) -> 
				fp.ensurePath [ prefix, p ], done
			@scheduler.parallel paths, worker, () -> onComplete()
		else
			# if output is a single path
			fp.ensurePath config.output, () ->
				fp.ensurePath config.working, () -> 
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
