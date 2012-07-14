var machina = require( "machina" );

var fileLoaderFactory = function( _, anvil ) {
	
	var loader = {
		name: "fileLoader",
		activity: "identify",
		basePath: "./",
		commander: [],
		prerequisites: [],
		excluded: [ "./.git", "./.anvil" ],
		config: {

		},
		watchers: [],
		initialState: "waiting",

		buildDone: function() {
			this.handle( "build.done" );
		},

		buildFailed: function() {
			this.handle( "build.done" );
		},

		callback: function() {},
		run: function( done ) {
			this.callback = done;
			this.transition( "scanning" );
		},

		watchAll: function() {
			var self = this;
			_.each( anvil.project.files, function( file ) { self.watch( file.fullPath ); } );
			_.each( anvil.project.directories, function( directory ) { self.watch( directory, true ); } );
		},

		watch: function( path, isDir ) {
			var self = this;
			this.watchers.push( anvil.fs.watch( path, function( fileEvent, file ) {
				var eventName = isDir ? "directory.change" : "file.change";
				self.handle( eventName, fileEvent, file, path );
			} ) );
		},

		unwatchAll: function() {
			while( this.watchers.length > 0 ) {
				this.watchers.pop().close();
			}
		},

		states: {
			"waiting": {
				_onEnter: function() {
					console.log( "starting file loader" );
				},
				"build.done": function() {
					self.transition( "watching" );
				}
			},

			"scanning": {
				_onEnter: function() {
					console.log( "scanning" );
					var self = this;
					this.excluded.push( anvil.config.output );
					anvil.fs.getFiles( this.basePath, function( files, directories ) {
						console.log( files.length + " files found in " + directories.length + " directories" );
						anvil.project.files = files;
						anvil.project.directories = directories;
						self.callback();
						self.transition( "watching" );
					}, this.excluded );
				}
			},

			"watching": {
				_onEnter: function() {
					console.log( "watching files" );
					this.watchAll();
				},
				"file.change": function( fileEvent, file, path ) {
					this.unwatchAll();
					anvil.events.raise( "file.changed", fileEvent, path );
				}
			}
		}
	};
	
	var machine = new machina.Fsm( loader );
	return machine;
};

module.exports = fileLoaderFactory;