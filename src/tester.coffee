class TestRunner

	constructor: ( @fp, @scheduler, @config, @onComplete ) ->
		@runners.mocha = new MochaRunner @fp, @scheduler, @config, @onComplete
		@runners.qunit = new QUnitRunner @fp, @scheduler, @config, @onComplete

	run: () ->
		if @config.mocha
			@runners.mocha.run()
		else @config.qunit
			@runners.qunit.run()
