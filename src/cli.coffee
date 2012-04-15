# ## run ##
# This is the function that gets exported for the CLI script.
# It gets the configuration and determines how to invoke Anvil
# and supporting behaviors ( CI, Host, Test runner ) based on
# the configuration.
# Most of the 'wierdness' in this file revolves around late binding
# due to most things needing a hook to the completed config before they
# can properly instantiate. If it hurts your eyes, look away :)
exports.run = ->
	scheduler = new Scheduler()
	crawler = new FSCrawler( scheduler )
	fp = new FSProvider( crawler, log )
	configuration = new Configuration fp, scheduler, log
	compiler = new Compiler fp, log
	mochaRunner = undefined
	ci = undefined
	documenter = undefined
	anvil = {}
	socketServer = {}
	fileChange = ->
	configuration.configure process.argv, ( config, stop ) ->
		if stop
			process.exit 0
		
		# if the user wants CI, setup the continuous module
		if config.continuous
			ci = new Continuous fp, config, () ->
				fileChange()

		# if the user wants mocha to run after the build, setup the mocha runner
		if config.mocha
			mochaRunner = new MochaRunner fp, scheduler, config, () ->
				log.onComplete "tests complete"

		# if the user wants hosting then, spin up the Static HTTP host and socket server
		if config.host
			server = new Host fp, scheduler, compiler, config
			socketServer = new SocketServer server.app

		# create the post processor instance
		postProcessor = new PostProcessor config, fp, scheduler, log
		documenter = new Documenter config, fp, scheduler, log
		anvil = new Anvil config, fp, compiler, Combiner, documenter, scheduler, postProcessor, log, () ->
			log.onComplete "build done"
			if mochaRunner
				# wrap the mocha runner invocation in a timeout call
				# to prevent odd timing issues.
				setTimeout( 
					() -> mochaRunner.run(),
					200
				)

			if ci
				# wrap the CI watcher in a timeout call
				# to prevent odd timing issues.
				setTimeout( 
					() -> ci.setup(),
					200
				)

			if socketServer.refreshClients
				# don't notify the clients immediate after the build
				setTimeout(
					() -> socketServer.refreshClients(),
					200
				)

		fileChange = -> anvil.build()
		
		anvil.build()
		# if we're using CI, kick it off the first time
		if ci
			ci.setup()

		