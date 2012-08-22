var path = require( "path" );

var harnessFactory = function( _, anvil ) {

	var Harness = function() {
		_.bindAll( this );
		this.command = [];
		this.build = {};
		this.files = {};
		this.root = path.resolve( "./" );
	};

	return new Harness();

};

module.exports = harnessFactory;