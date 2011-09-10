fs = require "fs"
path = require "path"
jsp = require("uglify-js").parser;
pro = require("uglify-js").uglify;


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
            process JSON.parse( result )

process = ( config ) ->
    {
        source: sourcePath,
        modules: modulePath,
        output: outputPath,
        packages: dependencyList,
        uglify: uglifyOptions,
        prefix: prepend,
        suffix: append
    } = config
    files = 0
    onFile = (file) ->
        console.log "Combining " + file.file + "'s includes"
        combine outputPath, file, () ->
            files = files - 1
            if files == 0
                uglifyOutput outputPath, uglifyOptions, () -> finish prepend append
    findImports sourcePath, onFile, (total) -> files = total


findImports = ( sourcePath, onFile, onCount ) ->
    fs.readdir sourcePath, ( err, files ) ->
        if err
            yell()
        else
            console.log "Found " + files.length
            onCount( files.length )
            parseSource sourcePath, file, onFile for file in files

parseSource = ( sourcePath, file, ready ) ->
    filePath = path.join sourcePath, file
    fs.readFile filePath, "utf8", ( err, result ) ->
        if err
            yell()
        else
            console.log "Parsing " + filePath
            imports = result.match new RegExp "import_source[(][\"].*[\"][);]", "g"
            if imports
                files = ( (target.match ///[\"].*[\"]///)[0] for target in imports)
                console.log x for x in files
                files = (x.replace(///[\"]///g,'') for x in files)
                ready { fullPath: filePath, file: file, path: sourcePath, includes: files }

combine = ( outputPath, item ) ->
    console.log JSON.stringify( item )
    fs.readFile item.fullPath, "utf8", (err, parent ) ->
        if err
            yell()
        else
            count = item.includes.length
            transforms = []
            done = (transform) ->
                count--
                transforms.push( transform )
                if count == 0
                    output = path.join outputPath, item.file
                    parent = tx( parent ) for tx in transforms
                    fs.writeFile output, parent, (err) ->
                        if err
                            yell()
            replace item.path, target, done for target in item.includes


replace = ( sourcePath, target, done ) ->
    filePath = path.join sourcePath, target
    console.log "Replacing placeholders for " + filePath
    fs.readFile filePath, "utf8", ( err, result ) ->
        if err
            yell()
        else
            pattern = new RegExp("import_source[(][\"]"+target+"[\"][);]","g")
            done( (x) -> x.replace( pattern, result )  )

uglifyOutput = ( outputPath, uglifyOptions, done ) ->
    done()

finish = ( prepend, append ) ->
    console.log "DONE"

yell = () ->
    console.log "I'M SCREAMING, I'M SCREAMING, I'M SCREAMING!"