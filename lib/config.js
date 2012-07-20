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
		anvil.events.on( "commander.configured", this.processArguments );
		this.commands = {};
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
			.option( "--verbose", "Include debug and warning messages in log" )
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
			var config = _.extend( defaultConfig, anvil.config, result.user, result.local );

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
		console.log( "tryin'da find " + file );
		if( anvil.fs.pathExists( file ) ) {
			anvil.fs.read( file, function( content ) {
				console.log( "Got -> " + content );
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