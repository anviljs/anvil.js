/*
	anvil.js - an extensible build system
	version:	0.9.0-RC4
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var spawn = require( "child_process" ).spawn;

module.exports = function( _, anvil ) {

	var Process = function( id ) {
		this.id = id;
		this.goPostal( id );
		this.config = anvil.config.processes[ id ];
		this.running = false;
		_.bindAll( this );
	};

	Process.prototype.allowRestart = function( file ) {
		console.log( "check restart for change on " + file );
		var ignore = this.config.ignore,
			watch = this.config.watch,
			noIgnore = _.isEmpty( ignore ),
			noWatch = _.isEmpty( watch );

		if( noIgnore && noWatch ) {
			return true;
		} else if( !noIgnore && this.contains( this.config.ignore, file ) ) {
			return false;
		} else if( !noWatch && this.contains( this.config.watch, file ) ) {
			return true;
		} else {
			return false;
		}
	};

	Process.prototype.contains = function ( list, file ) {
		var patterns = _.isArray( list ) ? list : [ list ];
		console.log( patterns );
		return _.any( patterns, function( pattern ) {
			var matched = anvil.minimatch( file, pattern );
			console.log( file + " ? " + pattern + " = " + matched );
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

		shutdown = function() {
			shutdown = function() {};
			self.stop();
			process.exit( 0 );
		};

		anvil.on( "plugins.configured", function() {
			self.config = anvil.config.processes;
		} );

		anvil.on( "file.change", function( change ) {
			console.log( change );
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
		_.bindAll( this );
	};

	ProcessHost.prototype.start = function( id ) {
		var self = this,
			valid = this.config[ id ],
			process = id ? this.processes[ id ] : undefined;
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