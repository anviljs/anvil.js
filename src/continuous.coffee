createWatch = () ->
  continuous = false
  onChange = triggerProcess
  diver = (dir) ->
    dive dir, { recursive: false, all: false }, ( err, file ) ->
      unless err
        fs.watchFile file, { persistent: true }, ( c, p ) ->
          onEvent "Change in #{file} detected. Rebuilding..."
          callback = onChange
          onChange = -> #do nothing
          callback()
  diver dir for dir in ['source', 'spec', 'ext']

triggerProcess = () ->
  dive config.source, { recursive: false, all: false }, ( err, file ) ->
    unless err
      fs.unwatchFile file
  createPage()
  process()
  console.log "process was triggered " + new Date()