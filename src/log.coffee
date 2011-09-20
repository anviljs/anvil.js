onEvent = (x) ->
    unless quiet
        console.log "   #{x}"

onStep = (x) ->
    unless quiet
        console.log "#{x}".blue

onComplete = (x) ->
    console.log "#{x}".green

onError = (x) ->
    console.log "!!! Error: #{x} !!!".red