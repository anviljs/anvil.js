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
        console.log "   line #{x.line}, pos #{x.character} - #{x.reason}".red for x in errors
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

finalize = createTransformStep "finalize",
    ( x, done ) ->
      if config.finalize.header
        console.log "Adding header #{config.finalize.header}"
        x = config.finalize.header + "\r\n" + x
      if config.finalize.footer
        x = x + config.finalize.footer + "\r\n"
      done x
    ,
    ( x ) -> x