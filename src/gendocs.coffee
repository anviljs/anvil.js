doc_generators = 
	ape: require 'ape'
	docco: require 'docco'

## gendocs ##
# Sets up doc output path and ensures default config options are set (if not 
# present in build.json) then iterates files and generates docs
# Called by _pack_ function in main.cofee
# gendocs key in build.json options:
# ```coffeescript
# gendocs: {
#     generator: 'docco', // (or 'ape'; defaults to 'ape'),
#     source: 'dirname',  // (if in project root else relative path; defaults to 'src')
#     output: 'dirname'   // (if in project root else relative path; defaults to 'docs')
# }
# ```
gendocs = ->
	unless config.gendocs?
		false
	else
		# A little bit of housekeeping
		conf = config.gendocs
		conf.generator ?= 'ape'
		conf.output ?= 'docs'
		conf.sourcePaths = if _.isArray(conf.sources) then conf.sources else [conf.sources or 'src']
		# Make sure that we have a docs output path on the filesystem
		ensurePath conf.output, (exists) -> 
			# Crawl source paths for files to generate docs for
			conf.sourcePaths.forEach (dirname) ->
				forFilesIn dirname, generate_docs_for_file, -> 
					if conf.generator is 'docco'
						style_path = path.join(conf.output, 'stylesheets')
						ensurePath style_path, (exists) ->
							fs.readFile path.join(config.ext, 'docco.css'), (err, stylesheet) ->
								fs.writeFile path.join(style_path, 'docco.css'), stylesheet, ->
									onComplete 'finè'


# ## generate_docs_for_file ##
# Checks for existence of _file_ in _dir_ and calls _generate\_docs\_from\_string_
# on it if it does.
# ### Args:
# * _dir {String}_: directory name
# * _file {String}_: file name
# * _done {Function}_: callback to call when finished
generate_docs_for_file = (dir, file, done) ->
	file_path = path.join(dir, file)
	conf = config.gendocs
	path.exists(file_path, (exists) -> 
		if exists
			fs.readFile(file_path, (err, file_contents) -> 
				onStep 'Generating docs for ' + file_path
				generate_docs_from_string file_contents.toString(), file, done
			)
		else
			onError file_path, 'does not exist!'
	)

# ## get_doc_generator_method ##
# Get a reference to the correct documentation generator function given the library name
# ### Args:
# * _name {String}_: the name of the doc generator library (ape|docco)
get_doc_generator_method = (name) ->
	if name is 'ape' then doc_generators.ape.generate_doc else doc_generators.docco.generate_doc_from_string

# ## generate_docs_from_string ##
# 
# ### Args:
# * _code {String}_: the contents of the file
# * _file {String}_: the file's name
# * _done {Function}_: callback to call when finished
generate_docs_from_string = (code, file, done) ->
	conf = config.gendocs
	doc_generator = get_doc_generator_method(conf.generator)
	lang = doc_generators.ape.get_language file

	# ## write_doc_file ##
	# Writes the generated documentation HTML to a file and calls the _done_ callback
	# ### Args:
	# * _err {Multiple}_: may be a string or Error object indicating an error
	# * _docs {String}_: generated HTML documentation page
	write_doc_file = (err, docs) ->
		if conf.generator is 'docco'
			docs = err
		outfile = path.join(conf.output, file.replace(/\.(js|coffee)$/, '.html'))
		fs.writeFile outfile, docs, (err) -> 
			if err 
				onError err
			done()

	if conf.generator is 'ape'
		doc_generator code, lang, 'html', null, write_doc_file

	if conf.generator is 'docco'
		if lang and lang.name? 
			lang = if lang.name == 'coffeescript' then '.coffee' else '.js'
		doc_generator filename, code, lang, write_doc_file