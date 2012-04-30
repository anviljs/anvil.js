var fileBootstrapFactory = function( _, fp, scheduler, minimatch, machina ) {
	
	var Bootstrapper = function( paths, inclusions, exclusions, callback ) {
		var map = {};
		this.inclusions = inclusions;
		this.exclusions = exclusions;
		this.callback = callback;
		_.bindAll( this );

		paths = _.isArray( paths ) ? paths : [ paths ];
		_.each( paths, function( p ) {
			map[ p ] = fp.getFiles;
		} );
		scheduler.mapped( map, this.onFiles );
	};

	Build.prototype.onFiles = function( fileLists ) {
		var included = [],
			exlcluded = [],
			list;
		_.each( this.inclusions, function( inclusion ) {
			included.push( fileLists.filter( minimatch.filter( inclusion ) ) );
		} );

		_.each( this.exclusions, function( exclusion ) {
			excluded.push( fileLists.filter( minimatch.filter( exclusion ) ) );
		} );
		
		list = _( included )
					.chain()
					.flatten()
					.uniq()
					.difference( excluded )
					.value();
		fileMap = {};
		_.each( list, function( path ) {
			fileMap[ path ] = this.createFileMachine;
		}, this );

		scheduler.mapped( fileMap, this.callback );
	};

	Build.prototype.createFileMachine = function( filePath, onComplete ) {
		fs.stat( filePath, function( stat ) {
			onCompete( new machina.Fsm( {
				name: path.basename( filePath ),
				ext: _.bind( function() { return path.extname( this.name ); }, this ),
				fullPath: path.resolve( filePath ),
				relativePath: path.resolve( "./", filePath ),
				workingPath: "",
				lastModified: stat.mtime,
				watcher: fs.watch( filePath, this.onFileChange ),
				initialState: "initilization",
				namespace: this.relativePath,
				imports: [],
				dependents: 0,
				onFileChange: function() {},
				
				broadcastStep: function( step ) {
					postal.publish( step, this.namespace, {
						file: this
					} );
				},

				copy: function( to, onComplete ) {
					var self = this;
					fp.copy( [ this.workingPath, this.name ], to, function( newFull ) {
						self.workingPath = path.dirname( newFull );
						self.name = path.basename( newFull );
						onComplete();
					} );
				},

				transform: function( type, newName, transform, onComplete ) {
					var self = this;
					fp.transform(
						[ this.workingPath, this.name ],
						transform,
						[ this.workingPath, newName ],
						function( err ) {
							if( !err ) {
								file.name = newFile;
								onComplete( file );
							} else {
								self.raiseEvent( {
									type: type,
									message: type + " failed for " + self.fullPath,
									error: err
								} );
								onComplete( file, err );
							}
						} );
				},

				states: {
					"initialization": {
						_onEnter: function() {
							console.log( "Starting fsm for " + this.fullPath );
							console.log( "	--> " + JSON.stringify( this ) );
							_.bindAll( this );
							this.broadcastStep("ready");
						}
					},
					"scanning": {
						_onEnter: function() {

						},
						"imported": function() {
							this.dependents++;

						},
						"*": function() {

						}
					} 
				}
			} ) );
		} );
	};
};

module.exports = fileBootStrapFactory;