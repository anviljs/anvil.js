# ## forAll ##
# Iterate _list_ calling _onItem_ callback with the list item and _done_ as args
# When done (ie, _count == 0_) call _onComplete_ with the results
# ### Args:
# * _list {Array}_: a list of items to operate on
# * _onItem {Function}_: the operation to perform on each item
# * _onComplete {Function}_: callback called when all items have been operated on
forAll = ( list, onItem, onComplete ) ->
    # Fail fast if list is empty
    if not list
        onComplete []
    count = list.length
    results = []
    # Pushes _result_ (if truthy) onto the _results_ list and, if there are no more
    # items, calls _onComplete_ with _results_
    done = ( result ) ->

        count = count - 1
        # Is _result_ truthy?
        if result
            # Append to _results_!
            results.push result
        # Is iteration complete?
        if count == 0
            # Call _onComplete_!
            onComplete( results )
    # Iteration occurs here
    onItem item, done for item in list

# ## forFilesIn ##
# Iterates files in _dir_ calling _onFile_ callback with each file and _done_ as args
# When done (ie, _count == 0_) call _onComplete_ with the results
# ### Args:
# * _dir {String}_: pathspec of dir to retrieve the list of files from
# * _onFile {Function}_: the operation to perform on each file
# * _onComplete {Function}_: callback called when all files have been operated on
forFilesIn = ( dir, onFile, onComplete ) ->
    count = 0
    results = []
    # Pushes _result_ (if truthy) onto the _results_ list and, if there are no more
    # items, calls _onComplete_ with _results_
    done = ( result ) ->
        count = count - 1
        if result
            results.push result
        if count == 0
            onComplete( results )
    # Load up _dir_
    fs.readdir dir, ( err, list ) ->
        if err
            onError "#{err} occurred trying to read the path #{path}"
        else
            # Get files that are .js/.coffee files
            list = _.select list, ( x ) ->
              ext = path.extname x
              ext == ".coffee" or ext == ".js"
            # Generate a list of { full: '/full/path/including/file.js', file: 'file.js'} objects
            qualified = ( { full: path.join( dir, x ), file: x } for x in list )
            list = ( { file: x.file, stat: fs.statSync x.full } for x in qualified )
            files = _.pluck ( _.select list, ( x ) -> x.stat.isFile() ), "file"
            count = files.length
            if count == 0
                onComplete([])
            onFile dir, file, done for file in files

# ## ensurePath ##
# Makes sure _target_ path exists before calling _callback_ by
# calling _mkdir target..._ if _target_ does not initially exist
# ### Args:
# * _target {String}_: pathspec
# * _callback {Function}_: called if path exists or is successfully created
ensurePath = (target, callback) ->
    path.exists target, ( exists ) ->
        unless exists
            # No _target_ yet. Let's make it!
            mkdir target, "0755", ( err ) ->
                # Couldn't make the path. Report and abort!
                if err
                    onError "Could not create #{target}. #{err}"
                else
                    callback()
        else
            callback()

# ## deleteFile ##
# Deletes a file, given the file name (_file_) and its parent (_dir_)
# ### Args:
# * _dir {String}_: pathspec of parent dir
# * _file {String}_: file name
# * _done {Function}_: callback called if the file delete is successful
deleteFile = ( dir, file, done ) ->
    fs.unlink path.join( dir, file ),
        (err) ->
            unless err then done null

# ## removeIntermediates ##
# Clean up intermediate files
# ### Args:
# * _list {Array}_: list of files to cull intermediate files from
removeIntermediates = ( list ) ->
    forFilesIn config.tmp, deleteFile, () ->
        fs.rmdir config.tmp
    intermediate = _.pluck _.select( list, ( y ) -> y.used > 0 ), "file"
    output = _.select( list, ( y ) -> y.used == 0 )
    fs.unlink x for x in intermediate
    output

# ## buildPath ##
# Given an array or string pathspec, return a string pathspec
# ### Args:
# * _spec {Array, String}_: pathspec of either an array of strings or a single string
buildPath = ( spec ) ->
    file = spec
    if _(spec).isArray()
        join = path.join
        file = join.apply( this, spec )
    file

# ## transformFile ##
# Given input file _filePath_, perform _transform_ upon it then write the transformed content
# to _outputPath_ and call _done_. (All operations performed asynchronously.)
# ### Args:
# * _filePath {String}_: pathspec of file to transform
# * _transform {Function}_: transform to perform on the file
# * _outputPath {String}_: pathspec of output file
# * _done {Function}_: called when all operations are complete
transformFile = ( filePath, transform, outputPath, done ) ->
    readFile(
        filePath,
        (x) ->
            transform x, ( content ) ->
              writeFile outputPath, content, done
    )

# ## transformFileSync ##
# Given input file _filePath_, perform _transform_ upon it then write the transformed content
# to _outputPath_ and call _done_. (All operations performed synchronously.)
# ### Args:
# * _filePath {String}_: pathspec of file to transform
# * _transform {Function}_: transform to perform on the file
# * _outputPath {String}_: pathspec of output file
# * _done {Function}_: called when all operations are complete
transformFileSync = ( filePath, transform, outputPath, done ) ->
    readFileSync(
        filePath,
        (file_contents) ->
            content = transform file_contents
            writeFileSync outputPath, content, done
    )

# ## readFile ##
# Reads a file from _filePath_ and calls _onFile_ callback with contents (Asynchronously)
# ### Args:
# * _filePath {String}_: pathspec of file to read and pass contents from
# * _onFile {Function}_: callback to pass file's contents to 
readFile = ( filePath, onFile ) ->
    # In case _filePath_ is an Array of path parts, run it through _buildPath_
    file = buildPath filePath
    # Attempt to read the file's contents
    fs.readFile file, "utf8", ( err, content ) ->
        if err
            onError "Error #{err}: reading #{file}."
        else
            # Call the _onFile_ callback
            onFile content

# ## readFileSync ##
# Reads a file from _filePath_ and calls _onFile_ callback with contents (Synchronously)
# ### Args:
# * _filePath {String}_: pathspec of file to read and pass contents from
# * _onFile {Function}_: callback to pass file's contents to 
readFileSync = ( filePath, onFile ) ->
    file = buildPath filePath
    try
        onFile fs.readFileSync file, "utf8"
    catch err
        onError "Error #{err}: reading #{file}."

# ## writeFile ##
# Writes _content_ to file at _filePath_ calling _done_ after writing is complete (Asynchronously)
# ### Args:
# * _filePath {String}_: pathspec of file to write
# * _content {String}_: content to write to the file
# * _done {Function}_: called when all operations are complete
writeFile = ( filePath, content, done ) ->
    file = buildPath filePath
    fs.writeFile file, content, "utf8", ( err ) ->
      if err
          onError "Error #{err}: writing #{file}"
      else
          done file

# ## writeFileSync ##
# Writes _content_ to file at _filePath_ calling _done_ after writing is complete (Synchronously)
# ### Args:
# * _filePath {String}_: pathspec of file to write
# * _content {String}_: content to write to the file
# * _done {Function}_: called when all operations are complete
writeFileSync = ( filePath, content, done ) ->
    file = buildPath filePath
    try
      fs.writeFileSync file, content, "utf8"
      done file
    catch err
      onError "Error #{err}: writing #{file} (sync)"