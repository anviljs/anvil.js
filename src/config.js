var configFactory = function( _, commander, path, anvil ) {

	var defaultConfig = {
		activityOrder: [
			"identify",
			"pull",
			"combine",
			"pre-process",
			"compile",
			"post-process",
			"push"
		],
		working: path.resolve( "./.anvil/tmp" ),
		source: path.resolve( "./src" ),
		spec: path.resolve( "./spec" ),
		output: [ path.resolve( "./build" ) ],
		log: {
			debug: true,
			"event": true,
			step: true,
			complete: true,
			warning: true,
			error: true
		}
	};

	anvil.config = defaultConfig;

	var Config = function() {
		_.bindAll( this );
		anvil.events.on( "commander.configured", this.processArguments );
		this.commands = {};
	};

	Config.prototype.initialize = function( argList ) {
		this.args = argList;

		if( _.any( argList, function( arg ) { return arg === "-q" || arg === "--quiet"; } ) ) {
			var log = anvil.config.log;
			log.debug = false;
			log["event"] = false;
			log.warning = false;
		}

		commander
			.version("0.8.0")
			.option( "-b, --build [build file]", "Use a custom build file", "./build.json" )
			.option( "-q, --quiet", "Only print completion and error messages" );
		anvil.onCommander( commander );
	};

	Config.prototype.getConfiguration = function( buildFile, onConfig ) {
		var self = this,
			calls = {
				user: function( done ) {
					self.loadPreferences(
						function( config ) { done( config ); }
					);
				},
				local: function( done ) {
					self.loadConfig(
						buildFile,
						function( config ) { done( config ); }
					);
				}
			};
		anvil.scheduler.mapped( calls, function( result ) {
			onConfig( _.extend( defaultConfig, anvil.config, result.user, result.local ) );
		} );
	};

	Config.prototype.loadConfig = function( file, onComplete ) {
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
		} catch ( Err ) {
			anvil.log.error( "Error processing arguments: " + Err );
		}
		this.getConfiguration( commander.build, function( config ) {
			anvil.onConfig( config );
		} );
	};

	return new Config();
};

module.exports = configFactory;