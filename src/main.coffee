# ## run ##
# The public api called by bin/anvil
exports.run = ->
    configure()


# ## process ##
# Checks to see if process is already running and squawks if it is.
# If not:
# Makes sure paths are setup, then calls _crawlFiles_
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

# ## crawlFiles ##
# Runs _parseSource_ on all files in the dir defined by _config.source_
# then runs _createTransforms_ on each of the file metadata objects that it created and 
# finally runs _transform_ on the resulting list of files
crawlFiles = () ->
  # Iterate the files, running _parseSource_ on each and appending the result
  # to _combineList_.
  forFilesIn config.source, parseSource, (combineList) ->
      onEvent "#{combineList.length} files parsed."
      transformer = ( item, done ) -> createTransforms item, combineList, done
      # Iterate the list of file descriptor objects from
      forAll combineList, transformer, transform
  inProcess = false


# ## transform ##
# Iterates full list of file metadata objects, after their include transforms
# have been created, importing the includes (_combine_) and passing the resulting
# list to _pack_
# ### Args:
# * _withTransforms {Array}_: list of files that have had their include 
#   functions generated and added
transform = ( withTransforms)->
  analyzed = rebuildList withTransforms
  combiner = ( file, done ) -> combine( file, analyzed, done )
  forAll analyzed, combiner, pack


# ## pack ##
# Runs _wrap_, _lint_, _uglify_ (minification), _gzip_ and _finalize_ steps on
# the list of combined files (after removing include files) then regenerates
# test page and continuous integration watches (if relevant).
# ### Args:
# * _combined {Array}_: list of combined (includes included) files
pack = ( combined)->
  # Remove all includes from the list 
  buildList = removeIntermediates combined
  # Apply wrapper to final output files, if supposed to
  forAll _.pluck( buildList, "file" ), wrap, (wrapped) ->
      # Do any file renaming that should be done
      forAll wrapped, renameFile, (renamed) ->
        # Lint all files
        forAll renamed, lint, (passed) ->
            # Uglify all files, if configured to
            forAll passed, uglify, (uggered) ->
                # Gzip all files, if configured to
                forAll uggered, gzip, (gzipped) ->
                    # Apply finalize wrapper to all gzipped and uglified files
                    forAll gzipped, finalize, (finalized) ->
                      onComplete "Output: " + finalized.toString()
                      inProcess = false
                      # If configured to test, regenerate test page.
                      if test
                        createPage()
                      # If configured for CI, setup file watches
                      if continuous
                        createWatch()

# ## compileCoffee ##
# Compiles CoffeeScript _file_ to a Javascript file
# ### Args:
# * _sourcePath {String}_: directory pathspec where _file_ is located
# * _file {String}_: filename to compile
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


