/*
	anvil.js - an extensible build system
	version:	0.8.15
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var extensionContainerFactory = function( _, extManager, anvil ) {

	// manages the lifecycle (load, configure and initialization) of extensions
	var ExtensionContainer = function() {
		_.bindAll( this );
		this.commandOptions = [
			[ "-b, --build [build file]", "Use a custom build file", "./build.json" ],
			[ "--write [build file]", "Create a new build file based on default config" ],
			[ "-q, --quiet", "Only print completion and error messages" ],
			[ "--verbose", "Include debug and warning messages in log" ]
		];
		anvil.on( "commander", this.loadExtensions );
		anvil.on( "config", this.configureExtensions );
	};

	// call configure on all extensions
	ExtensionContainer.prototype.configureExtensions = function( done ) {
		var extensions = this.getExtensions(),
			remaining = extensions.length,
			configDone = function() {
				if( --remaining === 0 ) {
					done();
				}
			};

		_.each( extensions, function( extension ) {
			try {
				if( anvil.config[ extension.name ] ) {
					extension.config = anvil.config[ extension.name ];
				}
				if( extension.configure ) {
					extension.configure( anvil.config, anvil.commander, configDone );
				} else {
					configDone();
				}
			} catch ( err ) {
				anvil.log.error( "Error configuring extension '" + extension.name + "' : " + err + "\n" + err.stack );
				anvil.extensionManager.removePlugin( extension.name, function() {
					anvil.log.step( "Extension '" + extension.name + "' cannot be configured and has been disabled");
					anvil.raise( "all.stop", -1 );
				} );
			}
		} );
	};

	// iterates over the extensions that have registered themselves to get an array
	ExtensionContainer.prototype.getExtensions = function() {
		var list = [];
		_.each( anvil.extensions, function( type, typeName ) {
			_.each( type, function( ext ) {
				ext.extensionType = typeName;
				list.push( ext );
			} );
		} );
		return list;
	};

	// initialize the extension by processing its commander array/object
	// and sorting out the configuration bits
	ExtensionContainer.prototype.initExtension = function( instance ) {
		var self = this;
		if( !_.isEmpty( instance.config ) ) {
			anvil.config[ instance.name ] = instance.config;
		}
		if( instance.commander && _.isArray( instance.commander ) ) {
			_.each( instance.commander, function( options ) {
				self.commandOptions.push( options );
			} );
		} else if( instance.commander && _.isObject( instance.commander ) ) {
			if( instance.extensionType === "plugins" ) {
				this.setupCommandRoutes( instance );
			} else {
				this.setupCommandActions( instance );
			}
		}
	};

	// use the extension manager to load all the extensions
	ExtensionContainer.prototype.loadExtensions = function( config, commander ) {
		var self = this;
		extManager.checkDependencies( config.dependencies || [], function() {
			try {
				anvil.scheduler.mapped( {
					extensions: extManager.getExtensions,
					localExtensions: extManager.getLocalExtensions
				}, function() {
					var list = self.getExtensions();
					_.each( list, function( extension ) {
						try {
							self.initExtension( extension );
						} catch ( err ) {
							anvil.log.error( "Error initializing extension '" + extension.name + "': " + err + "\n" + err.stack );
							extManager.removePlugin( extension.name, function() {
								anvil.log.step( "Plugin '" + extension.name + "' cannot be loaded and has been disabled");
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
				anvil.log.error( "Fatal: attempt to initialize extensions was an abismal fail: " + err + "\n" + err.stack );
				anvil.raise( "all.stop", -1 );
			}
		} );
	};

	// this is going to hurt me more than it hurts you (hey, I had to write it to begin with...)
	ExtensionContainer.prototype.setupCommandActions = function ( instance ) {
		console.log( "Oh hai, I don't do things yet" );
	};

	// Look away, shield your eyes. For only sorrow lies before those who
	// read the contents...
	ExtensionContainer.prototype.setupCommandRoutes = function ( instance ) {
		var self = this,
			oldConfig = instance.configure,
			oldRun = instance.run,
			calls = {},
			keys;
		_.each( instance.commander, function( commandSpec, key ) {
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
		instance.configure = function( config, commander, done ) {
			var call = getCall( commander );
			if( call ) {
				this[ "__invoke__" ] = _.isString( call ) ? this[ call ] : call;
			}
			oldConfig( config, commander, done );
		};
		instance.run = function( done, activity ) {
			if( this[ "__invoke__" ] ) {
				this[ "__invoke__" ]( done, activity );
			} else {
				oldRun( done, activity );
			}
		};
		_.bindAll( instance );
	};

	return new ExtensionContainer();
};

module.exports = extensionContainerFactory;