createWatch = () ->
    continuous = false
    watcher.watchTree config.source,
        [
            "ignoreDotFiles"
        ],
        (f, c, p ) ->
            if p == null and c == null
                onEvent "Watching source directory for changes..."
            else if f.match(///tmp///)
                onEvent "Ignoring changes to tmp files"
            else if inProcess
                onEvent "Ignoring changes during processing"
            else
                onEvent "Change in source, #{f}, detected. Rebuilding..."
                process()
    ci = new emitter()
    ci.once("quit", -> "Alas, I have been killt!")
    