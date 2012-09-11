var path = require( "path" );

var outputFactory = function( _, anvil ) {
	return anvil.plugin( {
		name: "output",
		activity: "push",

		clean: function( done ) {
			anvil.fs.cleanDirectory( anvil.config.output, function( err ) {
				if( err ) {
					anvil.log.error( err );
				}
				done();
			} );
		},

		configure: function( config, command, done ) {
			var self = this;
			anvil.events.on( "file.deleted", function( change, path, base ) {
				if( base === anvil.config.source ) {
					self['delete']( path );
				}
			} );
			done();
		},

		copy: function( file, done ) {
			anvil.scheduler.parallel( [ anvil.config.output ], function( destination, copied ) {
				destination = path.resolve( destination );
				anvil.log.debug( "copying " + file.name + " to " + ( destination + file.relativePath ) );
				anvil.fs.copy( [ file.workingPath, file.name ], [ destination, file.relativePath, file.name ], copied );
			}, done );
		},

		"delete": function( filePath ) {
			var file = _.find( anvil.project.files, function( file ) {
							return file.originalPath == filePath;
						} );
			if( file ) {
				anvil.scheduler.parallel( [ anvil.config.output ], function( destination, done ) {
					try {
						destination = path.resolve( destination );
						var removeFrom = anvil.fs.buildPath( [ destination, file.relativePath, file.name ] );
						anvil.log.debug( "Deleting output at " + removeFrom );
						anvil.fs["delete"]( removeFrom, done );
					} catch( err ) {
						console.log( err );
					}
				}, function() {} );
			}
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