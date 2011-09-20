createWatch = () ->
  continuous = false
  onChange = triggerProcess
  dive config.source, { recursive: false, all: false }, ( err, file ) ->
    unless err
      fs.watchFile file, { persistent: true }, ( c, p ) ->
        onEvent "Change in #{file} detected. Rebuilding..."
        callback = onChange
        onChange = -> #do nothing
        callback()

triggerProcess = () ->
  dive config.source, { recursive: false, all: false }, ( err, file ) ->
    unless err
      fs.unwatchFile file
  createPage()
  process()