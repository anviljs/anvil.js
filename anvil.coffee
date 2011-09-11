colors = require "colors"
fs = require "fs"
path = require "path"
jsp = require("uglify-js").parser
pro = require("uglify-js").uglify
jshint = require "jshint"
gzipper = require "gzip"

config =
{
}
console.log "Checking for config..."
path.exists "./build.json", ( exists ) ->
    if exists
        loadConfig()
    else
        yell()

loadConfig = () ->
    console.log "Loading config..."
    fs.readFile "./build.json", "utf8", ( err, result ) ->
        if err
            yell()
        else
            config = JSON.parse( result )
            process()

process = () ->
    forFilesIn config.source, parseSource, (combineList) ->
        forAll combineList, createTransforms, (withTransforms) ->
            forAll withTransforms, combine, (combined) ->
                forAll combined, wrap, (wrapped) ->
                    forAll wrapped, lint, (passed) ->
                        forAll passed, uglify, (uggered) ->
                            forAll uggered, gzip, (gzipped) ->
                                console.log "Output: " + gzipped.toString()


forFilesIn = ( path, onFile, onComplete ) ->
    count = 0
    results = []
    done = ( result ) ->
        count = count - 1
        if result
            results.push result
        if count == 0
            onComplete( results )
    fs.readdir path, ( err, files ) ->
        if err
            yell()
        else
            count = files.length
            onFile path, file, done for file in files

forAll = ( list, onItem, onComplete ) ->
    if not list
        console.log "You passed forAll an empty array"
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

parseSource = ( sourcePath, file, parsed ) ->
    filePath = path.join sourcePath, file
    fs.readFile filePath, "utf8", ( err, result ) ->
        if err
            yell()
        else
            console.log "Parsing " + filePath
            imports = result.match new RegExp "[//]import_source[(][\"].*[\"][);]", "g"
            console.log "\t" + filePath + " has " + imports?.length + " imports "
            if imports
                files = ( (target.match ///[\"].*[\"]///)[0] for target in imports)
                files = (x.replace(///[\"]///g,'') for x in files)
                console.log "\t\t -" + x for x in files
                parsed { fullPath: filePath, file: file, path: sourcePath, includes: files }
            else
                parsed null

createTransforms = ( item, done ) ->
    forAll item.includes,
            (x, onTx) -> buildTransforms( x, item, onTx ),
            (transforms) ->
                item.transforms = transforms
                done item

buildTransforms = ( include, item, done ) ->
    pattern = new RegExp("[/][/]import_source[(][\"]" + include + "[\"][)];","g")
    filePath = path.join config.source, include
    console.log "building transform for " + filePath
    fs.readFile filePath, "utf8", ( err, content ) ->
        if err
            yell("build transform read ")
        else
            done (x) -> x.replace pattern, content

combine = ( item, done ) ->
    console.log "Combining " + item.fullPath
    fs.readFile item.fullPath, "utf8", (err, file ) ->
        if err
            yell("combine read")
        else
            output = path.join config.output, item.file
            file = tx( file ) for tx in item.transforms
            fs.writeFile output, file, (err) ->
                if err
                    yell("combine write")
                else
                    done output


lint = ( item, done ) ->
    unless config.lint
        done item
    else
        console.log "Linting " + item
        fs.readFile item, "utf8", ( err, file ) ->
            if err
                yell("lint read")
                done item
            else
                result = jshint.JSHINT(file, {plusplus: true})
                if result.errors
                    console.log "LINT FAILED ON " + item
                    console.log "\t" + error for error in result.errors
                else
                    console.log "Lint passed!".green
                done item

uglify = ( item, done ) ->
    console.log "Uglifying " + item
    fs.readFile item, "utf8", ( readErr, file ) ->
        if readErr
            yell("uglify read")
            done item
        else
            ast = jsp.parse file
            ast = pro.ast_mangle ast
            ast = pro.ast_squeeze ast
            output = pro.gen_code ast
            ugg = item.replace(".js",".uggo.js")
            fs.writeFile ugg, output, ( writeErr ) ->
                if writeErr
                    yell "uglify write"
                    done item
                 else
                    console.log ugg + " is an uggo!".green
                    done ugg

gzip = ( item, done ) ->
    console.log "Zipping " + item
    fs.readFile item, "utf8", ( readErr, file ) ->
        if readErr
            yell( "zip read" )
            done item
        else
            gzipper file, ( zipErr, output ) ->
                if zipErr
                    yell "zipping"
                    done item
                else
                    gz = item.replace(".js",".gz.js")
                    fs.writeFile gz, output, ( writeErr ) ->
                        if writeErr
                            yell "zip write"
                            done item
                        else
                            console.log gz + " is gzipped!".green
                            done gz

wrap = ( item, done ) ->
    unless config.prefix or config.suffix
        done item

    console.log "Wrapping " + item
    fs.readFile item, "utf8", ( readErr, file ) ->
        if readErr
            yell( "wrapper read" )
            done item
        else
            if config.prefix
                file = config.prefix + "\r\n" + file
            if config.suffix
                file = file + "\r\n" + config.suffix
            fs.writeFile item, file, ( writeErr ) ->
                if writeErr
                    yell "wrapper write"
                    done item
                else
                    console.log item + " successfully wrapped!".green
                    done item

yell = (x) ->
    console.log  x + " FAILED! I'M SCREAMING, I'M SCREAMING, I'M SCREAMING!".red
