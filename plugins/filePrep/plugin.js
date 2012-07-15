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
			self.copy( file, function() {} );
		} );
	};

	FilePrep.prototype.run = function( done ) {
		anvil.scheduler.parallel( anvil.project.files, this.copy, done );
	};

	FilePrep.prototype.copy = function( file, done ) {
		anvil.log.event( "copying '" + file.originalPath + "' to '" + file.workingPath + "" + file.name + "'" );
		anvil.fs.copy( file.originalPath, [ file.workingPath, file.name ], done );
	};

	return new FilePrep();
};

module.exports = filePrepFactory;