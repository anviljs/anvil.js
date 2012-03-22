_ = require "underscore"

class ArgParserMock

	constructor: ( @options ) ->

	addValueOptions: ( list ) ->
		@optionsAdded = list

	parse: ->

	getOptions: () ->
		self = this
		list = Array.prototype.slice.call arguments
		values = ( self.options[ key ] for key in list )
		_.find values, ( x ) -> x

exports.parser = ArgParserMock