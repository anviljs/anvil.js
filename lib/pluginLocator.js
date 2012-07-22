/*
	anvil.js - an extensible build system
	version: 0.8.0
	author: Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright: 2011 - 2012
	license: Dual licensed 
			 MIT (http://www.opensource.org/licenses/mit-license) 
			 GPL (http://www.opensource.org/licenses/gpl-license)
*/
var pluginLocatorFactory = function( _, plugins, anvil ) {

	var PluginLocator = function() {
		_.bindAll( this );
		this.instances = {};
		this.count = 0;
		anvil.events.on( "commander", this.loadPlugins );
		anvil.events.on( "config", this.configurePlugins );
	};

	PluginLocator.prototype.configurePlugins = function( done ) {
		var remaining = this.count;
		var configDone = function() {
			if( --remaining === 0 ) {
				done();
			}
		};
		_.each( this.instances, function( plugin ) {
			try {
				if( plugin.configure ) {
					plugin.configure( anvil.config, anvil.commander, configDone );
				} else {
					configDone();
				}
			} catch ( err ) {
				anvil.log.error( "Error configuring plugin '" + plugin.name + "' : " + err + "\n" + err.stack );
				anvil.pluginManager.removePlugin( plugin.name, function() {
					anvil.log.step( "Plugin '" + plugin.name + "' cannot be configured and has been disabled");
					anvil.events.raise( "all.stop", -1 );
				} );
			}
		} );
	};

	PluginLocator.prototype.initPlugin = function( plugin ) {
		var handle = this.wireHandler,
			self = this;
		handle( "build.done", plugin.buildSucceeded );
		handle( "build.failed", plugin.buildFailed );
		handle( "build.start", plugin.buildStarted );
		handle( "build.stop", plugin.buildStopped );
		if( !_.isEmpty( plugin.config ) ) {
			anvil.config[ plugin.name ] = plugin.config;
		}
		_.each( plugin.commander, function( options ) {
			anvil.commander.option.apply( anvil.commander, options );
		} );
	};

	PluginLocator.prototype.loadPlugins = function() {
		var self = this;
		try {
			plugins.getPlugins( function( list ) {
				_.each( list, function( plugin ) {
					try {
						self.initPlugin( plugin.instance );
						self.instances[ plugin.name ]= plugin.instance;
						self.count++;
					} catch ( err ) {
						anvil.log.error( "Error initializing plugin '" + plugin.name + "': " + err + "\n" + err.stack );
						anvil.pluginManager.removePlugin( plugin.name, function() {
							anvil.log.step( "Plugin '" + plugin.name + "' cannot be loaded and has been disabled");
							anvil.events.raise( "all.stop", -1 );
						} );
					}
				} );
				anvil.events.raise( "commander.configured" );
			} );
		} catch ( err ) {
			anvil.log.error( "Fatal: attempt to initialize plugins was an abismal fail: " + err + "\n" + err.stack );
			anvil.events.raise( "all.stop", -1 );
		}
	};

	PluginLocator.prototype.wireHandler = function( topic, handler ) {
		if( handler ) {
			anvil.events.on( topic, handler );
		}
	};

	return new PluginLocator();
};

module.exports = pluginLocatorFactory;