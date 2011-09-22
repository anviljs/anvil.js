createWatch = () ->
  continuous = false
  onChange = triggerProcess
  divedir = (dir) ->
    dive dir, { recursive: false, all: false }, ( err, file ) ->
      unless err
        fs.watchFile file, { persistent: true }, ( c, p ) ->
          onEvent "Change in #{file} detected. Rebuilding..."
          callback = onChange
          onChange = -> #do nothing
          callback()
  divedir dir for dir in [config.source, config.spec, config.ext]

triggerProcess = () ->
  dive config.source, { recursive: false, all: false }, ( err, file ) ->
    unless err
      fs.unwatchFile file
  createPage()
  process()