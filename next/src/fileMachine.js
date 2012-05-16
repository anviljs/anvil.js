var fileMachineFactory = function( _, fp, scheduler, postal, machina ) {

	// ## FileMachine
	// This state machine manages the pipeline and interactions
	// for this file during the build.
	// The filePath is the fully qualified or relative path to
	// the file and the onComplete callback will receive a handle
	// to the created file state machine.
	var FileMachine = function( filePath, onCreated ) {
		fp.stat( filePath, function( metadata ) {
			var machine = new machina.Fsm( {
				broadcast: postal.channel( "fileEvents" ),
				dependents: 0,
				ext:  function() { return path.extname( this.name ); },
				fullPath: path.resolve( filePath ),
				imports: [],
				initialState: "initilization",
				lastModified: metadata.lastModified,
				name: path.basename( filePath ),
				namespace: this.relativePath,
				relativePath: path.resolve( "./", filePath ),
				watcher: fs.watch( filePath, this.onFileChange ),
				workingPath: "",
				
				onFileChange: function() {},
				
				broadcastStep: function( step ) {
					this.broadcast.publish( { 
						topic: this.namespace,
						body: {
							file: this,
							event: step
						}
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

modules.exports = fileMachineFactory;