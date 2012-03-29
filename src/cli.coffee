exports.run = ->
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	compiler = new Compiler fp, log
	postProcessor = new PostProcessor config, fp, scheduler, log 
	configuration.configure ( config ) ->
		anvil = new Anvil config, fp, compiler, Combiner, scheduler, postProcessor, log
		anvil.build()