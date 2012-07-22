/*
	anvil.js - an extensible build system
	version: 0.8.0
	author: Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	license: Dual licensed 
			 MIT (http://www.opensource.org/licenses/mit-license) 
			 GPL (http://www.opensource.org/licenses/gpl-license)
*/
var anvilFactory = function( _, scheduler, fs, events, bus ) {
	
	var Anvil = function() {
		_.bindAll( this );
		this.plugins = {};
		this.pluginCount = 0;
		this.configuredPlugins = 0;
		this.config = {};
		this.project = {
			files: [],
			directories: [],
			getFile: function( spec ) {
				spec = fs.buildPath( spec );
				_.first( this.files, function( file ) {
					return file.fullPath === spec;
				} );
			}
		};
		this.bus = bus;
		this.events = events;
		this.fs = fs;
		this.scheduler = scheduler;
		var self = this;

		events.on( "all.stop", function( exitCode ) {
			process.exit( exitCode );
		} );

		events.on( "plugin.loaded", function( plugin ) {
			self.plugins[ plugin.name ] = plugin;
		} );

		
		process.on( "uncaughtException", function( err ) {
			if( self.log ) {
				self.log.error( "Unhandled exception: " + err + "\n" + err.stack );
			} else {
				console.log( "Unhandled exception: " + err + "\n" + err.stack );
			}
		} );
	};

	Anvil.prototype.onConfig = function( config ) {
		this.config = config;
		events.raise( "config", this.onPluginsConfigured );
	};

	Anvil.prototype.onCommander = function( commander ) {
		this.commander = commander;
		events.raise( "commander" );
	};

	Anvil.prototype.onPluginsConfigured = function() {
		this.pluginConfigurationCompleted = true;
		this.log.complete( "plugin configuration complete" );
		events.raise( "plugins.configured" );
	};

	return new Anvil();
};

module.exports = anvilFactory;