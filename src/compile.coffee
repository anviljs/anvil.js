# Unfancy JavaScript -- 
# See http://coffeescript.org/ for more info
coffeeScript = require "coffee-script"

# LESS Compiler --
# See http://lesscss.org
less = require( "less" )

# STYLUS Compiler --
# See http://learnboost.github.com/stylus/
stylus = require( "stylus" )

# SCSS Compiler --
# See http://learnboost.github.com/stylus/
scss = require( "scss" )

# HAML Compiler --
# See http://haml-lang.com/
haml = require( "haml" )

# Markdown Compiler --
# See http://github.com/chjj/marked
marked = require( "marked" )
marked.setOptions { sanitize: false }

# HAML Compiler --
# See http://haml-lang.com/
coffeeKup = require( "coffeekup" )


_ = require "underscore"

class Compiler

	constructor: (@fp, @log) ->
		_.bindAll( this )

	# ## compile ##
	# Compiles a file with the correct compiler
	# ### Args:
	# * _sourcePath {String}_: directory pathspec where _file_ is located
	# * _file {Object}_: file metadata for the file to compile
	# * _onComplete {Function}_: function to invoke when done
	compile: ( file, onComplete ) ->
		self = this
		switch file.ext()
			when ".coffee" then self.compileCoffee file, onComplete
			when ".less" then self.compileLess file, onComplete
			when ".sass" then self.compileSass file, onComplete
			when ".scss" then self.compileScss file, onComplete
			when ".styl" then self.compileStylus file, onComplete
			when ".haml" then self.compileHaml file, onComplete
			when ".md" then self.compileMarkdown file, onComplete
			when ".markdown" then self.compileMarkdown file, onComplete
			when ".kup" then self.compileCoffeeKup file, onComplete


	# ## compileCoffee ##
	# Compiles CoffeeScript _file_ to a Javascript file
	# ### Args:
	# * _sourcePath {String}_: directory pathspec where _file_ is located
	# * _file {String}_: filename to compile
	compileCoffee: ( file, onComplete ) ->
		newFile = file.name.replace ".coffee", ".js"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( content, onContent ) ->
				try
					js = coffeeScript.compile content, { bare: true }
					onContent js
				catch error
					log.onError "Coffee compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				unless err
					file.name = newFile
					onComplete()
				else
					onComplete err
		)
		

	# ## compileCoffeeKup ##
	# Compiles CoffeeKup _file_ to a HTML file
	# ### Args:
	# * _sourcePath {String}_: directory pathspec where _file_ is located
	# * _file {String}_: filename to compile
	compileCoffeeKup: ( file, onComplete ) ->
		newFile = file.name.replace ".kup", ".html"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( content, onContent ) ->
				try
					html =( coffeeKup.compile content, {} )()
					onContent html
				catch error
					log.onError "CoffeeKup compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				unless err
					file.name = newFile
					onComplete()
				else
					onComplete err
		)

	# ## compileHaml ##
	# Compiles HAML _file_ to a HTML file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileHaml: ( file, onComplete ) ->
		newFile = file.name.replace ".haml", ".html"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( content, onContent ) ->
				try
					html = haml.render content
					onContent html
				catch error
					log.onError "Haml compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

	# ## compileLess ##
	# Compiles LESS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileLess: ( file, onComplete ) ->
		newFile = file.name.replace ".less", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					less.render( x, {}, (e, css) -> onContent(css) )
				catch error
					log.onError "LESS compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

	# ## compileMarkdown ##
	# Compiles Markdown _file_ to a HTML file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileMarkdown: ( file, onComplete ) ->
		newFile = file.name.replace ///[.](markdown|md)$///, ".html"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					onContent( marked.parse( x ) )
				catch error
					log.onError "Markdown compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

	# ## compileSass ##
	# Compiles SASS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileSass: ( file, onComplete ) ->
		newFile = file.name.replace ".sass", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					onContent ""
					#scss.parse( x, (e, css) -> 
					#	onContent( css, e ) 
					#)
				catch error
					log.onError "SASS compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				file.name = newFile
				onComplete()
		)

	# ## compileScss ##
	# Compiles SCSS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileScss: ( file, onComplete ) ->
		newFile = file.name.replace ".scss", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					onContent ""
					#scss.parse( x, (e, css) -> 
					#	onContent( css, e ) 
					#)
				catch error
					log.onError "SCSS compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			( err ) ->
				file.name = newFile
				onComplete()
		)

	# ## compileStylus ##
	# Compiles STYLUS _file_ to a CSS file
	# ### Args:
	# * _file {String}_: filename to compile
	# * _onComplete {Function}_: function to invoke when done
	compileStylus: ( file, onComplete ) ->
		newFile = file.name.replace ".styl", ".css"
		log = @log
		@fp.transform( 
			[ file.workingPath, file.name ],
			( x, onContent ) ->
				try
					stylus.render( x, {}, (e, css) -> onContent( css, e ) )
				catch error
					log.onError "Stylus compiler exception on file: #{ file.name } \r\n\t #{ error }"
					onContent "", error
			, [ file.workingPath, newFile ],
			() ->
				file.name = newFile
				onComplete()
		)

exports.compiler = Compiler
