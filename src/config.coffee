config =
{
}

conventionConfig =
    "source": "src"
    "output": "lib"
    "spec": "spec"
    "ext": "ext"
    "lint": {}
    "uglify": {}
    "gzip": {}

continuous = test = false
inProcess = false
quiet = false

version = "0.5.0"

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
        if test
          hostPavlov()

        # Host pages?
        host = parser.getOptions("h")
        if host
            hostStatic()

        onStep "Checking for config..."
        path.exists buildFile, ( exists ) -> prepConfig( exists, buildFile )

prepConfig = ( exists, file ) ->
    unless exists
        loadConvention()
    else
        loadConfig( file )

loadConfig = ( file ) ->
    onStep "Loading config..."
    readFile "./" + file,  ( x ) ->
        config = JSON.parse( x )
        if config.extensions
            ext.gzip = config.extensions.gzip || ext.gzip
            ext.uglify = config.extensions.uglify || ext.uglify
        process()

loadConvention = () ->
    onStep "Loading convention..."
    config = conventionConfig
    process()

writeConfig = ( name ) ->
    writeFileSync name, JSON.stringify( conventionConfig, null, "\t" ), ( x ) ->
        onComplete "#{name} created successfully!"

importRegex = new RegExp "([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g"