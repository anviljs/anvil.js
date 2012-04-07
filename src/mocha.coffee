mocha = require "mocha"
reporters = mocha.reporters
interfaces = mocha.interfaces
Context = mocha.Context
Runner = mocha.Runner
Suite = mocha.Suite

###
	This class is an adaptation of the code found in _mocha
	from TJ Holowaychuk's Mocha repository:
	https://github.com/visionmedia/mocha/blob/master/bin/_mocha
###
class MochaRunner

	constructor: ( @fp, @scheduler, @config, @onComplete ) ->
		
	run: () ->
		self = this
		if @config.spec
			forAll = @scheduler.parallel
			filesIn = @fp.getFiles

			opts = @config.mocha or=
				growl: true
				ignoreLeaks: true
				reporter: "spec"
				ui: "bdd"
				colors: true

			reporterName = opts.reporter.toLowerCase().replace( ///([a-z])///, ( x ) -> x.toUpperCase() )
			uiName = opts.ui.toLowerCase()

			suite = new Suite '', new Context
			Base = reporters.Base
			Reporter = reporters[reporterName]
			ui = interfaces[uiName]( suite )
			if opts.colors then Base.useColors = true
			if opts.slow then Base.slow = opts.slow
			if opts.timeout then suite.timeout opts.timeout

			specs = if _.isString @config.spec then [ @config.spec ] else @config.spec

			forAll specs, @fp.getFiles, ( lists ) ->
				files = _.flatten lists
				for file in files
					suite.emit 'pre-require', global, file
					suite.emit 'require', require file, file
					suite.emit 'post-require', global, file

				suite.emit 'run'
				runner = new Runner suite
				reporter = new Reporter runner
				if opts.ignoreLeaks then runner.ignoreLeaks = true
				runner.run () -> 
					self.onComplete()
