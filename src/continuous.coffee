class Continuous

	constructor: ( @fp, @config, @onChange ) ->
		@style = @normalize @config.style
		@source = @normalize @config.source
		@markup = @normalize @config.markup
		@spec = @normalize @config.spec
		@watchers = []
		@watching = false
		_.bindAll( this )
		this

	normalize: ( x ) -> if _.isArray x then x else [ x ]

	setup: () ->
		if not @watching
			if @style then @watchPath p for p in @style
			if @source then @watchPath p for p in @source
			if @markup then @watchPath p for p in @markup
			if @spec then @watchPath p for p in @spec

		@watching = true

	watchPath: ( path ) ->
		@fp.getFiles path, @watchFiles

	watchFiles: ( files ) ->
		for file in files
			@watchers.push fs.watch file, @onEvent

	onEvent: ( event, file ) ->
		console.log " File System Event: #{ event } on #{ file }"

		@watching = false
		while @watchers.length > 0
			@watchers.pop().close()
		@onChange()
