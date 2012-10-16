/*
	anvil.js - an extensible build system
	version:	0.8.15
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
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
		anvil.on( "commander", this.loadPlugins );
		anvil.on( "config", this.configurePlugins );
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
					anvil.raise( "all.stop", -1 );
				} );
			}
		} );
	};

	PluginLocator.prototype.initPlugin = function( plugin ) {
		var handle = this.wireHandler,
			self = this;
		if( !_.isEmpty( plugin.config ) ) {
			anvil.config[ plugin.name ] = plugin.config;
		}
		if( plugin.commander && _.isArray( plugin.commander ) ) {
			_.each( plugin.commander, function( options ) {
				self.commandOptions.push( options );
			} );
		} else if( plugin.commander && _.isObject( plugin.commander ) ) {
			this.setupCommandRoutes( plugin );
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
								anvil.raise( "all.stop", -1 );
							} );
						}
					} );
					var optionList = self.commandOptions.sort();
					_.each( optionList, function( options ) {
						if( anvil.commander ) {
							anvil.commander.option.apply( anvil.commander, options );
						}
					} );
					anvil.raise( "commander.configured" );
				} );
			} catch ( err ) {
				anvil.log.error( "Fatal: attempt to initialize plugins was an abismal fail: " + err + "\n" + err.stack );
				anvil.raise( "all.stop", -1 );
			}
		} );
	};

	// Look away, shield your eyes. For only sorrow lies before those who
	// read the contents...
	PluginLocator.prototype.setupCommandRoutes = function ( plugin ) {
		var self = this,
			oldConfig = plugin.configure,
			oldRun = plugin.run,
			calls = {},
			keys;
		_.each( plugin.commander, function( commandSpec, key ) {
			self.commandOptions.push( [ key, commandSpec.description ] );
			var scrubbedKey = key.replace( /[-]/g, "" ).replace( " ", "" ),
				keys = scrubbedKey.split( "," );
			_.each( keys, function( k ) { calls[ k ] = commandSpec; } );
		} );
		var getCall = function( commander ) {
			var call,
				hasCall = _.any( calls, function( spec, k ) {
					if( commander[ k ] ) {
						call = calls[ k ].call;
						return true;
					}
					return false;
				} );
			return call;
		};
		plugin.configure = function( config, commander, done ) {
			var call = getCall( commander );
			if( call ) {
				this[ "__invoke__" ] = _.isString( call ) ? this[ call ] : call;
			}
			oldConfig( config, commander, done );
		};
		plugin.run = function( done, activity ) {
			if( this[ "__invoke__" ] ) {
				this[ "__invoke__" ]( done, activity );
			} else {
				oldRun( done, activity );
			}
		};
		_.bindAll( plugin );
	};

	return new PluginLocator();
};

module.exports = pluginLocatorFactory;