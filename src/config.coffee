# Configuration container
config = { }

# Configuration defaults
conventionConfig =
    "source": "src"
    "output": "lib"
    "spec": "spec"
    "ext": "ext"
    "lint": {}
    "uglify": {}
    "gzip": {}
    "gendocs": {}
    "hosts": {
      "/": "html"
    }

continuous = test = false
inProcess = false
quiet = false

version = "0.6.8"

ext =
    gzip: "gz"
    uglify: "min"

# ## ensurePaths ##
# Make sure that the output and temp directories exist then call _callback_
# ### Args:
# * _callback {Function}_: what do do once we're sure that the paths exist
ensurePaths = (callback) ->
    config.tmp = path.join config.source, "tmp"
    ensurePath config.output, () ->
        ensurePath config.tmp, -> callback()

# ## configure ##
# Do all the things!
# Calling anvil from the command line runs this.
configure = () ->
    # Setup the CLI arg parser and parse all the args
    parser = new ArgParser();
    parser.addValueOptions(["t","b","n","html"])
    parser.parse()

    # Generate scaffold for new project?
    scaffold = parser.getOptions("n")
    # Make an html page with our final JS included?
    htmlPage = parser.getOptions("html")
    # Show version info?
    showVersion = parser.getOptions("v","version")

    if showVersion
        # Display version info and exit
        console.log "Anvil.js " + version
        global.process.exit(0)
    else if scaffold
      # Generate all the directories and the config file
      console.log "Creating scaffolding for " + scaffold
      # Make all the paths
      ensurePath scaffold, ->
        ensurePath scaffold + "/src", ->
          ensurePath scaffold + "/lib", ->
            ensurePath scaffold + "/ext", ->
              ensurePath scaffold + "/spec", ->
                # Generate default config file
                writeConfig scaffold + "/build.json"
                global.process.exit(0)
    else if htmlPage
        # Create html template
        generator = new HtmlGenerator()
        generator.createPageTemplate htmlPage
    else
        # Get build file from CLI args or use default
        buildOpt = parser.getOptions("b")
        buildFile = if buildOpt then buildOpt else "build.json"

        onStep "Checking for config..."
        path.exists buildFile, ( exists ) ->
          prepConfig( exists, buildFile, () ->

            # Get build template
            buildTemplate = parser.getOptions("t","template")
            if buildTemplate
                output = if buildTemplate == true then "build.json" else buildTemplate
                writeConfig output
                global.process.exit(0)

            # Run as CI server?
            continuous = parser.getOptions("ci")

            #Quiet mode
            quiet = parser.getOptions("q")

            # Host tests?
            test = parser.getOptions("p","pavlov")
            config.testTarget = config.output or= "lib"
            if test
              if parser.getOptions("s")
                config.testTarget = config.source or= "src"
              hostPavlov()

            # Host pages?
            host = parser.getOptions("h")
            if host
                hostStatic()
            # Run transforms and generate output
            process()
          )


# ## prepConfig ##
# Fallback to default config, if specified config doesn't exist
# ### Args:
# * _exists {Boolean}_: does the specified config file exist?
# * _file {String}_: config file name
# * _complete {Function}_: what to do after config is prepped
prepConfig = ( exists, file, complete ) ->
    unless exists
        loadConvention( complete )
    else
        loadConfig( file, complete )


# ## loadConfig ##
# Setup full configuration using specified config file 
# For example, anvil -b custom.json
# ### Args:
# * _file {String}_: config file name
# * _complete {Function}_: what to do after config is loaded
loadConfig = ( file, complete ) ->
    onStep "Loading config..."
    readFile "./" + file,  ( x ) ->
        config = JSON.parse( x )
        if config.extensions
            ext.gzip = config.extensions.gzip || ext.gzip
            ext.uglify = config.extensions.uglify || ext.uglify

        # Setup import wrapper
        if config.wrapper
          if config.wrapper['prefix-file']
            config.wrapper.prefix = readFileSync config.wrapper['prefix-file'], 'utf-8'
          if config.wrapper['suffix-file']
            config.wrapper.suffix = readFileSync config.wrapper['suffix-file'], 'utf-8'

        # Setup final output wrapper
        if config.finalize
          if config.finalize['header-file']
            config.finalize.header = fs.readFileSync config.finalize['header-file'], 'utf-8'
          if config.finalize['footer-file']
            config.finalize.footer = fs.readFileSync config.finalize['footer-file'], 'utf-8'

        # Setup output file renaming
        if config.name
          if typeof config.name == "string"
            config.getName = (x) -> config.name
          if typeof config.name == "object"
            config.getName = (x) -> config.name[x] || config.name
          config.rename = true


        # Carry on!
        complete()


# ## loadConvention ##
# Sets up default config if no config file is found
# ### Args:
# * _complete {Function}_: what to do after config is setup
loadConvention = ( complete ) ->
    onStep "Loading convention..."
    config = conventionConfig
    complete()


# ## writeConfig ##
# Creates new default config file
# ### Args:
# * _name {String}_: the config file name
writeConfig = ( name ) ->
    writeFileSync name, JSON.stringify( conventionConfig, null, "\t" ), ( x ) ->
        onComplete "#{name} created successfully!"

# The import detection regex
importRegex = new RegExp "([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g"