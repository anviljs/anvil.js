/*
	anvil.js - an extensible build system
	version:	0.8.13
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var watchTree = require( "fs-watch-tree" ).watchTree;

var fileFactory = function( _, fs, path, mkdir, crawler, scheduler, utility ) {

	var FileSystem = function() {
		_.bindAll( this );
	};

	FileSystem.prototype.buildFileData = function( baseline, workingBase, file ) {
		baseline = path.resolve( this.buildPath( baseline ) );
		workingBase = path.resolve( this.buildPath( workingBase ) );
		var projectBase = path.resolve( baseline );
		file = path.resolve( file );
		return {
			name: path.basename( file ),
			dependents: [],
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
		pathSpec = pathSpec.replace( /^~/, process.env.HOME );
		return hasLocalPrefix ? "./" + pathSpec : pathSpec;
	};

	FileSystem.prototype.cleanDirectory = function( pathSpec, onDeleted ) {
		var self = this;
		pathSpec = this.buildPath( pathSpec );
		self.getFiles( pathSpec, pathSpec, function( files, directories ) {
			if( directories.length ) {
				scheduler.parallel( files,
					function( file, done ) {
						self["delete"]( file.fullPath, done );
					},
					function() {
						scheduler.parallel( directories, self["delete"], function() {
							if( onDeleted ) {
								onDeleted();
							}
						} );
					} );
			} else {
				scheduler.parallel( files,
					function( file, done ) {
						self["delete"]( file.fullPath, done );
					}, function() {
						if( onDeleted ) {
							onDeleted();
						}
					} );
			}
		}, [], 1 );
	};

	FileSystem.prototype.copy = function( from, to, onComplete ) {
		var self = this;
		from = this.buildPath( from );
		if( fs.existsSync( from ) ) {
			fs.stat( from, function( err, stat ) {
				if ( stat.isDirectory() ) {
					self.copyDirectory( from, to, onComplete );
				} else {
					self.copyFile( from, to, onComplete );
				}
			} );
		} else {
			onComplete();
		}
	};

	FileSystem.prototype.copyDirectory = function( from, to, onComplete ) {
		from = path.resolve( this.buildPath( from ) );
		to = path.resolve( this.buildPath( to ) );
		var self = this,
			toDir = path.dirname( to );
		this.ensurePath( toDir, function() {
			self.getFiles( from, from, function( files, directories ) {
				scheduler.parallel( files, function( file, done ) {
					var relative = file.fullPath.replace( from, "" );
					self.copyFile( file.fullPath, [ to, relative, file.name ], done );
				}, onComplete );
			} );
		} );
	};

	FileSystem.prototype.copyFile = function( from, to, onComplete ) {
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
		var self = this;
		pathSpec = this.buildPath( pathSpec );
		if( this.pathExists( pathSpec ) ) {
			fs.stat( pathSpec, function( err, stat ) {
				if ( stat.isDirectory() ) {
					self.deleteDirectory( pathSpec, onDeleted );
				} else {
					self.deleteFile( pathSpec, onDeleted );
				}
			} );
		} else {
			self.deleteLink( pathSpec, onDeleted );
		}
	};

	FileSystem.prototype.deleteDirectory = function( pathSpec, onDeleted ) {
		var self = this;
		pathSpec = this.buildPath( pathSpec );
		self.cleanDirectory( pathSpec, function() {
			fs.rmdir( pathSpec, function() {
				if( onDeleted ) {
					onDeleted();
				}
			} );
		} );
	};

	FileSystem.prototype.deleteFile = function( pathSpec, onDeleted ) {
		pathSpec = this.buildPath( pathSpec );
		fs.unlink( pathSpec, function( error ) {
			if( onDeleted ) {
				onDeleted( error );
			}
		} );
	};

	FileSystem.prototype.deleteLink = function( pathSpec, onDeleted ) {
		pathSpec = this.buildPath( pathSpec );
		fs.lstat( pathSpec, function( err, stat ) {
			if( !err ) {
				fs.unlink( pathSpec, function( error ) {
					if( onDeleted ) {
						onDeleted( error );
					}
				} );
			} else {
				if( onDeleted ) {
					onDeleted( error );
				}
			}
		} );
	};

	FileSystem.prototype.ensurePath = function( pathSpec, onComplete ) {
		pathSpec = this.buildPath( pathSpec );
		if( onComplete ) {
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
		} else {
			if( !this.pathExists ) {
				mkdir( pathSpec, "0755", function( error ) {
					if( error ) {
						throw error;
					}
				} );
			}
		}
	};

	FileSystem.prototype.getFiles = function( pathSpec, workingPath, onFiles, filters, limit ) {
		var self = this;
		limit = limit === undefined || limit === null ? -1 : limit;
		filters = filters || [];
		pathSpec = path.resolve( this.buildPath( pathSpec ) );

		crawler.crawl( pathSpec,
			function( files, directories ) {
				onFiles(
					_.map( files, function( file ) { return self.buildFileData( pathSpec, workingPath, file ); } ),
					directories
				);
		}, filters, limit, 0 );
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

	FileSystem.prototype.pathExists = function( pathSpec, callback ) {
		pathSpec = this.buildPath( pathSpec );
		if( callback ) {
			fs.exists( pathSpec, callback );
		} else {
			return fs.existsSync( pathSpec );
		}
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
		var self = this;

		return watchTree( pathSpec,
			_.debounce( function( event ) {
				if( !event.isDirectory() ) {
					onEvent( event );
				}
			}, 1000, true )
		);
	};

	FileSystem.prototype.write = function( pathSpec, content, onComplete ) {
		pathSpec = this.buildPath( pathSpec );
		this.ensurePath( path.dirname( pathSpec ), function() {
			if( onComplete ) {
				fs.writeFile( pathSpec, content, "utf8", function( error ) {
					if( !error ) {
						onComplete();
					} else {
						onComplete( error );
					}
				} );
			} else {
				fs.writeFileSync( pathSpec, content, "utf8" );
			}
		} );
	};

	return new FileSystem();
};

module.exports = fileFactory;