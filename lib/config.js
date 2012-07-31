/*
	anvil.js - an extensible build system
	version: 0.8.0
	author: Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright: 2011 - 2012
	license: Dual licensed 
			 MIT (http://www.opensource.org/licenses/mit-license) 
			 GPL (http://www.opensource.org/licenses/gpl-license)
*/
var configFactory = function( _, commander, path, anvil ) {

	var defaultConfig = {
		activityOrder: [
			"identify",
			"pull",
			"combine",
			"pre-process",
			"compile",
			"post-process",
			"push",
			"test"
		],
		working: "./.anvil/tmp",
		source: "./src",
		spec: "./spec",
		output: "./lib",
		log: {
			debug: false,
			"event": true,
			step: true,
			complete: true,
			warning: false,
			error: true
		}
	};

	anvil.config = defaultConfig;

	var Config = function() {
		_.bindAll( this );
		this.deepExtend();
		anvil.events.on( "commander.configured", this.processArguments );
		this.commands = {};
		this.args = [];
	};

	// Thanks to Jim Cowart for help with this approach
	// adapted from -> http://jsfiddle.net/ifandelse/TDwZy/
	Config.prototype.deepExtend = function() {
		var slice = Array.prototype.slice;
		if ( !_.deepExtend ) {
			var behavior = {
				"*": function( target, property, value ) {
					target[ property ] = value;
				},
				"object": function(target, property, value ) {
					target[ property ] = deepExtend( target[ property ] || {}, value );
				},
				"array": function( target, property, value ) {
					target[ property ] = _.filter(
											_.union( target[ property ], value ),
											function( x ) {
												return x;
											} );
				}
			},
			getType = function( value ) {
				if( _.isArray( value ) ) {
					return "array";
				} else if ( _.isRegExp( value ) ) {
					return "regex";
				} else if ( _.isDate( value ) ) {
					return "date";
				} else {
					return typeof value;
				}
			},
			getHandlerName = function( value ) {
				var type = getType( value );
				return behavior[ type ] ? type : "*";
			},
			deepExtend = function( target ) {
				_.each( slice.call( arguments, 1 ), function( source ) {
					_.each( source, function( value, property ) {
						behavior[ getHandlerName( value ) ]( target, property, value );
					});
				});
				return target;
			};

			_.mixin( {
				deepExtend: deepExtend
			} );
		}
	};

	Config.prototype.initialize = function( argList ) {
		var log = anvil.config.log;
		this.args = argList;

		if( _.any( argList, function( arg ) { return arg === "-q" || arg === "--quiet"; } ) ) {
			log.debug = false;
			log["event"] = false;
			log.warning = false;
		} else if ( _.any( argList, function( arg ) { return arg == "--verbose"; } ) ) {
			log.debug = true;
			log.warning = true;
		}

		commander
			.version("0.8.0")
			.option( "-b, --build [build file]", "Use a custom build file", "./build.json" )
			.option( "--write [build file]", "Create a new build file based on default config" )
			.option( "-q, --quiet", "Only print completion and error messages" )
			.option( "--verbose", "Include debug and warning messages in log" );
		anvil.onCommander( commander );
	};

	Config.prototype.getConfiguration = function( buildFile, onConfig ) {
		var self = this,
			calls = {
				user: function( done ) {
					self.loadPreferences(
						function( config ) {
							done( config );
						}
					);
				},
				local: function( done ) {
					self.loadConfig(
						buildFile,
						function( config ) {
							done( config );
						}
					);
				}
			};
		anvil.scheduler.mapped( calls, function( result ) {
			var config = _.deepExtend( defaultConfig, anvil.config, result.user, result.local );

			_.map( [ "working", "output", "source", "spec" ], function( property ) {
				config[ property ] = path.resolve( config[ property ] );
			} );

			if( config.working === config.output ||
				config.working === config.source ||
				config.source === config.output ) {
				anvil.log.error( "Source, working and output directories MUST be seperate directories." );
				anvil.events.raise( "all.stop", -1 );
			}

			onConfig( config );
		} );
	};

	Config.prototype.loadConfig = function( file, onComplete ) {
		file = path.resolve( file );
		if( anvil.fs.pathExists( file ) ) {
			anvil.fs.read( file, function( content ) {
				onComplete( JSON.parse( content ) );
			} );
		} else {
			onComplete( defaultConfig );
		}
	};

	Config.prototype.loadPreferences = function( onComplete ) {
		var userDefaults = {};
		if( anvil.fs.pathExists( "~/.anvil" ) ) {
			anvil.fs.read( "~/.anvil", function( content ) {
				userDefaults = JSON.parse( content );
				onComplete( userDefaults );
			} );
		} else {
			onComplete( userDefaults );
		}
	};

	Config.prototype.processArguments = function() {
		try {
			commander.parse( this.args );
		} catch ( err ) {
			anvil.log.error( "Error processing arguments (" + this.args + ") :" + err + "\n" + err.stack );
		}
		this.getConfiguration( commander.build, function( config ) {
			anvil.onConfig( config );
		} );
	};

	return new Config();
};

module.exports = configFactory;