/*
	anvil.js - an extensible build system
	version:	0.9.0-RC2
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var anvilFactory = function( _, scheduler, fs, events, bus ) {
	
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
				_.first( this.files, function( file ) {
					return file.fullPath === spec;
				} );
			}
		};
		this.bus = bus;
		this.events = events;
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
			"Error: EMFILE, too many open files": "Your operating system has prevented anvil from watching files by limiting the number of allowed file handles. You can correct this temporarily with: \n\t ulimit -n 10000 \nand then permanently with: \n\t launchctl limit maxfiles 10000"
		};
		this.fs = fs;
		this.scheduler = scheduler;
		var self = this;
 
		this.on( "all.stop", function( exitCode ) {
			process.exit( exitCode );
		} );

		process.removeAllListeners( "uncaughtException" );
		process.on( "uncaughtException", function( err ) {
			if( self.log ) {
				var specialResponse = self.unhandledResponse[ err.toString() ];
				if( specialResponse ) {
					self.log.error( specialResponse );
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
			this.env.userName = gitConfig.match(/[\t]name[ ][=][ ](.+)[\n]/ )[1];
			this.env.email = gitConfig.match(/[\t]email[ ][=][ ](.+)[\n]/ )[1];
		}
	};

	Anvil.prototype.onConfig = function( config ) {
		this.config = config;
		this.raise( "config", this.onPluginsConfigured );
	};

	Anvil.prototype.onCommander = function( config, commander ) {
		this.commander = commander;
		this.raise( "commander", config, commander );
	};

	Anvil.prototype.onPluginsConfigured = function() {
		this.pluginConfigurationCompleted = true;
		var file = this.commander ? this.commander.write : undefined;
		if( file ) {
			this.writeConfig( file + ".json" );
		} else {
			this.log.debug( "plugin configuration complete" );
			this.raise( "plugins.configured" );
		}
	};

	Anvil.prototype.on = function( eventName, handler ) {
		return events.on( "anvil." + eventName, handler );
	};

	Anvil.prototype.publish = function( topic, message ) {
		var e = this.eventDef[ topic ];
		if( e ) {
			args.unshift( "anvil." + topic );
			events.raise.apply( undefined, args );
		}
		bus.publish( "anvil", topic, message );
	};

	Anvil.prototype.raise = function( eventName ) {
		var e = this.eventDef[ eventName ],
			fullArgs = Array.prototype.slice.call( arguments ),
			args = fullArgs.slice( 1 );
		if( e ) {
			var msg = _.object( e, args );
			bus.publish( "anvil", eventName, msg );
		}
		args.unshift( "anvil." + eventName );
		events.raise.apply( undefined, args );
	};

	Anvil.prototype.subscribe = function( eventName, handler ) {
		bus.subscribe( "anvil", eventName, handler );
	};

	Anvil.prototype.writeConfig = function( file ) {
		var self = this,
			json = JSON.stringify( this.config, null, 4 );
			this.fs.write( file, json, function( err ) {
				if( err ) {
					self.log.error( "Could not write config to " + file + " : " + err + "\n" + err.stack );
				} else {
					self.log.complete( "Configuration defaults written to " + file + " successfully" );
				}
			} );
	};

	return new Anvil();
};

module.exports = anvilFactory;