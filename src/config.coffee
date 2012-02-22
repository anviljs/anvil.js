config = { }

conventionConfig =
    "source": "src"
    "output": "lib"
    "spec": "spec"
    "ext": "ext"
    "lint": {}
    "uglify": {}
    "gzip": {}
    "hosts": {
      "/": "html"
    }

continuous = test = false
inProcess = false
quiet = false

version = "0.5.5"

ext =
    gzip: "gz"
    uglify: "min"

ensurePaths = (callback) ->
    config.tmp = path.join config.source, "tmp"
    ensurePath config.output, () ->
        ensurePath config.tmp, -> callback()

configure = () ->
    parser = new ArgParser();
    parser.addValueOptions(["t","b","n","html"])
    parser.parse()

    # Generate scaffold for new project?
    scaffold = parser.getOptions("n")
    htmlPage = parser.getOptions("html")
    showVersion = parser.getOptions("v","version")
    if showVersion
        console.log "Anvil.js " + version
        global.process.exit(0)
    else if scaffold
      console.log "Creating scaffolding for " + scaffold
      ensurePath scaffold, ->
        ensurePath scaffold + "/src", ->
          ensurePath scaffold + "/lib", ->
            ensurePath scaffold + "/ext", ->
              ensurePath scaffold + "/spec", ->
                writeConfig scaffold + "/build.json"
                global.process.exit(0)
    else if htmlPage
        # Create html template?
            generator = new HtmlGenerator()
            generator.createPageTemplate htmlPage
    else
        # Get build file or use default
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

            process()
          )



prepConfig = ( exists, file, complete ) ->
    unless exists
        loadConvention( complete )
    else
        loadConfig( file, complete )

loadConfig = ( file, complete ) ->
    onStep "Loading config..."
    readFile "./" + file,  ( x ) ->
        config = JSON.parse( x )
        if config.extensions
            ext.gzip = config.extensions.gzip || ext.gzip
            ext.uglify = config.extensions.uglify || ext.uglify

        if config.wrapper
          if config.wrapper['prefix-file']
            config.wrapper.prefix = readFileSync config.wrapper['prefix-file'], 'utf-8'
          if config.wrapper['suffix-file']
            config.wrapper.suffix = readFileSync config.wrapper['suffix-file'], 'utf-8'

        if config.finalize
          if config.finalize['header-file']
            config.finalize.header = fs.readFileSync config.finalize['header-file'], 'utf-8'
          if config.finalize['footer-file']
            config.finalize.footer = fs.readFileSync config.finalize['footer-file'], 'utf-8'

        if config.name
          if typeof config.name == "string"
            config.getName = (x) -> config.name
          if typeof config.name == "object"
            config.getName = (x) -> config.name[x] || config.name
          config.rename = true



        complete()

loadConvention = ( complete ) ->
    onStep "Loading convention..."
    config = conventionConfig
    complete()

writeConfig = ( name ) ->
    writeFileSync name, JSON.stringify( conventionConfig, null, "\t" ), ( x ) ->
        onComplete "#{name} created successfully!"

importRegex = new RegExp "([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g"