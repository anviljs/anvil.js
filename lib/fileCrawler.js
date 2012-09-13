/*
	anvil.js - an extensible build system
	version:	0.8.5
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
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
						fileList = fileList.concat( files );
						fileList = _.reject( fileList, function( file ) {
							return _.any( filter, function( exclusion ) { return file.match( exclusion ); } );
						} );
						directoryList = directoryList.concat( directories );
						directoryList = _.reject( directoryList, function( directory ) {
							return _.any( filter, function( exclusion ) { return directory.match( exclusion ); } );
						} );
						if( directories.length > 0 && ( level <= limit || limit < 0 ) ) {
							scheduler.parallel( directories,
								function( directory, done ) {
									self.crawl( directory, done, filter, limit, level );
								},
								function( files ) {
									fileList = fileList.concat( _.flatten( files ) );
									fileList = _.reject( fileList, function( file ) {
										return _.any( filter, function( exclusion ) { return file.match( exclusion ); } );
									} );
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

	return new FSCrawler();
};

module.exports = fsCrawlerFactory;