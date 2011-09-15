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