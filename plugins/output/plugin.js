var path = require( "path" );

var outputFactory = function( _, anvil ) {
	return anvil.plugin( {
		name: "output",
		activity: "push",

		copy: function( file, done ) {
			anvil.scheduler.parallel( [ anvil.config.output ], function( destination, copied ) {
				destination = path.resolve( destination );
				anvil.log.debug( "copying " + file.name + " to " + ( destination + file.relativePath ) );
				anvil.fs.copy( [ file.workingPath, file.name ], [ destination, file.relativePath, file.name ], copied );
			}, done );
		},

		run: function( done ) {
			var toCopy = _.filter( anvil.project.files, function( file ) {
				return !file.noCopy;
			} );
			anvil.scheduler.parallel( toCopy, this.copy, function() {
				_.each( anvil.project.files, function( file ) {
					file.state = "done";
				} );
				done();
			} );
		}
	} );
};

module.exports = outputFactory;