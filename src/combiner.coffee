_ = require "underscore"
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
		findImports = _.bind( ( file, done ) ->
				self.findImports file, list, done
			, this )

		findDependents = _.bind( ( file, done ) ->
				self.findDependents file, list, done
			, this )

		combineFile = _.bind( ( file, done ) ->
			self.combineFile file, done
			, this )

		forAll list, findImports, () ->
			for f1 in list
				findDependents f1, list
			forAll list, combineFile, onComplete

	# ## combineFile ##
	# combine a specifc _file_ after ensuring it's dependencies have been combined
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _onComplete {Function}_: callback to invoke on completion
	combineFile: ( file, onComplete ) ->
		self = this
		forAll = @scheduler.parallel
		# if we've already combined this file, just call complete
		if file.combined
			onComplete()
		# otherwise, combine all the file's dependencies first, then combine the file
		else
			combineFile = ( file, done ) ->
				self.combineFile file, done

			dependencies = file.imports
			if dependencies and dependencies.length > 0
				forAll dependencies, combineFile, () ->
					self.combine file, () ->
						file.combined = true
						onComplete()
			else
				self.combine file, () ->
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
			imports = _.filter imports, ( x ) -> x
			# strip out all the raw file names from the import statements
			# find the matching file metadata for the import
			for imported in imports
				importName = ( imported.match ///['\"].*['\"]/// )[ 0 ].replace(///['\"]///g, "" )
				importedFile = _.find( list, ( i ) -> i.name == importName )
				file.imports.push importedFile
			onComplete()

	# ## fileDependents ##
	# search the _list_ to see if any files import _file_
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _list {Array}_: collection of file metadata
	# * _onComplete {Function}_: callback to invoke on completion
	findDependents: ( file, list ) ->
		imported = ( importFile ) ->
			file.name == importFile.name
		for item in list
			if _.any item.imports, imported then file.dependents++

	# ## combine ##
	# combine all the _file_'s imports into its contents
	# ### Args:
	# * _file {Object}_: the file metadata describing the file to combine
	# * _onComplete {Function}_: callback to invoke on completion
	combine: ( file, onComplete ) ->
		self = this
		unless file.combined
			pipe = @scheduler.pipeline
			fp = @fp
			if file.imports.length > 0
				fp.read [ file.workingPath, file.name ], ( main ) ->
					steps = for imported in file.imports
						( text, onDone ) -> self.replace text, imported, onDone
					pipe main, steps, ( result ) ->
						fp.write [ file.workingPath, file.name ], result, () -> onComplete()
			else
				onComplete()
		else
			onComplete()

	# ## replace ##
	# create a replacement regex that will take the _imported_ content and replace the
	# matched patterns within the main file's _content_
	# ### Args:
	# * _content {Object}_: the content of the main file
	# * _imported {Object}_: file metadata for the imported
	# * _onComplete {Function}_: callback to invoke on completion
	replace: ( content, imported, onComplete ) ->
		patterns = @replacePatterns
		source = imported.name
		working = imported.workingPath
		@fp.read [ working, source ], ( newContent ) ->
			for pattern in patterns
				stringified = pattern.toString().replace ///replace///, source
				stringified = stringified.substring( 1, stringified.length - 2 )
				console.log " replace pattern: #{ stringified }"
				fullPattern = new RegExp stringified, "g"
				content = content.replace fullPattern, newContent
			onComplete content

exports.combiner = Combiner