class Combiner

	constructor: ( @fp, @scheduler, @findPatterns, @replacePatterns ) ->

	# ## combineList ##
	# combine all the files in the _list_ and call onComplete when finished
	# ### Args:
	# * _list {Array}_: collection of file metadata
	# * _onComplete {Function}_: callback to invoke on completion
	combineList: ( list, onComplete ) ->
		self = this
		forAll = @scheduler.parallel
		# for all files in the list
		# 	find all the imports for every file
		#	then find all the files that depend on each file
		#	then combine all the files in the list
		forAll list,
			( file, done ) -> findImports file, list, done
			, () -> forAll list,
				( file, done ) -> self.findDependents file, list, done
				, () -> forAll list, self.combineFile, onComplete

	# ## combineFile ##
	# combine a specifc _file_ after ensuring it's dependencies have been combined
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _onComplete {Function}_: callback to invoke on completion
	combineFile: ( file, onComplete ) ->
		# if we've already combined this file, just call complete
		if file.combined
			onComplete file
		# otherwise, combine all the file's dependencies first, then combine the file
		else
			@scheduler.parallel dependencies, combineFile, () ->
				combine file, () ->
					file.combined = true
					onComplete()

	# ## fileImports ##
	# search the _file_ using regex patterns and store all referenced files
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _list {Array}_: collection of file metadata
	# * _onComplete {Function}_: callback to invoke on completion
	findImports: ( file, list, onComplete ) ->
		self = this
		imports = []
		@fp.read [ file.workingPath, file.name ], ( content ) ->
			# find the import statements in the file contents using @findPatterns
			for pattern in self.findPatterns
				imports = imports.concat content.match pattern
			# strip out all the raw file names from the import statements
			# find the matching file metadata for the import
			for import in import
				importName = ( import.match ///['\"].*['\"]/// )[0].replace(///['\"]///g, "")
				file.imports.push _.find( list, ( i ) -> i.name == importName )
			onComplete file

	# ## fileDependents ##
	# search the _list_ to see if any files import _file_
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _list {Array}_: collection of file metadata
	# * _onComplete {Function}_: callback to invoke on completion
	findDependents: ( file, list, onComplete ) ->
		imported = ( import ) -> file.name == import
		for item in list
			if _.any item.imports, imported then file.dependents ++

	# ## combine ##
	# combine all the _file_'s imports into its contents
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _onComplete {Function}_: callback to invoke on completion
	combine: ( file, onComplete ) ->
		pipe = @scheduler.pipeline
		fp = @fp
		fp.read [ file.workingPath, file.name ], ( main ) ->
			steps = for import in file.imports
				( text, onDone ) -> replace text, import, onDone
			pipe main, steps, ( result ) ->
				fp.write [ file.workingPath, file.name ], result, () -> onComplete()

	# ## replace ##
	# create a replacement regex that will take the _import_ content and replace the
	# matched patterns within the main file's _content_
	# ### Args:
	# * _content {Object}_: the content of the main file
	# * _import {Object}_: file metadata for the import
	# * _onComplete {Function}_: callback to invoke on completion
	replace: ( content, import, onComplete ) ->
		patterns = @replacePatterns
		source = import.name
		working = import.workingPath
		@fp.read [ working, source ], ( newContent ) ->
			for pattern in patterns
				fullPattern = pattern.replace ///replace///, source
				content = content.replace fullPattern, newContent
			onComplete content

exports.combiner = Combiner