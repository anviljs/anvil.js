# ( @config, @fp, @compiler, @combiner, @scheduler, @log )

exports.run = ->
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	compiler = new Compiler fp, log 
	configuration.configure ( config ) ->
		anvil = new Anvil config, fp, compiler, Combiner, scheduler, log
		anvil.build()