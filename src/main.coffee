class Anvil

	constructor: ( @config, @fp, @compiler, @combiner, @scheduler, @postProcessor, @log ) ->
		config = @config
		@filesBuilt = {}
		# mini FSM - basically we don't want to start building markup until
		# everything else is done since markup can import other built resources
		@postProcesses
		@steps = 
			source: false
			style: false
			markup: false
			hasSource: config.source
			hasStyle: config.style
			hasMarkup: config.markup
			markupReady: () -> ( this.source or not this.hasSource ) and ( this.style or not this.hasStyle )
			allDone: () -> 
				( this.source or not this.hasSource ) and ( this.style or not this.hasStyle ) and ( this.markup or not this.hasMarkup )


	build: () ->
		@buildSource()
		@buildStyle()


	buildMarkup: () ->
		findPatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"].*['\"].?[)]?.?[-]{2}[\>]///g ]
		replacePatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"]replace['\"].?[)]?.?[-]{2}[\>]///g ]
		@processType( "markup", findPatterns, replacePatterns )
			

	buildSource: () ->
		findPatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?.?([/]{2}|[\#]{3})?///g ]
		replacePatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?.?([/]{2}|[\#]{3})?///g ]
		@processType( "source", findPatterns, replacePatterns )


	buildStyle: () ->
		findPatterns = [ ///@import[(]?.?[\"'].*[.]css[\"'].?[)]?///g ]
		replacePatterns = [ ///@import[(]?.?[\"']replace[\"'].?[)]?///g ]
		@processType( "style", findPatterns, replacePatterns )


	processType: ( type, findPatterns, replacePatterns ) ->
		self = this
		scheduler = @scheduler
		compiler = @compiler
		combiner = new @combiner( @fp, scheduler, findPatterns, replacePatterns )
		postProcessor = @postProcessor

		self.prepFiles type, ( list ) ->
			self.moveFiles list, () ->
				combiner.combineList list, () ->
					scheduler.parallel list, compiler.compile, () ->
						postProcessor.process list, ( list ) ->
							self.finalOutput list, () ->
								self.stepComplete type


	fileBuilt: ( file ) ->
		@filesBuilt[ file.fullPath ] = file


	finalOutput: ( files, onComplete ) ->
		fp = @fp
		forAll = @scheduler.parallel
		move = ( file, done ) ->
			forAll( file.outputPaths, ( destination, moved ) ->
				fp.move [ file.workingPath, file.name ], [ destination, file.name ], moved
			, done )
		final = _.filter( files, ( x ) -> x.dependents == 0 )
		forAll final, move, onComplete


	moveFiles: ( files, onComplete ) ->
		fp = @fp
		move = ( file, done ) -> 
			fp.move file.fullPath, [ file.workingPath, file.name ], done
		@scheduler.parallel files, move, onComplete


	prepFiles: ( type, onComplete ) ->
		working = @config.working
		typePath = @config[ type ]
		output = @config.output[ type ]
		output = if _.isArray( output ) then output else [ output ]
		log = @log
		@fp.getFiles typePath, ( files ) ->
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
							relativePath: file.replace typePath, ""
							workingPath: working
						}
			onComplete list


	report: () ->
		# tests
		# re-start watchers

		@log.onComplete "Hey, it's done, bro-ham"


	stepComplete: ( step ) ->
		@steps[ step ] = true
		if @steps.markupReady()
			@buildMarkup()
		if @steps.allDone()
			@report()