# ## parseSource ##
# Creates a metadata object for CoffeeScript/JavaScript _file_
# ### Args:
# * _sourcePath {String}_: directory pathspec where _file_ is located
# * _file {String}_: filename to parse
# * _parsed {Function}_: what to do with _file_'s metadata
parseSource = ( sourcePath, file, parsed ) ->
    filePath = path.join sourcePath, file
    onEvent "Parsing #{filePath}"
    if (file.substr file.length - 6) == "coffee" and not config.justCoffee
        # This is a CoffeeScript file and we are supposed to end up with Javascript
        try
          # Compile to Javascript then re-run _parseSource_ on the Javascript file
          file = compileCoffee sourcePath, file
          parseSource config.tmp, file, parsed
        catch ex
          inProcess = false
    else
        readFile filePath, ( content ) ->
            # Detect if this file has any anvil import statements
            imports = content.match importRegex
            count = imports?.length
            if imports
                # The file does have import statements. Let's collect them!
                files = ( (target.match ///[\"].*[\"]///)[0] for target in imports )
                files = ( x.replace(///[\"]///g,'') for x in files )
                unless config.justCoffee
                    files = ( x.replace(".coffee", ".js") for x in files )
                onEvent "   - #{x}" for x in files
                # Call parsed callback with the parsed output including includes (imports)
                parsed { fullPath: filePath, file: file, path: sourcePath, includes: files, combined: false }
            else
                # Call parsed callback with the parsed output 
                parsed { fullPath: filePath, file: file, path: sourcePath, includes: [], combined: false }


# ## createTransforms ##
# Builds transform functions for all of a file's includes using _buildTransforms_.
# ### Args:
# * _item {Object}_: file metadata object (result of _parseSource_)
# * _list {Array}_: full list of file metadata objects created by _parseSource_
# * _done {Function}_: next step in the process. Consumes 
createTransforms = ( item, list, done ) ->
    if item.includes.length == 0
        done item
    forAll item.includes,
            (include, onTx) -> buildTransforms( include, item, list, onTx ),
            (transforms) ->
                item.transforms = transforms
                done item


# ## buildTransforms ##
# Checks to see that a given _include_ (###|// import...) has a matching file in the file list
# then creates import transform function for it.
# ### Args:
# * _include {String}_: name of file to include
# * _item {Object}_: file metadata object (result of _parseSource_)
# * _list {Array}_: full list of file metadata objects created by _parseSource_
# * _done {Function}_: pass result to next step in the process. 
buildTransforms = ( include, item, list, done ) ->
    includePattern = include.replace(".coffee","").replace(".js","") + "[.](js|coffee)"
    pattern = new RegExp("([/].|[#]{1,3})import[( ][\"]" + includePattern + "[\"][ )]?[;]?([*/]{2})?[#]{0,3}","g")
    includedItem = _.detect list, ( file_meta ) -> file_meta.file == include
    outputPath = config.source
    if includedItem
        outputPath = config.output
    # Get the full pathspec for _include_
    filePath = path.join outputPath, include
    onStep "Building transform for #{filePath}"
    # Adds the import transform function to _item_'s include list
    done (file_contents) ->
        # Retrieve _include_'s contents
        content = fs.readFileSync filePath, "utf8"
        # Insert _content_ in place of the import statement.
        file_contents.replace pattern, content


# ## rebuildList ##
# Clean up the the list of file metadata, eliminating empty members.
# ### Args:
# * _list {Array}_: full list of file metadata objects created by _parseSource_
rebuildList = ( list) ->
    # Iterate _list_ detecting any uses of a file by other files as an include
    list = ( findUses file, list for file in list )
    # Return only entries that are not undefined.
    _.select list, ( x ) -> x isnt undefined


# ## findUses ##
# Finds uses of a given file (_item_) as an include by the other files in _list_.
# ### Args:
# * _item {Object}_: file metadata object (result of _parseSource_)
# * _list {Array}_: full list of file metadata objects created by _parseSource_
findUses = ( item, list ) ->
    unless item
        undefined
    else
        # Compile a list of files in _list_ that include _item_.
        uses = _.select list, ( file ) -> 
            # Return true if any of _file_'s includes is _item_.
            _.any file.includes, ( include ) -> 
                item.file == include
        count = uses?.length
        item.used = count or= 0
        item


# ## combine ##
# Combine all files with their includes.
# ### Args:
# * _item {Object}_: file metadata object (result of _parseSource_)
# * _list {Array}_: full list of file metadata objects created by _parseSource_
# * _done {Function}_: pass result to next step in the process.
combine = ( item, list, done ) ->
    # If _item_ has already been combined, return early
    if item.combined
        return item.combined
    onStep "Combining #{item.fullPath} and its includes"
    # Ensure that all of _item_'s includes have all of their includes imported
    precombineIncludes item.includes, list, done

    output = path.join config.output, item.file

    # 
    transformFileSync(
        item.fullPath,
        ( file_contents ) ->
            if item.transforms
                file_contents = transform( file_contents ) for transform in item.transforms
            file_contents
        ,
        output,
        ( x ) ->
            item.file = output
            item.combined = true
            done item
    )

# ## precombineIncludes ##
# Ensure that all includes have imported their includes before they are 
# imported themselves.
# ### Args:
# * _includes_ {Array}: list of includes from a file metadata object
# * _list {Array}_: full list of file metadata objects created by _parseSource_
# * _done {Function}_: pass result to next step in the process. 
precombineIncludes = ( includes, list, done ) ->
    # Return list of_includes_ that have not yet imported their own includes
    items = _.select list, ( file_meta ) -> 
        # Return true if any include has not been combined
        _.any includes, ( include ) -> 
            # Return true if _include_ has not been combined (imported includes)
            include == file_meta.file and not file_meta.combined
    # Combine all the includes with their imports
    combine file, list, done for file in items
