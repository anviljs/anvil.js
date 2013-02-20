/*
	anvil.js - an extensible build system
	version:	0.9.2
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var anvilFactory = function( _, scheduler, fs, Monologue, bus ) {
	var Anvil = function() {
		_.bindAll( this );
		this.extensions = {
			plugins: {},
			commands: {},
			tasks: {},
			scaffolds: {},
			widgets: {}
		};
		this.config = {};
		this.env = {
		};
		this.project = {
			files: [],
			directories: [],
			dependencies: [],
			getFile: function( spec ) {
				spec = fs.buildPath( spec );
				return _.find( this.files, function( file ) {
					return file.fullPath === spec;
				} );
			}
		};
		this.addEvents = Monologue.mixin;
		this.bus = bus;
		this.eventDef = {
			"all.stop": [ "code" ],
			"build.stop": [ "reason" ],
			"config": [ "callback" ],
			"commander": [ "config", "commander" ],
			"commander.configured": [],
			"file.changed": [ "type", "file", "path" ],
			"file.deleted": [ "type", "file", "path" ],
			"log.debug": [ "message" ],
			"log.event": [ "message" ],
			"log.step": [ "message" ],
			"log.complete": [ "message" ],
			"log.warning": [ "message" ],
			"log.error": [ "message" ],
			"plugins.configured": [],
			"plugin.loaded": [ "instance" ],
			"rebuild": [ "step" ]
		};
		this.unhandledResponse = {
			"Error: watch EMFILE": "Your operating system has prevented anvil from watching files by limiting the number of allowed file handles. You can correct this temporarily with: \n\t ulimit -n 10000 \nand then permanently with: \n\t launchctl limit maxfiles 10000",
			"Error: EMFILE, too many open files": "Your operating system has prevented anvil from watching files by limiting the number of allowed file handles. You can correct this temporarily with: \n\t ulimit -n 10000 \nand then permanently with: \n\t launchctl limit maxfiles 10000",
			"Error: EBADF, close": {},
			"Error: OK, close": {}
		};
		this.fs = fs;
		this.scheduler = scheduler;
		var self = this;
 
		this.goPostal( "anvil" );

		process.removeAllListeners( "uncaughtException" );
		process.on( "uncaughtException", function( err ) {
			if( self.log ) {
				var specialResponse = self.unhandledResponse[ err.toString() ];
				if( specialResponse ) {
					if( !_.isEmpty( specialResponse ) ) {
						self.log.error( specialResponse );
					}
				} else {
					self.log.error( "Unhandled exception: " + err + "\n" + err.stack );
				}
			} else {
				console.log( "Unhandled exception: " + err + "\n" + err.stack );
			}
		} );

		this.initEnvironment();
	};

	Anvil.prototype.initEnvironment = function() {
		var gitConfigPath = this.fs.buildPath( [ "~/.gitconfig" ] ),
			gitConfig = this.fs.read( gitConfigPath );

		if( !_.isEmpty( gitConfig ) && _.isString( gitConfig ) ) {
			var userMatch = gitConfig.match(/[\t]name[ ][=][ ](.+)[\n]/ ),
				emailMatch = gitConfig.match(/[\t]email[ ][=][ ](.+)[\n]/ );
			this.env.userName = userMatch && userMatch.length ? userMatch[1] : "";
			this.env.email = emailMatch && emailMatch.length ? emailMatch[1] : "";
		}
	};

	Anvil.prototype.onConfig = function( config ) {
		this.config = config;
		if( this.commander ) {
			if( this.commander.browser || this.config.browser ) {
				this.config.browser = true;
			}

			if( this.commander.host || this.config.host ) {
				this.config.host = true;
				try {
					if( !this.config.httpPaths[ "/" ] ) {
						this.config.httpPaths[ "/" ] = this.config.output;
					}
					this.http.init();
				} catch ( err ) {
					console.log( err.stack );
				}
			}
		}
		this.emit( "config", { callback: this.onExtensionsConfigured } );
	};

	Anvil.prototype.onCommander = function( config, commander ) {
		this.commander = commander;
		this.emit( "commander", { config: config, commander: commander } );
	};

	Anvil.prototype.onExtensionsConfigured = function() {
		this.pluginConfigurationCompleted = true;
		var file = this.commander ? this.commander.write : undefined;
		if( file ) {
			this.writeConfig( file + ".json" );
		} else {
			this.log.debug( "plugin configuration complete" );
			this.emit( "plugins.configured" );
		}
	};

	Anvil.prototype.stop = function( code ) {
		this.emit( "all.stop", { code: code } );
		process.exit( code );
	};

	Anvil.prototype.stopBuild = function( reason ) {
		this.emit( "build.stop", reason );
	};

	Anvil.prototype.updateConfig = function( update, done ) {
		this.fs.transform( "./build.json", update, "./build.json", done );
	};

	Anvil.prototype.writeConfig = function( file ) {
		var self = this,
			json = JSON.stringify( this.config, null, 4 );
			this.fs.write( file, json, function( err ) {
				if( err ) {
					self.log.error( "Could not write config to " + file + " : " + err + "\n" + err.stack );
				} else {
					self.log.complete( "Configuration written to " + file + " successfully" );
				}
			} );
	};

	Monologue.mixin( Anvil );

	return new Anvil();
};

module.exports = anvilFactory;
