/*
	anvil.js - an extensible build system
	version:	0.9.2
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
			[ "-q, --quiet", "Only print completion and error messages" ],
			[ "--host", "Activate anvil's HTTP and process hosting" ],
			[ "--browser", "opens tab in your default browser" ],
			[ "--verbose", "Include debug and warning messages in log" ],
			[ "--write [build file]", "Create a new build file based on default config" ]
		];
		anvil.on( "commander", this.loadExtensions );
		anvil.on( "config", this.configureExtensions );
	};

	// call configure on all extensions
	ExtensionContainer.prototype.configureExtensions = function( args ) {
		var done = args.callback,
			extensions = this.getExtensions(),
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
				anvil.log.step( "Error configuring extension '" + extension.name + "' : " + err + "\n" + err.stack );
				extManager.removeExtension( extension.name, function() {
					anvil.log.error( "Extension '" + extension.name + "' cannot be configured and has been disabled");
					anvil.stop( -1 );
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
				this.setupCommandActions( instance, instance.commander, anvil.commander, 2 );
			}
		}
	};

	// use the extension manager to load all the extensions
	ExtensionContainer.prototype.loadExtensions = function( args ) {
		var self = this,
			config = args.config,
			commander = args.commander;
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
							extManager.removeExtension( extension.name, function() {
								anvil.log.step( "Plugin '" + extension.name + "' cannot be loaded and has been disabled");
								anvil.stop( -1 );
							} );
						}
					} );
					var optionList = self.commandOptions.sort();
					_.each( optionList, function( options ) {
						if( anvil.commander ) {
							anvil.commander.option.apply( anvil.commander, options );
						}
					} );
					anvil.emit( "commander.configured" );
				} );
			} catch ( err ) {
				anvil.log.error( "Fatal: attempt to initialize extensions was an abismal fail: " + err + "\n" + err.stack );
				anvil.stop( -1 );
			}
		} );
	};

	// this is going to hurt me more than it hurts you (hey, I had to write it to begin with...)
	ExtensionContainer.prototype.setupCommandActions = function ( instance, spec, commander, consumed ) {
		var self = this;

		_.each( spec, function( commandSpec, key ) {
			if( key === "options" ) {
				_.each( commandSpec, function( options ) {
					self.commandOptions.push( options );
				} );
			} else {
				var keys = key.split(",");
				_.each( keys, function( k ) {
					k = k.trim();
					self.wireupCommandSpec( k, commandSpec, instance, commander, consumed );
				} );
			}
 		} );
	};

	// to the pain ...
	ExtensionContainer.prototype.wireupCommandSpec = function( key, commandSpec, instance, commander, consumed ) {
		var self = this,
			actionName = commandSpec.action,
			call = instance[ actionName ],
			cmd = commander
					.command( key )
					.description( commandSpec.description );

		if( commandSpec.action ) {
			cmd = cmd.action( function() {
				var originalArgs = anvil.commander.rawArgs,
					expectedCount = cmd._args.length + 1,
					currentArgs = originalArgs.slice( consumed + 1, consumed + expectedCount ),
					remainingArgs = originalArgs.slice( consumed + expectedCount ),
					done = function() {
						if( remainingArgs.length > 0 ) {
							cmd.parseArgs( remainingArgs );
						}
					},
					args = currentArgs.concat( [ cmd, done ] );
				if( key[0] === "*" ) {
					args.unshift( arguments['0'] );
				}
				while( args.length <= expectedCount ) {
					args.unshift( undefined );
				}
				anvil.emit( "command.activated", { callback: function() {
					instance[ actionName ].apply( instance, args );
				} } );
			} );
		}
		if( commandSpec.options ) {
			_.each( commandSpec.options, function( options ) {
				cmd = cmd.option.apply( cmd, options );
			} );
		}
		if( commandSpec.commands ) {
			self.setupCommandActions( instance, commandSpec.commands, cmd, consumed + cmd._args.length + 1 );
		}
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