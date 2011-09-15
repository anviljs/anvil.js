onEvent = (x) ->
    console.log "   #{x}"

onStep = (x) ->
    console.log "#{x}".blue

onComplete = (x) ->
    console.log "#{x}".green

onError = (x) ->
    console.log "!!! Error: #{x} !!!".red