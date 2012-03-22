

exports.run = ->
	fp = new FSProvider()
	parser = new ArgParser()
	configuration = new Configuration fp, parser, scheduler, log
	configuration.configure ( config ) ->
		anvil = new Anvil config
		