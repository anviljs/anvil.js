var fsCrawlerFactory = function( _, fs, path, scheduler ) {

	var FSCrawler = function() {
		_.bindAll( this );
	};

	FSCrawler.prototype.crawl = function( directory, onComplete, filter ) {
		var self = this,
			directoryList = [ path.resolve( "./" ) ],
			fileList = [];

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
						
						//directories = _.without( directories, filter );
						
						directories = _.reject( directories, function( directory ) {
							return _.any( filter, function( exclusion ) { return exclusion === directory; } );
						} );

						directoryList = directoryList.concat( directories );
						if( directories.length > 0 ) {
							scheduler.parallel( directories,
								function( directory, done ) {
									self.crawl( directory, done, filter );
								},
								function( files ) {
									fileList = fileList.concat( _.flatten( files ) );
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