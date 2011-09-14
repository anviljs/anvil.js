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
    ( x ) ->
        ast = jsp.parse x
        ast = pro.ast_mangle ast
        ast = pro.ast_squeeze ast
        pro.gen_code ast
    ,
    ( x ) -> x.replace(".js","." + ext.uglify + ".js")

gzip = createTransformStep "gzip",
    ( x ) ->
        gzipper x
    ,
    ( x ) -> x.replace(".js","." + ext.uglify + ".js")

wrap = createTransformStep "wrap",
    ( x ) ->
        if config.wrap.prefix
            x = config.wrap.prefix + "\r\n" + x
        if config.wrap.suffix
            x = x + "\r\n" + config.wrap.suffix
        x
    ,
    ( x ) -> x