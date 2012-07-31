var filePrepFactory = function( _, anvil ) {
	return anvil.plugin( {
		name: "filePrep",
		activity: "pull",

		configure: function( config, command, done ) {
			var self = this;
			anvil.events.on( "file.changed", function( change, path, base ) {
				var isSource = ( base === anvil.config.source );
				if( isSource ) {
					self.handleSourceChange( path, base );
				} else {
					self.handleSpecChange( path, base );
				}
			} );
			done();
		},

		copy: function( file, done ) {
			var path = anvil.fs.buildPath( [ file.relativePath, file.name ] );
			anvil.log.event( "prepping '" + path + "'" );
			anvil.fs.copy( file.originalPath, [ file.workingPath, file.name ], done );
		},

		handleSourceChange: function( path, base ) {
			var file = _.find( anvil.project.files, function( file ) {
							return file.originalPath == path;
						} );

			if( !file ) {
				file = anvil.fs.buildFileData( base, anvil.config.working, path );
				anvil.project.files.push( file );
			}
			file.state = "inProcess";
			this.copy( file, function() {
				anvil.events.raise( "rebuild", "combine" );
			} );
		},

		handleSpecChange: function( path, base ) {
			var file = _.find( anvil.project.specs, function( file ) {
							return file.originalPath == path;
						} );

			if( !file ) {
				metadata = anvil.fs.buildFileData( base, anvil.config.working, path );
				anvil.project.specs.push( metadata );
			}
			anvil.events.raise( "rebuild", "test" );
		},

		run: function( done ) {
			anvil.scheduler.parallel( anvil.project.files, this.copy, done );
		}
	} );
};

module.exports = filePrepFactory;