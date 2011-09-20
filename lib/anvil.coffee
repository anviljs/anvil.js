events = require("events")
emitter = events.EventEmitter

_ = require "underscore"
colors = require "colors"
fs = require "fs"
mkdir = require( "mkdirp" ).mkdirp
path = require "path"

ArgParser = require "argparser"
express = require "express"
resource = require "express-resource"
builder = require "DOMBuilder"
dive = require "dive"

jsp = require( "uglify-js" ).parser
pro = require( "uglify-js" ).uglify
jslint = require( "readyjslint" ).JSLINT
gzipper = require( "gzip" )
coffeeScript = require "coffee-script"

onEvent = (x) ->
    console.log "   #{x}"

onStep = (x) ->
    console.log "#{x}".blue

onComplete = (x) ->
    console.log "#{x}".green

onError = (x) ->
    console.log "!!! Error: #{x} !!!".red

forAll = ( list, onItem, onComplete ) ->
    if not list
        onComplete []
    count = list.length
    results = []
    done = ( result ) ->
        count = count - 1
        if result
            results.push result
        if count == 0
            onComplete( results )
    onItem item, done for item in list

forFilesIn = ( dir, onFile, onComplete ) ->
    count = 0
    results = []
    done = ( result ) ->
        count = count - 1
        if result
            results.push result
        if count == 0
            onComplete( results )
    fs.readdir dir, ( err, list ) ->
        if err
            onError "#{err} occurred trying to read the path #{path}"
        else
            list = _.select list, ( x ) ->
              ext = path.extname x
              ext == ".coffee" or ext == ".js"
            qualified = ( { full: path.join( dir, x ), file: x } for x in list )
            list = ( { file: x.file, stat: fs.statSync x.full } for x in qualified )
            files = _.pluck ( _.select list, ( x ) -> x.stat.isFile() ), "file"
            count = files.length
            onFile dir, file, done for file in files

ensurePath = (target, callback) ->
    path.exists target, ( exists ) ->
        unless exists
            mkdir target, "0755", ( err ) ->
                if err
                    onError "Could not create #{target}. #{err}"
                else
                    callback()
        else
            callback()

deleteFile = ( dir, file, done ) ->
    fs.unlink path.join( dir, file ),
        (err) ->
            unless err then done null

removeIntermediates = ( list ) ->
    forFilesIn config.tmp, deleteFile, () ->
        fs.rmdir config.tmp
    intermediate = _.pluck _.select( list, ( y ) -> y.used > 0 ), "file"
    output = _.select( list, ( y ) -> y.used == 0 )
    fs.unlink x for x in intermediate
    output

buildPath = ( spec ) ->
    file = spec
    if _(spec).isArray()
        join = path.join
        file = join.apply( this, spec )
    file

transformFile = ( filePath, transform, outputPath, done ) ->
    readFile(
        filePath,
        (x) ->
            transform x, ( content ) ->
              writeFile outputPath, content, done
    )

transformFileSync = ( filePath, transform, outputPath, done ) ->
    readFileSync(
        filePath,
        (x) ->
            content = transform x
            writeFileSync outputPath, content, done
    )

readFile = ( filePath, onFile ) ->
    file = buildPath filePath
    fs.readFile file, "utf8", ( err, content ) ->
        if err
            onError "Error #{err}: reading #{file}."
        else
            onFile content

readFileSync = ( filePath, onFile ) ->
    file = buildPath filePath
    try
        onFile fs.readFileSync file, "utf8"
    catch err
        onError "Error #{err}: reading #{file}."

writeFile = ( filePath, content, done ) ->
    file = buildPath filePath
    fs.writeFile file, content, "utf8", ( err ) ->
      if err
          onError "Error #{err}: writing #{file}"
      else
          done file

writeFileSync = ( filePath, content, done ) ->
    file = buildPath filePath
    try
      fs.writeFileSync file, content, "utf8"
      done file
    catch err
      onError "Error #{err}: writing #{file} (sync)"

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

ext =
    gzip: "gz"
    uglify: "min"

ensurePaths = (callback) ->
    config.tmp = path.join config.source, "tmp"
    ensurePath config.output, () ->
        ensurePath config.tmp, -> callback()

