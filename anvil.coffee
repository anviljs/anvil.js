fs = require "fs"
path = require "path"
jsp = require("uglify-js").parser;
pro = require("uglify-js").uglify;

config = {}
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
                forAll combined, lint, (passed) ->
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
            imports = result.match new RegExp "[\/\/]import_source[(][\"].*[\"][);]", "g"
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
    pattern = new RegExp("[\/\/]import_source[(][\"]" + include + "[\"][);]","g")
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
    done item

uglify = ( item, done ) ->
    done item

gzip = ( item, done ) ->
    done item

finish = ( prepend, append ) ->
    console.log "DONE"

yell = (x) ->
    console.log  x + " FAILED! I'M SCREAMING, I'M SCREAMING, I'M SCREAMING!"
