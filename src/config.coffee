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

ext =
    gzip: "gz"
    uglify: "min"

ensurePaths = () ->
    config.tmp = path.join config.source, "tmp"
    ensurePath config.output, () ->
        ensurePath config.tmp, () -> process()

prepConfig = ( file ) ->
    unless file
        loadConvention()
    else
        loadConfig()

loadConfig = () ->
    onStep "Loading config..."
    readFile "./" + buildTarget,  ( x ) ->
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

buildTarget = ( global.process.argv[2] or= "build" ) + ".json"

importRegex = new RegExp "([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g"