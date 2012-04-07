class Continuous

	constructor: ( @fp, @config, @onChange ) ->
		@style = @config.style
		@source = @config.source
		@markup = @config.markup
		@watchers = []
		@watching = false
		_.bindAll( this )
		this

	setup: () ->
		if not @watching
			if @style
				@fp.getFiles @style, @watchFiles

			if @source
				@fp.getFiles @source, @watchFiles

			if @markup
				@fp.getFiles @markup, @watchFiles
					
		@watching = true

	watchFiles: ( files ) ->
		for file in files
			@watchers.push fs.watch file, @onEvent

	onEvent: ( event, file ) ->
		console.log " File System Event: #{ event } on #{ file }"

		@watching = false
		while @watchers.length > 0
			@watchers.pop().close()
		@onChange()
