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
			if( plugin.configure ) {
				plugin.configure( anvil.config, anvil.commander, configDone );
			} else {
				configDone();
			}
		} );
	};

	PluginLocator.prototype.initPlugin = function( plugin ) {
		var handle = this.wireHandler,
			self = this;
		handle( "build.done", plugin.buildSucceeded );
		handle( "build.failed", plugin.buildFailed );
		handle( "build.start", plugin.startBuild );
		handle( "build.stop", plugin.stopBuild );
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
			_.each( plugins.getPlugins(), function( plugin ) {
				try {
					self.initPlugin( plugin.instance );
					self.instances[ plugin.name ]= plugin.instance;
					self.count++;
				} catch ( Err ) {
					anvil.log.error( "An error occurred loading plugin '" + plugin.name + "': " + Err );
				}
			} );
		} catch ( Err ) {
			anvil.log.error( "Attempt to load plugins was an abismal fail: " + Err );
		}
		anvil.events.raise( "commander.configured" );
	};

	PluginLocator.prototype.wireHandler = function( topic, handler ) {
		if( handler ) {
			anvil.events.on( topic, handler );
		}
	};

	return new PluginLocator();
};

module.exports = pluginLocatorFactory;