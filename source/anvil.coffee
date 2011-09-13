colors = require "colors"
fs = require "fs"
mkdir = require( "mkdirp" ).mkdirp
path = require "path"
jsp = require( "uglify-js" ).parser
pro = require( "uglify-js" ).uglify
jslint = require( "readyjslint" ).JSLINT
gzipper = require "gzip"
_ = require "underscore"
coffeeScript = require "coffee-script"


exports.run = ->
    onStep "Checking for config..."
    path.exists "./build.json", ( exists ) ->
        if exists
            loadConfig()
        else
            onError "No build file available."

config =
{
}

ext =
    gzip: "gz"
    uglify: "min"

onEvent = (x) ->
    console.log "   #{x}"

onStep = (x) ->
    console.log "#{x}".blue

onComplete = (x) ->
    console.log "#{x}".green

onError = (x) ->
    console.log "!!! Error: #{x} !!!".red

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
            qualified = ( { full: path.join( dir, x ), file: x } for x in list )
            list = ( { file: x.file, stat: fs.statSync x.full } for x in qualified )
            files = _.pluck ( _.select list, ( x ) -> x.stat.isFile() ), "file"
            count = files.length
            onFile dir, file, done for file in files

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

ensurePath = (target, callback) ->
    path.exists target, ( exists ) ->
        unless exists
            mkdir target, 0755, ( err ) ->
                if err
                    onError "Could not create #{target}. #{err}"
                else
                    callback()
        else
            callback()

loadConfig = () ->
    onStep "Loading config..."
    fs.readFile "./build.json", "utf8", ( err, result ) ->
        if err
            onError "Could not read build.json file."
        else
            config = JSON.parse( result )
            config.tmp = path.join config.source, "tmp"
            if config.extensions
                ext.gzip = config.extensions.gzip || ext.gzip
                ext.uglify = config.extensions.uglify || ext.uglify

            ensurePath config.output, () ->
                ensurePath config.tmp, () -> process()

process = () ->
    forFilesIn config.source, parseSource, (combineList) ->
        onEvent "#{combineList.length} files parsed."
        transformer = ( x, y ) -> createTransforms x, combineList, y
        forAll combineList, transformer, (withTransforms) ->
            analyzed = rebuildList withTransforms
            combiner = ( x, y ) -> combine( x, analyzed, y )
            forAll analyzed, combiner, (combined) ->
                buildList = removeIntermediates combined
                forAll _.pluck( buildList, "file" ), wrap, (wrapped) ->
                    forAll wrapped, lint, (passed) ->
                        forAll passed, uglify, (uggered) ->
                            forAll uggered, gzip, (gzipped) ->
                                onComplete "Output: " + gzipped.toString()

compileCoffee = ( sourcePath, file ) ->
    jsFile = file.replace ".coffee", ".js"
    coffeeFile = path.join sourcePath, file
    onEvent " Compiling #{coffeeFile}"
    coffee = fs.readFileSync coffeeFile, "utf8"
    js = coffeeScript.compile coffee
    fs.writeFileSync ( path.join config.tmp, jsFile ), js, "utf8"
    jsFile

