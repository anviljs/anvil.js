var pluginLocatorFactory = function( _, plugins, anvil ) {

	var PluginLocator = function() {
		_.bindAll( this );
		this.instances = {};
		this.preLoaded = [];
		this.commandOptions = [
			[ "-b, --build [build file]", "Use a custom build file", "./build.json" ],
			[ "--write [build file]", "Create a new build file based on default config" ],
			[ "-q, --quiet", "Only print completion and error messages" ],
			[ "--verbose", "Include debug and warning messages in log" ]
		];
		this.count = 0;
		anvil.events.on( "commander", this.loadPlugins );
		anvil.events.on( "config", this.configurePlugins );
	};

	PluginLocator.prototype.configurePlugins = function( done ) {
		var remaining = this.count,
			configDone = function() {
				if( --remaining === 0 ) {
					done();
				}
			},
			plugins = _.values( this.instances ).concat( this.preLoaded );
		_.each( plugins, function( plugin ) {
			try {
				if( anvil.config[ plugin.name ] ) {
					plugin.config = anvil.config[ plugin.name ];
				}
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
		if( _.isArray( plugin.commander ) ) {
			_.each( plugin.commander, function( options ) {
				self.commandOptions.push( options );
			} );
		}
	};

	PluginLocator.prototype.loadPlugins = function( config, commander ) {
		var self = this;
		plugins.checkDependencies( config.dependencies || [], function() {
			try {
				anvil.scheduler.mapped( {
					plugins: plugins.getPlugins,
					tasks: plugins.getTasks
				}, function( results ) {
					var list = self.preLoaded
							.concat( results.plugins || [] )
							.concat( results.tasks || [] );
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
					var optionList = self.commandOptions.sort();
					_.each( optionList, function( options ) {
						anvil.commander.option.apply( anvil.commander, options );
					} );
					anvil.events.raise( "commander.configured" );
				} );
			} catch ( err ) {
				anvil.log.error( "Fatal: attempt to initialize plugins was an abismal fail: " + err + "\n" + err.stack );
				anvil.events.raise( "all.stop", -1 );
			}
		} );
	};

	PluginLocator.prototype.wireHandler = function( topic, handler ) {
		if( handler ) {
			anvil.events.on( topic, handler );
		}
	};

	return new PluginLocator();
};

module.exports = pluginLocatorFactory;