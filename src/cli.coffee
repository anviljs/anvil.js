exports.run = ->
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	compiler = new Compiler fp, log
	ci = undefined
	anvil = {}
	callback = -> console.log "Doesing nussing"
	configuration.configure ( config ) ->
		if config.continuous
			ci = new Continuous fp, config, () ->
				callback()
		postProcessor = new PostProcessor config, fp, scheduler, log 
		anvil = new Anvil config, fp, compiler, Combiner, scheduler, postProcessor, log, () ->
			log.onComplete "build done"
			if ci
				setTimeout( 
					() -> ci.setup(),
					100
				)


		callback = -> anvil.build()
		anvil.build()
		if ci
			ci.setup()

		