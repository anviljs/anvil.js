class Anvil

	constructor: ( @config, @fp, @compiler, @combiner, @scheduler, @log ) ->
		config = @config
		@filesBuilt = {}
		# mini FSM - basically we don't want to start building markup until
		# everything else is done since markup can import other built resources
		@steps = 
			source: false
			style: false
			markup: false
			hasSource: config.source
			hasStyle: config.style
			hasMarkup: config.markup
			markupReady: () -> ( source or not hasSource ) and ( style or not hasStyle )
			allDone: () -> 
				( source or not hasSource ) and ( style or not hasStyle ) and ( markup or not hasMarkup )


	build: () ->
		@buildSource()
		@buildStyle()


	buildMarkup: () ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		findPatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"].*['\"].?[)]?.?[-]{2}[\>]///g ]
		replacePatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"]replace['\"].?[)]?.?[-]{2}[\>]///g ]
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )

		@prepFiles "markup", ( list ) ->
			scheduler.parallel list, compiler.compile, () ->
				combiner.combine list, () ->
					self.stepComplete "markup"
			

	buildSource: () ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		findPatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?///g ]
		replacePatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?///g ]
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )

		@prepFiles "source", ( list ) ->
			scheduler.parallel list, compiler.compile, () ->
				combiner.combine list, () ->
					self.stepComplete "source"


	buildStyle: () ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		findPatterns = [ ///@import[(]?.?[\"'].*[.]css[\"'].?[)]?///g ]
		replacePatterns = [ ///@import[(]?.?[\"']replace[\"'].?[)]?///g ]
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )

		@prepFiles "style", ( list ) ->
			scheduler.parallel list, compiler.compile, () ->
				combiner.combine list, () ->
					self.stepComplete "style"


	fileBuilt: ( file ) ->
		@filesBuilt[ file.fullPath ] = file


	prepFiles: ( type, onComplete ) ->
		working = @config.working
		path = @config[ type ]
		output = @config.output[ type ]
		log = @log
		log.onEvent "prepfiles"
		@fp.getFiles path, ( files ) ->
			log.onEvent "Scanning #{ files.length } #{ type } files ..."
			list = for file in files
						name = path.basename file
						{
							dependents: 0
							ext: () -> path.extname this.name
							fullPath: file
							imports: []
							name: name
							originalName: name
							outputPaths: output
							relativePath: file.replace path, ""
							workingPath: working
						}
			onComplete list


	report: () ->
		# tests
		# re-start watchers
		onComplete "Hey, it's done, bro-ham"


	stepComplete: ( step ) ->
		@steps[ step ] = true
		if @steps.markupReady()
			@buildMarkup()
		if @steps.allDone()
			@report()