# ## createWatch ##
# Set up watchers on project files to trigger rebuild when in continuous mode.
createWatch = () ->
  continuous = false
  # onChange callback is _triggerProcess_
  onChange = triggerProcess
  divedir = (dir) ->
    dive dir, { recursive: false, all: false }, ( err, file ) ->
      unless err
        fs.watch file, { persistent: true }, ( c, p ) ->
          onEvent "Change in #{file} detected. Rebuilding..."
          callback = onChange
          # Change _onChange_ to a noop function to avoid infinite loopage
          onChange = -> #do nothing
          callback()
  divedir dir for dir in [config.source, config.spec, config.ext]

# ## triggerProcess ##
# Unsets watchers and kicks off from the beginning
triggerProcess = () ->
  # Walk down the source dir and unwatch the files
  dive config.source, { recursive: false, all: false }, ( err, file ) ->
    unless err
      fs.unwatchFile file

  # Re-generate Pavlov test page
  createPage()

  # Re-start process
  process()