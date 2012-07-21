var filePrepFactory = function( _, anvil ) {
	return anvil.plugin( {
		name: "filePrep",
		activity: "pull",

		configure: function( config, command, done ) {
			var self = this;
			anvil.events.on( "file.changed", function( change, path ) {
				var file = _.find( anvil.project.files, function( file ) {
					return file.originalPath == path;
				} );
				file.state = "inProcess";
				self.copy( file, function() {} );
				anvil.events.raise( "rebuild", "combine" );
			} );
			done();
		},

		copy: function( file, done ) {
			var path = anvil.fs.buildPath( [ file.relativePath, file.name ] );
			anvil.log.event( "prepping '" + path + "'" );
			anvil.fs.copy( file.originalPath, [ file.workingPath, file.name ], done );
		},

		run: function( done ) {
			anvil.scheduler.parallel( anvil.project.files, this.copy, done );
		}
	} );
};

module.exports = filePrepFactory;