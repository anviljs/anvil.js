var fsFactory = function( _, path ) {

	var FileMock = function( fullPath ) {
		this.fullPath = fullPath;
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
		this.watchers = {};
		_.bindAll( this );
	};

	FileSystemMock.prototype.buildPath = function( pathSpec ) {
		var hasLocalPrefix;
		if( _( pathSpec ).isArray() ) {
			hasLocalPrefix = pathSpec[0].match( /^[.]\// );
			pathSpec = path.join.apply( {}, pathSpec );
		}
		return hasLocalPrefix ? "./" + pathSpec : pathSpec;
	};

	FileSystemMock.prototype.copy = function( from, to, onComplete ) {
		from = this.buildPath( from );
		to = this.buildPath( to );
		var toDir = path.dirname( to ),
			self = this;
		this.ensurePath( to, function() {
			self.read( from, function( content) {
				self.write( to, content, function() {
					onComplete( to );
				} );
			} );
		} );
	};

	FileSystemMock.prototype[ "delete" ] = function( pathSpec, onDeleted ) {
		pathSpec = this.buildPath( pathSpec );
		var file = this.files[ pathSpec ];
		if( file ) {
			delete this.files[ pathSpec ];
			file[ "delete" ]( onDeleted );
		} else {
			throw new Error( "Cannot delete " + pathSpec + "; no such file" );
		}
	};

	FileSystemMock.prototype.ensurePath = function( pathSpec, onComplete ) {
		var fullPath = this.buildPath( pathSpec );
		this.paths[ fullPath ] = true;
		onComplete();
	};


	FileSystemMock.prototype.buildFileData = function( workingBase, file ) {
		var projectBase = path.resolve( "./" );
		file = path.resolve( file );
		return {
			name: path.basename( file ),
			dependents: 0,
			extension: function() { return path.extname( this.fullPath ); },
			fullPath: file,
			imports: [],
			originalName: this.name,
			originalPath: file,
			outputPaths: [],
			relativePath: path.dirname( file.replace( projectBase, "" ) ),
			workingPath: path.resolve( this.buildPath( [ workingBase, path.dirname( file.replace( projectBase, "" ) ) ] ) )
		};
	};

	FileSystemMock.prototype.getFiles = function( pathSpec, workingPath, onComplete, filter ) {
		var fullPath = path.resolve( this.buildPath( pathSpec ) ),
			self = this;
		filter = filter || [];
		var files = _.chain( this.files )
						.keys()
						.reject( function( name ) {
							return _.any( filter, function( avoid ) { return name.indexOf( avoid ) >= 0; } );
						} )
						.filter( function( name ) {
							return ( name.indexOf( fullPath ) ) >= 0;
						} )
						.value();
		var directories = _.chain( this.paths )
							.keys()
							.without( filter )
							.filter( function( name ) {
								return( name.indexOf( fullPath ) ) >= 0;
							} )
							.value();
		directories.unshift( path.resolve( "./" ) );
		onComplete( _.map( files, function( file ) {
			return self.buildFileData( workingPath, file );
		} ), directories );
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
		pathSpec = this.buildPath( pathSpec );
		var file = this.files[ pathSpec ];
		if( file ) {
			file.read( function( content ) {
				onComplete( content );
			} );
		} else {
			throw new Error( "Cannot read " + pathSpec + "; it does not exist" );
		}
	};

	FileSystemMock.prototype.reset = function() {
		this.files = {};
		this.paths = {};
	};

	FileSystemMock.prototype.raiseEvent = function( fileEvent, pathSpec ) {
		pathSpec = this.buildPath( pathSpec );
		var watcher = this.watchers[ pathSpec ];
		if( watcher ) {
			watcher.handler( fileEvent, pathSpec );
		}
	};

	FileSystemMock.prototype.watch = function( pathSpec, onEvent ) {
		var self = this;
		pathSpec = this.buildPath( pathSpec );
		var watcher = {
			close: function() {
				delete self.watchers[ pathSpec ];
			},
			handler: onEvent
		};
		this.watchers[ pathSpec ] = watcher;
		return watcher;
	};

	FileSystemMock.prototype.write = function( pathSpec, content, onComplete ) {
		pathSpec = this.buildPath( pathSpec );
		var self = this,
			file = this.files[ pathSpec ];
		if( !file ) {
			file = new FileMock( pathSpec );
			this.files[ pathSpec ] = file;
		}
		file.write( content, function() {
			self.raiseEvent( "change", pathSpec );
			onComplete();
		} );
	};

	return new FileSystemMock();
};

module.exports = fsFactory;