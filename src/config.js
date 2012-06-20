var configFactory = function( _, commander, path, anvil, fs, scheduler, log ) {

	var Config = function() {
		anvil.on( "commander.configured", this.processArguments );
		this.commands = {};
	};

	Config.prototype.initialize = function( argList, onConfig ) {
		this.args = argList;
		commander
			.version("0.8.0")
			.option( "-b, --build [build file]", "Use a custom build file", "./build.json" )
			.option( "-q, --quiet", "Only print completion and error messages" );
		anvil.raise( "commander.configure", commander );
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
		scheduler.mapped( calls, function( result ) {
			onConfig( _.extend( result.user, result.local ) );
		} );
	};

	Config.prototype.loadConfig = function( file, onComplete ) {
		if( fs.pathExists( file ) ) {
			fs.read( file, function( content ) {
				onComplete( JSON.parse( content ) );
			} );
		} else {
			log.error( "Could lot load the build file " + file + " because it does not exist." );
			anvil.raise( "all.stop", -1 );
		}
	};

	Config.prototype.loadPreferences = function( onComplete ) {
		var userDefaults = {};
		if( fs.pathExists( "~/.anvil" ) ) {
			fs.read( "~/.anvil", function( content ) {
				userDefaults = JSON.parse( content );
				onComplete( userDefaults );
			} );
		} else {
			onComplete( userDefaults );
		}
	};

	Config.prototype.processArguments = function() {
		commander.parse( this.args );
		getConfiguration( commander.build, function( config ) {
			anvil.onConfig( config );
		} );
	};

	return new Config();
};

module.exports = configFactory;