var path = require( "path" );

var outputFactory = function( _, anvil ) {
	return anvil.plugin( {
		name: "output",
		activity: "push",

		clean: function( done ) {
			anvil.fs["delete"]( anvil.config.output, function( error ) {
				if( !error ) {
					anvil.fs.ensurePath( anvil.config.output, done );
				} else {
					console.log( error );
					done();
				}
			} );
		},

		copy: function( file, done ) {
			anvil.scheduler.parallel( [ anvil.config.output ], function( destination, copied ) {
				destination = path.resolve( destination );
				anvil.log.debug( "copying " + file.name + " to " + ( destination + file.relativePath ) );
				anvil.fs.copy( [ file.workingPath, file.name ], [ destination, file.relativePath, file.name ], copied );
			}, done );
		},

		run: function( done ) {
			var self = this,
				toCopy = _.filter( anvil.project.files, function( file ) {
				return !file.noCopy;
			} );
			this.clean( function() {
				anvil.scheduler.parallel( toCopy, self.copy, function() {
					_.each( anvil.project.files, function( file ) {
						file.state = "done";
					} );
					done();
				} );
			} );
		}
	} );
};

module.exports = outputFactory;