configure = () ->
    parser = new ArgParser().parse();
    parser.addValueOptions(["t","b","n"])

    # Generate scaffold for new project?
    scaffold = parser.getOptions("n")
    if scaffold
      console.log "Creating scaffolding for " + scaffold
      ensurePath scaffold, ->
        ensurePath scaffold + "/src", ->
          ensurePath scaffold + "/lib", ->
            ensurePath scaffold + "/ext", ->
              ensurePath scaffold + "/spec", ->
      return

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

    # Host tests?
    test = parser.getOptions("p","pavlov")
    
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
        process()

loadConvention = () ->
    onStep "Loading convention..."
    config = conventionConfig
    process()

writeConfig = ( name ) ->
    writeFile name, JSON.stringify( conventionConfig, null,"\t" ), ( x ) ->
        onComplete "#{name} created successfully!"

importRegex = new RegExp "([/].|[#])import[( ][\"].*[\"][ )][;]?([*/]{2})?", "g"

createStep = ( step, onFile ) ->
    return ( item, done ) ->
        unless config[step]
            done item
        else
            onStep "Step - #{step}: #{item}"
            readFile item, ( x ) ->
                onFile item, x, done

createTransformStep = ( step, transform, rename ) ->
    return ( item, done ) ->
        unless config[step]
            done item
        else
            onStep "Step - #{step}: #{item}"
            output = rename item
            transformFile item, transform, output, ( x ) ->
                onComplete "Step - #{step} successful for #{item}"
                done x

lint = createStep "lint", ( item, file, done ) ->
    result = jslint file, {}
    unless result
        onError "LINT FAILED ON #{item}"
        errors = _.select( jslint.errors, ( e ) -> e )
        onEvent "   line #{x.line}, pos #{x.character} - #{x.reason}".red for x in errors
    else
        onComplete "#{item} passed lint!"
    done item

uglify = createTransformStep "uglify",
    ( x, done ) ->
        ast = jsp.parse x
        ast = pro.ast_mangle ast
        ast = pro.ast_squeeze ast
        done pro.gen_code ast
    ,
    ( x ) -> x.replace(".js","." + ext.uglify + ".js")

gzip = createTransformStep "gzip",
    ( x, done ) ->
        gzipper x, ( err, result ) -> done result
    ,
    ( x ) -> x.replace(".js","." + ext.gzip + ".js")

wrap = createTransformStep "wrap",
    ( x, done ) ->
        if config.wrap.prefix
            x = config.wrap.prefix + "\r\n" + x
        if config.wrap.suffix
            x = x + "\r\n" + config.wrap.suffix
        done x
    ,
    ( x ) -> x

createPage = () ->

    specPath = config.spec or= "./spec"

    externals = fs.readdirSync config.ext or= "./ext"
    lib = fs.readdirSync config.source
    spec = fs.readdirSync config.spec or= "./spec"

    list = externals.concat( lib ).concat( spec )

    html = builder.html
    page = html.HTML(
      html.HEADER
        html.LINK
          rel: "stylesheet"
          href: __dirname + "/qunit.csss"
          type: "text/css"
          media: "screen"
        ,
        html.SCRIPT
          type: "text/javascript"
          src: __dirname + "/qunit.js"
        ,
        html.SCRIPT
          type: "text/javascript"
          src: __dirname = "/pavlov.js"
        ,
        html.SCRIPT.map (item, attrs) ->
          attrs["type"] = "text/javascript"
          attrs["src"] = item
      ,
      html.BODY(
        ["h1", {"id": "qunit-header"},
          ["h2", {"id":"qunit-banner"}],
          ["div", {"id":"qunit-testrunner-toolbar"}],
          ["h2", {"id":"qunit-userAgent"}],
          ["ol",{"id":"qunit-tests"}]
        ]
      )
    )

    ensurePath( specPath, ->
      writeFileSync specPath + "/index.html", page.toString(), ->
      onEvent "Pavlov test page generated"
     )

startHost = () ->
    app = express.createServer()
    app.use( express.bodyParser() )

    app.use("/", express.static( config.spec or= "./spec" ) )
    
    app.listen( 1580 )

exports.run = ->
    configure()

process = () ->
    unless inProcess
        inProcess = true
        try
          ensurePaths -> crawlFiles()
        catch ex
          inProcess = false
          onError "The build failed failingly. Like a failure :@"
    else
      onError "There is already a build in process"

crawlFiles = () ->
  forFilesIn config.source, parseSource, (combineList) ->
      onEvent "#{combineList.length} files parsed."
      transformer = ( x, y ) -> createTransforms x, combineList, y
      forAll combineList, transformer, transform
  inProcess = false

