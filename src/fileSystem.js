var fileFactory = function( _, fs, path, mkdir, crawler ) {

	var FileSystem = function() {
		_.bindAll( this );
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
		this.ensurePath( to, function() {
			writeStream = fs.createWriterStream( to );
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
			fs.unlink( pathSpec, function( error ) {
				onDeleted( error );
			} );
		}
	};

	FileSystem.prototype.ensurePath = function( pathSpec, onComplete ) {
		pathSpec = this.buildPath( pathSpec );
		path.exists( pathSpec, function( exists ) {
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

	FileSystem.prototype.getFiles = function( pathSpec, onFiles ) {
		pathSpec = this.buildPath( pathSpec );
		crawler.crawl( pathSpec, onFiles );
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
		path.existsSync( pathSpec );
	};

	FileSystem.prototype.read = function( pathSpec, onContent ) {
		pathSpec = this.buildPath( pathSpec );
		fs.readFile( pathSpec, "utf8", function( error, content ) {
			if( error ) {
				onContent( "", error );
			} else {
				onContent( content );
			}
		} );
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

