var fileFactory = function( _, fs, path, mkdir, crawler ) {

	var FileProvider = function() {
		_.bindAll( this );
	};

	FileProvider.prototype.buildPath = function( pathSpec ) {
		var fullPath = pathSpec || "";

		if( _.isArray( pathSpec ) ) {
			fullPath = path.join.apply( {}, pathSpec );
		}
		return fullPath;
	};

	FileProvider.prototype.copy = function( from, to, onComplete ) {
		from = this.buildPath( from );
		to = this.buildPath( to );
		var readStream, writeStream;
		writeStream = fs.createWriterStream( to );
		( readStream = fs.createReadStream( from ) ).pipe( writeStream );
		readStream.on( "end", function() {
			if( writeStream ) {
				writeStream.destroySoon();
			}
			onComplete( to );
		} );
	};

	FileProvider.prototype["delete"] = function( filePath, onDeleted ) {
		filePath = this.buildPath( filePath );
		if( this.pathExists( filePath ) ) {
			fs.unlink( filePath, function( error ) {
				onDeleted( error );
			} );
		}
	};

	FileProvider.prototype.ensurePath = function( fullPath, onComplete ) {
		fullPath = this.buildPath( fullPath );
		path.exists( fullPath, function( exists ) {
			if( !exists ) {
				mkdir( fullPath, "0755", function( error ) {
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

	FileProvider.prototype.getFiles = function( fullPath, onFiles ) {
		var fullPath = this.buildPath( fullPath );
		crawler.crawl( fullPath, onFiles );
	};

	FileProvider.prototype.metadata = function( fullPath, onStat ) {
		fullPath = this.buildPath( fullPath );
		try {
			return fs.stat( fullPath, function( stat ) {
				onStat( { lastModified: stat.mtime } );
			} );
		} catch ( err ) {
			onStat( { error: err } );
		}
	}

	FileProvider.prototype.pathExists = function( fullPath ) {
		fullPath = this.buildPath( fullPath );
		path.existsSync( fullPath );
	};

	FileProvider.prototype.read = function( fullPath, onContent ) {
		fullPath = this.buildPath( fullPath );
		fs.readFile( fullPath, "utf8", function( error, content ) {
			if( error ) {
				onContent( "", error );
			} else {
				onContent( content );
			}
		} );
	};

	FileProvider.prototype.readSync = function( fullPath ) {
		fullPath = this.buildPath( fullPath );
		try {
			return fs.readFileSync( fullPath, "utf8" );
		} catch( error ) {
			return error;
		}
	};

	FileProvider.prototype.transform = function( from, transform, to, onComplete ) {
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

	FileProvider.prototype.write = function( fullPath, content, onComplete ) {
		fullPath = this.buildPath( fullPath );
		fs.writeFile( fullPath, content, "utf8", function( error ) {
			if( !error ) {
				onComplete();
			} else {
				onComplete( error );
			}
		} );
	};

	return FileProvider;
};

module.exports = fileFactory;