parseSource = ( sourcePath, file, parsed ) ->
    filePath = path.join sourcePath, file
    onEvent "Parsing #{filePath}"
    if (file.substr file.length - 6) == "coffee"
        file = compileCoffee sourcePath, file
        parseSource config.tmp, file, parsed
    else
        fs.readFile filePath, "utf8", ( err, result ) ->
            if err
                onError ("#{err} trying to parse #{filePath}" )
            else
                imports = result.match new RegExp "[//]import[(][\"].*[\"][);]", "g"
                count = imports?.length
                onEvent "   found #{count or= 0} imports"
                if imports
                    files = ( (target.match ///[\"].*[\"]///)[0] for target in imports)
                    files = (x.replace(///[\"]///g,'') for x in files)
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
    pattern = new RegExp("([/]{2}|[#])import[( ][\"]" + include + "[\"][ )][;]?","g")
    includedItem = _.detect list, ( x ) -> x.file == include
    outputPath = config.source
    if includedItem
        outputPath = config.output
    filePath = path.join outputPath, include
    onStep "Building transform for #{filePath}"
    done (x) ->
        try
            content = fs.readFileSync filePath, "utf8"
            x.replace pattern, content
        catch err
            onError "#{err} trying to read #{filePath} while building transforms"

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
    try
        output = path.join config.output, item.file
        file = fs.readFileSync item.fullPath, "utf8"
        if item.transforms
            file = tx( file ) for tx in item.transforms
        try
            fs.writeFileSync output, file
            onEvent "  writing #{output}"
            item.file = output
            item.combined = true
            done item
        catch writeErr
            onError "#{writeErr} when writing output to #{output}"
    catch readErr
            onError "#{readErr} while reading #{item.fullPath} for combination"

precombineIncludes = ( includes, list, done ) ->
    items = _.select list, ( x ) -> _.any includes, ( y ) -> y == x and not x.combined
    combine x, list, done for x in items

deleteFile = ( dir, file, done ) ->
    fs.unlink path.join( dir, file ), (err) ->
        unless err
            done undefined

removeIntermediates = ( list ) ->
    forFilesIn config.tmp, deleteFile, () ->
        fs.rmdir config.tmp
    intermediate = _.pluck _.select( list, ( y ) -> y.used > 0 ), "file"
    output = _.select( list, ( y ) -> y.used == 0 )
    fs.unlink x for x in intermediate
    output

lint = ( item, done ) ->
    unless config.lint
        done item
    else
        onStep "Linting #{item}"
        fs.readFile item, "utf8", ( err, file ) ->
            if err
                onError "#{err} when reading #{item}"
                done item
            else
                result = jslint file, {}
                unless result
                    onError "LINT FAILED ON #{item}"
                    errors = _.select( jslint.errors, ( e ) -> e )
                    onEvent "   line #{x.line}, pos #{x.character} - #{x.reason}".red for x in errors
                else
                    onComplete "Lint for #{item} passed!"
                done item

uglify = ( item, done ) ->
    unless config.uglify
        done item
    else
        onStep "Uglifying #{item}"
        fs.readFile item, "utf8", ( readErr, file ) ->
            if readErr
                onError "#{readErr} reading while uglifying #{file}"
                done item
            else
                ast = jsp.parse file
                ast = pro.ast_mangle ast
                ast = pro.ast_squeeze ast
                output = pro.gen_code ast
                ugg = item.replace(".js","." + ext.uglify + ".js")
                fs.writeFile ugg, output, ( writeErr ) ->
                    if writeErr
                        onError "#{writeErr} writing while uglifying #{output}"
                        done item
                     else
                        onComplete "#{ugg} uglified successfully"
                        done ugg

gzip = ( item, done ) ->
    unless config.gzip
        done item
    else
        onStep "Zipping #{item}"
        fs.readFile item, "utf8", ( readErr, file ) ->
            if readErr
                onError "#{readErr} reading while zipping #{item}"
                done item
            else
                gzipper file, ( zipErr, output ) ->
                    if zipErr
                        onError "#{zipErr} zipping #{item}"
                        done item
                    else
                        gz = item.replace(".js","." + ext.gzip + ".js")
                        fs.writeFile gz, output, ( writeErr ) ->
                            if writeErr
                                onError "#{writeErr} writing while zipping #{item}"
                                done item
                            else
                                onComplete "#{gz} gzipped successfully"
                                done gz

wrap = ( item, done ) ->
    unless config.prefix or config.suffix
        done item

    onStep "Wrapping #{item}"
    fs.readFile item, "utf8", ( readErr, file ) ->
        if readErr
            onError "#{readErr} reading while wrapping #{item}"
            done item
        else
            if config.prefix
                file = config.prefix + "\r\n" + file
            if config.suffix
                file = file + "\r\n" + config.suffix
            fs.writeFile item, file, ( writeErr ) ->
                if writeErr
                    onError "#{writeErr} writing while wrapping #{item}"
                    done item
                else
                    onComplete " #{item} successfully wrapped!"
                    done item

