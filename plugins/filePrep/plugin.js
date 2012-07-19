var filePrepFactory = function( _, anvil ) {

	var FilePrep = function() {
		var self = this;
		_.bindAll( this );
		this.name = "filePrep";
		this.activity = "pull";
		this.commander = [];
		this.dependencies = [];
		this.config = {};

		anvil.events.on( "file.changed", function( change, path ) {
			var file = _.find( anvil.project.files, function( file ) {
				return file.originalPath == path;
			} );
			file.state = "inProcess";
			self.copy( file, function() {} );
			anvil.events.raise( "rebuild", "combine" );
		} );
	};

	FilePrep.prototype.run = function( done ) {
		anvil.scheduler.parallel( anvil.project.files, this.copy, done );
	};

	FilePrep.prototype.copy = function( file, done ) {
		var path = anvil.fs.buildPath( [ file.relativePath, file.name ] );
		anvil.log.event( "prepping '" + path + "'" );
		anvil.fs.copy( file.originalPath, [ file.workingPath, file.name ], done );
	};

	return new FilePrep();
};

module.exports = filePrepFactory;