transform = (withTransforms) ->
  analyzed = rebuildList withTransforms
  combiner = ( x, y ) -> combine( x, analyzed, y )
  forAll analyzed, combiner, pack
  
pack = (combined) ->
  buildList = removeIntermediates combined
  forAll _.pluck( buildList, "file" ), wrap, (wrapped) ->
      forAll wrapped, lint, (passed) ->
          forAll passed, uglify, (uggered) ->
              forAll uggered, gzip, (gzipped) ->
                  onComplete "Output: " + gzipped.toString()
                  inProcess = false
                  if continuous
                      createWatch()

compileCoffee = ( sourcePath, file ) ->
    jsFile = file.replace ".coffee", ".js"
    coffeeFile = path.join sourcePath, file
    transformFileSync(
        coffeeFile,
        ( x ) ->
          try
            coffeeScript.compile x, { bare: true }
          catch error
            inProcess = false
        [ config.tmp, jsFile ],
        ( x ) -> x == x
    )
    jsFile

parseSource = ( sourcePath, file, parsed ) ->
    filePath = path.join sourcePath, file
    onEvent "Parsing #{filePath}"
    if (file.substr file.length - 6) == "coffee" and not config.justCoffee
        try
          file = compileCoffee sourcePath, file
          parseSource config.tmp, file, parsed
        catch ex
          inProcess = false
    else
        readFile filePath, ( content ) ->
            imports = content.match importRegex
            count = imports?.length
            if imports
                files = ( (target.match ///[\"].*[\"]///)[0] for target in imports )
                files = ( x.replace(///[\"]///g,'') for x in files )
                unless config.justCoffee
                    files = ( x.replace(".coffee", ".js") for x in files )
                onEvent "   - #{x}" for x in files
                parsed { fullPath: filePath, file: file, path: sourcePath, includes: files, combined: false }
            else
                parsed { fullPath: filePath, file: file, path: sourcePath, includes: [], combined: false }

createTransforms = ( item, list, done ) ->
    if item.includes.length == 0
        done item
    forAll item.includes,
            (x, onTx) -> buildTransforms( x, item, list, onTx ),
            (transforms) ->
                item.transforms = transforms
                done item

buildTransforms = ( include, item, list, done ) ->
    includePattern = include.replace(".coffee","").replace(".js","") + "[.](js|coffee)"
    pattern = new RegExp("([/].|[#]{1,3})import[( ][\"]" + includePattern + "[\"][ )]?[;]?([*/]{2})?[#]{0,3}","g")
    includedItem = _.detect list, ( x ) -> x.file == include
    outputPath = config.source
    if includedItem
        outputPath = config.output
    filePath = path.join outputPath, include
    onStep "Building transform for #{filePath}"
    done (x) ->
        content = fs.readFileSync filePath, "utf8"
        x.replace pattern, content

rebuildList = ( list ) ->
    list = ( findUses x, list for x in list )
    _.select list, ( x ) -> x != undefined

findUses = ( item, list ) ->
    unless item
        undefined
    else
        uses = _.select list,
            ( x ) -> _.any x.includes, ( y ) -> item.file == y
        count = uses?.length
        item.used = count or= 0
        item

combine = ( item, list, done ) ->
    if item.combined
        return item.combined
    onStep "Combining #{item.fullPath} and its includes"
    precombineIncludes item.includes, list, done
    output = path.join config.output, item.file
    transformFileSync(
        item.fullPath,
        ( x ) ->
            if item.transforms
                x = tx( x ) for tx in item.transforms
            x
        ,
        output,
        ( x ) ->
            item.file = output
            item.combined = true
            done item
    )

precombineIncludes = ( includes, list, done ) ->
    items = _.select list, ( x ) -> _.any includes, ( y ) -> y == x.file and not x.combined
    combine z, list, done for z in items


createWatch = () ->
  continuous = false
  onChange = triggerProcess
  dive config.source, { recursive: false, all: false }, ( err, file ) ->
    unless err
      fs.watchFile file, { persistent: true }, ( c, p ) ->
        onEvent "Change in #{file} detected. Rebuilding..."
        callback = onChange
        onChange = -> #do nothing
        callback()

triggerProcess = () ->
  dive config.source, { recursive: false, all: false }, ( err, file ) ->
    unless err
      fs.unwatchFile file
  createPage()
  process()