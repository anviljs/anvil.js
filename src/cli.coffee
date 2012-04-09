exports.run = ->
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	compiler = new Compiler fp, log
	mochaRunner = undefined
	ci = undefined
	anvil = {}
	socketServer = {}
	fileChange = ->
	configuration.configure ( config ) ->
		
		if config.continuous
			ci = new Continuous fp, config, () ->
				fileChange()

		if config.spec
			mochaRunner = new MochaRunner fp, scheduler, config, () ->
				log.onComplete "tests complete"

		if config.host
			server = new Host fp, scheduler, compiler, config
			socketServer = new SocketServer server.app

		postProcessor = new PostProcessor config, fp, scheduler, log 
		anvil = new Anvil config, fp, compiler, Combiner, scheduler, postProcessor, log, () ->
			log.onComplete "build done"
			if mochaRunner
				setTimeout( 
					() -> mochaRunner.run(),
					200
				)

			if ci
				setTimeout( 
					() -> ci.setup(),
					200
				)

			if socketServer.refreshClients
				setTimeout(
					() -> socketServer.refreshClients(),
					200
				)

		fileChange = -> anvil.build()
		
		anvil.build()
		if ci
			ci.setup()

		