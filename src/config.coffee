config =
{
}

conventionConfig =
{
    "source": "src",
    "output": "lib",
    "lint": {},
    "uglify": {},
    "gzip": {},
}

continuous = false
inProcess = false

ext =
    gzip: "gz"
    uglify: "min"

ensurePaths = () ->
    config.tmp = path.join config.source, "tmp"
    ensurePath config.output, () ->
        ensurePath config.tmp, () -> process()

configure = () ->
    parser = new ArgParser().parse();
    parser.addValueOptions(["t","b"])

    # Get build file or use default
    buildOpt = parser.getOptions("b")
    buildFile = if buildOpt then buildOpt else "build.json"

    # Get build template
    buildTemplate = parser.getOptions("t","template")
    if buildTemplate
        output = if buildTemplate == true then "build.json" else buildTemplate
        writeConfig output

    # Run as CI server?
    continuous = parser.getOptions("ci")
    
    onStep "Checking for config..."
    path.exists "./build.json", ( exists ) -> prepConfig( exists, buildFile )

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
        ensurePaths()

loadConvention = () ->
    onStep "Loading convention..."
    config = conventionConfig
    ensurePaths()

writeConfig = ( name ) ->
    writeFile name, JSON.stringify( conventionConfig, null,"\t" ), ( x ) ->
        onComplete "#{name} created successfully!"

importRegex = new RegExp "([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g"