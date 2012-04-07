exports.run = ->
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	compiler = new Compiler fp, log
	mochaRunner = undefined
	ci = undefined
	anvil = {}
	fileChange = ->
	configuration.configure ( config ) ->
		
		if config.continuous
			ci = new Continuous fp, config, () ->
				fileChange()

		if config.spec
			mochaRunner = new MochaRunner fp, scheduler, config, () ->
				log.onComplete "tests complete"

		postProcessor = new PostProcessor config, fp, scheduler, log 
		anvil = new Anvil config, fp, compiler, Combiner, scheduler, postProcessor, log, () ->
			log.onComplete "build done"
			if mochaRunner
				mochaRunner.run()

			if ci
				setTimeout( 
					() -> ci.setup(),
					100
				)

		fileChange = -> anvil.build()
		
		anvil.build()
		if ci
			ci.setup()

		