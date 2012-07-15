var path = require( "path" );

var outputFactory = function( _, anvil ) {

	var Output = function() {
		_.bindAll( this );
		this.activity = "push";
		this.name = "";
		this.commander = [];
		this.config = {};
		this.dependencies = [];
	};

	Output.prototype.copy = function( file, done ) {
		anvil.scheduler.parallel( anvil.config.output, function( destination, copied ) {
			destination = path.resolve( destination );
			anvil.log.debug( "copying " + file.name + " to " + ( destination + file.relativePath ) );
			anvil.fs.copy( [ file.workingPath, file.name ], [ destination, file.relativePath, file.name ], copied );
		}, done );
	};

	Output.prototype.run = function( done ) {
		var toCopy = _.filter( anvil.project.files, function( file ) {
			return file.dependents === 0;
		} );
		anvil.scheduler.parallel( toCopy, this.copy, done );
	};

	return new Output();
};

module.exports = outputFactory;