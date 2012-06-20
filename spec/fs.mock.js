var fsFactory = function( _, path ) {

	var FileMock = function( fullPath ) {
		this.delay = 0;
		this.available = true;
	};

	FileMock.prototype["delete"] = function( onComplete ) {
		if( this.available ) {
			this.content = "";
			onComplete();
		}
	};

	FileMock.prototype.read = function( onContent ) {
		var self = this;
		if( this.available ) {
			this.available = false;
			setTimeout( function() {
				onContent( self.content );
				self.available = true;
			}, this.delay );
		}
	};

	FileMock.prototype.write = function( content, onComplete ) {
		var self = this;
		this.lastModified = new Date();
		if( this.available ) {
			setTimeout( function() {
				self.content = content;
				onComplete();
			}, this.delay );
		}
	};

	var FileSystemMock = function() {
		this.files = {};
		this.paths = {};
	};

	FileSystemMock.prototype.buildPath = function( pathSpec ) {
		var hasLocalPrefix;
		if( _( pathSpec ).isArray() ) {
			hasLocalPrefix = pathSpec[0].match( /$[.\/]/ );
			pathSpec = path.join.apply( {}, pathSpec );
		}
		return hasLocalPrefix ? "./" + pathSpec : pathSpec;
	};

	FileSystemMock.prototype[ "delete" ] = function( pathSpec, onDeleted ) {
		var fullPath = this.buildPath( pathSpec );
		var file = this.files[ fullPath ];
		if( file ) {
			delete this.files[ filePath ];
			file[ "delete" ]( onDeleted );
		} else {
			throw new Error( "Cannot delete " + filePath + "; no such file" );
		}
	};

	FileSystemMock.prototype.ensurePath = function( pathSpec, onComplete ) {
		var fullPath = this.buildPath( pathSpec );
		this.paths[ fullPath ] = true;
		onComplete();
	};

	FileSystemMock.prototype.getFiles = function( pathSpec, onComplete ) {
		var fullPath = this.buildPath( pathSpec );
		var files = _.chain( this.files )
						.keys()
						.filter( function( name ) {
							return ( name.indexOf( fullPath ) ) >= 0;
						} )
						.value();
		onComplete( files );
	};

	FileSystemMock.prototype.metadata = function( pathSpec, onComplete ) {
		var fullPath = this.buildPath( pathSpec );
		var file = this.files[ fullPath ];
		onComplete( { lastModified: state.mtime } );
	};

	FileSystemMock.prototype.pathExists = function( pathSpec ) {
		var fullPath = this.buildPath( pathSpec );
		if( path.extname( fullPath ) ) {
			return this.files[ fullPath ];
		} else {
			return this.paths[ fullPath ];
		}
	};

	FileSystemMock.prototype.transform = function( inputSpec, transform, outputSpec, onComplete ) {
		var self = this,
			inputPath = this.buildPath( inputSpec );
			outputPath = this.buildPath( outputSpec );

		this.read( inputPath, function( content ) {
			transform( content, function( transformed, err ) {
				self.write( outputPath, transformed, function() {
					onComplete( err );
				} );
			} );
		} );
	};

	FileSystemMock.prototype.read = function( pathSpec, onComplete ) {
		var fullPath = this.buildPath( pathSpec );
		var file = this.files[ filePath ];
		if( file ) {
			file.read( function( content ) {
				onComplete( content );
			} );
		} else {
			throw new Error( "Cannot read " + fullPath + "; it does not exist" );
		}
	};

	FileSystemMock.prototype.reset = function() {
		this.files = {};
		this.paths = {};
	};

	return new FileSystemMock();
};

module.exports = fsFactory;