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
                  if test
                    createPage()
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
