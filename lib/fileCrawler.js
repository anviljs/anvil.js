/*
	anvil.js - an extensible build system
	version:	0.9.2
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var minimatch = require( "minimatch" );
var fsCrawlerFactory = function( _, fs, path, scheduler ) {

	var FSCrawler = function() {
		_.bindAll( this );
	};

	FSCrawler.prototype.crawl = function( directory, onComplete, filter, limit, level ) {
		var self = this,
			base = directory,
			directoryList = [],
			fileList = [];
		level = level + 1;
		if( directory && directory !== "" ) {
			directory = path.resolve( directory );
			fs.readdir( directory, function( err, contents ) {
				if( !err && contents.length > 0 ) {
					qualified = [];
					_.each( contents, function( item ) {
						qualified.push( path.resolve( directory, item ) );
					} );
					self.classifyHandles( qualified, function( files, directories ) {
						fileList = self.filter( fileList.concat( files ), filter );
						directoryList = self.filter( directoryList.concat( directories ), filter );
						if( directories.length > 0 && ( level <= limit || limit < 0 ) ) {
							scheduler.parallel( directories,
								function( directory, done ) {
									self.crawl( directory, done, filter, limit, level );
								},
								function( files ) {
									fileList = self.filter( fileList.concat( _.flatten( files ) ), filter );
									onComplete( fileList, directoryList, filter );
								}
							);
						} else {
							onComplete( fileList, directoryList, filter );
						}
					} );
				} else {
					onComplete( fileList, directoryList, filter );
				}
			} );
		} else {
			onComplete( fileList, directoryList, filter );
		}
	};

	FSCrawler.prototype.classifyHandles = function( list, onComplete ) {
		if( list && list.length > 0 ) {
			scheduler.parallel( list, this.classifyHandle, function( classified ) {
				var files = [],
					directories = [];
				_.each( classified, function( item ) {
					if( item.isDirectory ) {
						directories.push( item.file );
					} else if( !item.err ) {
						files.push( item.file );
					}
				} );

				onComplete( files, directories );
			} );
		} else {
			onComplete( [], [] );
		}
	};

	FSCrawler.prototype.classifyHandle = function( file, onComplete ) {
		fs.stat( file, function( err, stat ) {
			if( err ) {
				onComplete( { file: file, err: err } );
			} else {
				onComplete( { file: file, isDirectory: stat.isDirectory() } );
			}
		} );
	};

	FSCrawler.prototype.filter = function( list, filter ) {
		var exclusions = [];
		_.each( filter, function( pattern ) {
			var matches = minimatch.match( list, pattern, { matchBase: true, dot: true } );
			exclusions = exclusions.concat( matches );
		} );
		return _.without( list, exclusions );
	};

	return new FSCrawler();
};

module.exports = fsCrawlerFactory;