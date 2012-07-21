var fileFactory = function( _, fs, path, mkdir, crawler ) {

	var FileSystem = function() {
		_.bindAll( this );
	};

	FileSystem.prototype.buildFileData = function( baseline, workingBase, file ) {
		var projectBase = path.resolve( baseline );
		file = path.resolve( file );
		return {
			name: path.basename( file ),
			dependents: 0,
			extension: function() { return path.extname( this.name ); },
			fullPath: file,
			imports: [],
			originalName: this.name,
			originalPath: file,
			relativePath: path.dirname( file.replace( projectBase, "" ) ),
			workingPath: path.resolve( this.buildPath( [ workingBase, path.dirname( file.replace( projectBase, "" ) ) ] ) )
		};
	};

	FileSystem.prototype.buildPath = function( pathSpec ) {
		var hasLocalPrefix;
		pathSpec = pathSpec || "";
		if( _.isArray( pathSpec ) ) {
			hasLocalPrefix = pathSpec[0].match( /^[.]\// );
			pathSpec = path.join.apply( {}, pathSpec );
		}
		return hasLocalPrefix ? "./" + pathSpec : pathSpec;
	};

	FileSystem.prototype.copy = function( from, to, onComplete ) {
		from = this.buildPath( from );
		to = this.buildPath( to );
		var toDir = path.dirname( to ),
			readStream, writeStream;
		this.ensurePath( toDir, function() {
			var writeStream = fs.createWriteStream( to ),
				readStream;
			( readStream = fs.createReadStream( from ) ).pipe( writeStream );
			readStream.on( "end", function() {
				if( writeStream ) {
					writeStream.destroySoon();
				}
				onComplete( to );
			} );
		} );
	};

	FileSystem.prototype["delete"] = function( pathSpec, onDeleted ) {
		pathSpec = this.buildPath( pathSpec );
		if( this.pathExists( pathSpec ) ) {
			fs.stat( pathSpec, function( err, stat ) {
				if ( stat.isDirectory() ) {
					fs.rmdir( pathSpec, function( error ) {
						if( onDeleted ) {
							onDeleted( error );
						}
					} );
				} else {
					fs.unlink( pathSpec, function( error ) {
						if( onDeleted ) {
							onDeleted( error );
						}
					} );
				}
			} );
		} else {
			fs.lstat( pathSpec, function( err, stat ) {
				if( !err ) {
					fs.unlink( pathSpec, function( error ) {
						if( onDeleted ) {
							onDeleted( error );
						}
					} );
				}
			} );
		}
	};

	FileSystem.prototype.ensurePath = function( pathSpec, onComplete ) {
		pathSpec = this.buildPath( pathSpec );
		fs.exists( pathSpec, function( exists ) {
			if( !exists ) {
				mkdir( pathSpec, "0755", function( error ) {
					if( error ) {
						onComplete( error );
					} else {
						onComplete();
					}
				} );
			} else {
				onComplete();
			}
		} );
	};

	FileSystem.prototype.getFiles = function( pathSpec, workingPath, onFiles, filter ) {
		var self = this;
		filter = filter || [];
		filter = _.map( filter, function( directory ) {
			return path.resolve( self.buildPath( directory ) );
		} );
		pathSpec = path.resolve( this.buildPath( pathSpec ) );

		crawler.crawl( pathSpec,
			function( files, directories ) {
				onFiles(
					_.map( files, function( file ) { return self.buildFileData( pathSpec, workingPath, file ); } ),
					directories
				);
		}, filter );
	};

	FileSystem.prototype.link = function( from, to, done ) {
		from = this.buildPath( from );
		to = this.buildPath( to );
		try {
			fs.symlink( from, to, "dir", done );
		} catch ( err ) {
			done( err );
		}
	};

	FileSystem.prototype.metadata = function( pathSpec, onStat ) {
		pathSpec = this.buildPath( pathSpec );
		try {
			return fs.stat( pathSpec, function( stat ) {
				onStat( { lastModified: stat.mtime } );
			} );
		} catch ( err ) {
			onStat( { error: err } );
		}
	};

	FileSystem.prototype.pathExists = function( pathSpec ) {
		pathSpec = this.buildPath( pathSpec );
		return fs.existsSync( pathSpec );
	};

	FileSystem.prototype.read = function( pathSpec, onContent ) {
		pathSpec = this.buildPath( pathSpec );
		try {
			fs.readFile( pathSpec, "utf8", function( error, content ) {
				if( error ) {
					onContent( "", error );
				} else {
					onContent( content );
				}
			} );
		} catch ( err ) {
			onContent( "", err );
		}
	};

	FileSystem.prototype.rename = function( from, to, done ) {
		from = this.buildPath( from );
		to = this.buildPath( to );
		var self = this;
		fs.rename( from, to, done );
	};

	FileSystem.prototype.readSync = function( pathSpec ) {
		pathSpec = this.buildPath( pathSpec );
		try {
			return fs.readFileSync( pathSpec, "utf8" );
		} catch( error ) {
			return error;
		}
	};

	FileSystem.prototype.transform = function( from, transform, to, onComplete ) {
		from = this.buildPath( from );
		to = this.buildPath( to );
		var self = this;
		this.read( from, function( content ) {
			transform( content, function( modified, error ) {
				if( !error ) {
					self.write( to, modified, onComplete );
				} else {
					onComplete( error );
				}
			} );
		} );
	};

	FileSystem.prototype.watch = function( pathSpec, onEvent ) {
		pathSpec = this.buildPath( pathSpec );
		return fs.watch( pathSpec, onEvent );
	};

	FileSystem.prototype.write = function( pathSpec, content, onComplete ) {
		pathSpec = this.buildPath( pathSpec );
		fs.writeFile( pathSpec, content, "utf8", function( error ) {
			if( !error ) {
				onComplete();
			} else {
				onComplete( error );
			}
		} );
	};

	return new FileSystem();
};

module.exports = fileFactory;