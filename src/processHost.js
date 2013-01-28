var spawn = require( "win-fork" );

module.exports = function( _, anvil ) {

	var Process = function( id ) {
		this.id = id;
		this.goPostal( id );
		this.config = anvil.config.processes[ id ];
		this.running = false;
		_.bindAll( this );
	};

	Process.prototype.allowRestart = function( file ) {
		var ignore = this.config.ignore,
			watch = this.config.watch,
			watching = !_.isEmpty( watch ),
			ignoring = !_.isEmpty( ignore ),
			noConfig = !watching && !ignoring,
			ignored = ignoring && this.contains( ignore, file ),
			watched = watching && this.contains( watch, file );

		if( noConfig ) {
			return true;
		} else if( ignored ) {
			return false;
		} else if( watched ) {
			return true;
		} else if( watching ) {
			return false;
		} else {
			return true;
		}
	};

	Process.prototype.contains = function ( list, file ) {
		var patterns = _.isArray( list ) ? list : [ list ];
		return _.any( patterns, function( pattern ) {
			var matched = anvil.minimatch( file, pattern );
			return matched;
		} );
	};

	Process.prototype.start = function() {
		var self = this,
			config = this.config,
			handle = spawn(
				config.command,
				config.args,
				{
					cwd: config.cwd || process.cwd(),
					stdio: config.stdio || "inherit",
					env: config.env || process.env
				} );
		this.running = true;

		handle.on( "exit", function( code, signal ) {
			self.emit( "exit", { id: this.id, code: code } );
			self.running = false;
		} );
		this.handle = handle;
		return handle;
	};

	Process.prototype.stop = function() {
		var self = this;
		if( this.handle ) {
			var signals = this.config.killSignal,
				handle = this.handle;
			if( _.isString( signals ) || _.isEmpty( ) ) {
				signals = [ signals || "SIGTERM" ];
			}
			_.each( signals, function( signal ) {
				if( handle ) {
					anvil.log.debug( "Killing process " + self.id + " with " + signal );
					handle.kill( signal );
				}
			} );
		}
	};

	Process.prototype.restart = function( changedFile ) {
		var self = this;
		if( !this.running ) {
			this.start();
		}
		if( this.config.restart && this.allowRestart( changedFile ) ) {
			this.once( "exit", function() {
				setTimeout( function() {
					self.start();
				}, 200 );
			} );
			this.stop();
		}
	};

	anvil.addEvents( Process );


	var ProcessHost = function() {
		var self = this,
			shutdown;
		this.config = anvil.config.processes;
		this.processes = {};
		this.lastChanged = "";
		this.started = false;

		shutdown = function() {
			shutdown = function() {};
			self.stop();
			process.exit( 0 );
		};

		anvil.on( "plugins.configured", function() {
			self.config = anvil.config.processes;
		} );

		anvil.on( "file.change", function( change ) {
			self.lastChanged = change.file;
		} );

		anvil.on( "build.done", function( args ) {
			if( anvil.config.host ) {
				anvil.log.step( "Build done, starting hosted processes" );
				self.restart();
			}
		} );

		process.on( "SIGINT", shutdown );
		process.on( "SIGTERM", shutdown );
		process.on( "exit", shutdown );
		_.bindAll( this );
	};

	ProcessHost.prototype.start = function( id ) {
		var self = this,
			valid = this.config[ id ],
			process = id ? this.processes[ id ] : undefined;
		this.started = true;
		if( id == undefined ) {
			_.each( this.processes, function( process, pid ) {
				self.start( id );
			} );
		} else {
			if( valid ) {
				if( !process ) {
					process = new Process( id );
				}
				process.start();
			}
		}
	};

	ProcessHost.prototype.stop = function( id ) {
		var self = this,
			process = id ? this.processes[ id ] : undefined;
		if( id == undefined ) {
			_.each( this.processes, function( process, pid ) {
				self.stop( pid );
			} );
		} else {
			if( process && process.running ) {
				process.stop();
			}
		}
	};

	ProcessHost.prototype.restart = function( id ) {
		var self = this,
			valid = this.config[ id ],
			process = id ? this.processes[ id ] : undefined;
		if( id == undefined ) {
			_.each( this.config, function( process, pid ) {
				self.restart( pid );
			} );
		} else {
			if( valid ) {
				if( !process ) {
					process = new Process( id );
					process.start();
					this.processes[ id ] = process;
				} else {
					process.restart( this.lastChanged );
				}
			}
		}
	};

	anvil.addEvents( ProcessHost );
	return new ProcessHost();
};