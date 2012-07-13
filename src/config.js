var configFactory = function( _, commander, path, anvil ) {

	var defaultConfig = {
		activityOrder: [
			"identify",
			"pull",
			"combine",
			"transform",
			"compile",
			"push"
		]
	};

	var Config = function() {
		_.bindAll( this );
		anvil.events.on( "commander.configured", this.processArguments );
		this.commands = {};
	};

	Config.prototype.initialize = function( argList ) {
		this.args = argList;
		commander
			.version("0.8.0")
			.option( "-b, --build [build file]", "Use a custom build file", "./build.json" )
			.option( "-q, --quiet", "Only print completion and error messages" );
		anvil.onCommander( commander );
	};

	Config.prototype.getConfiguration = function( buildFile, onConfig ) {
		console.log( "loading configuration" );
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
			onConfig( _.extend( defaultConfig, result.user, result.local, anvil.config ) );
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
			console.log( "Error processing arguments: " + Err );
		}
		this.getConfiguration( commander.build, function( config ) {
			anvil.onConfig( config );
		} );
	};

	return new Config();
};

module.exports = configFactory;