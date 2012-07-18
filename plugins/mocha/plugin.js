var Mocha = require( "mocha" );

var mochaRunnerFactory = function( _, anvil ) {

	var MochaRunner = function() {
		_.bindAll( this );
		this.name = "mocha";
		this.dependencies = [];
		this.commander = [
			[ "--mocha", "runs mocha tests after each build" ]
		];
		this.config = {
			growl: false,
			ignoreLeaks: true,
			reporter: "spec",
			ui: "bdd",
			colors: true,
			specs: "./spec"
		};
	};

	MochaRunner.prototype.configure = function( config, command, done ) {
		var mochaConfig = config.mocha;
		this.reporterName = mochaConfig.reporter.toLowerCase().replace( /[a-z]/, function( letter ) { return letter.toUpperCase(); } );
		this.ui = mochaConfig.ui.toLowerCase();
		anvil.events.on( "build.done", this.test );
		done();
	};

	MochaRunner.prototype.test = function() {
		try {
			var self = this,
				config = anvil.config.mocha,
				mocha = new Mocha( {
					colors: config.colors,
					growl: config.growl,
					ignoreLeaks: config.ignoreLeaks,
					slow: config.slow,
					timeout: config.timeout,
					ui: this.ui 
				} );
			mocha.reporter( this.reporterName );
			_.each( anvil.project.specs, function( file ) {
				console.log( "adding spec " + file.name );
				var fullPath = file.fullPath;
				delete require.cache[ fullPath ];
				mocha.addFile( fullPath );
			} );
			mocha.run( function() {
				anvil.events.raise( "tests.complete" );
				anvil.log.complete( "tests complete" );
			} );
		} catch ( err ) {
			console.log( "mocha err: " + err );
		}
	};

	return new MochaRunner();
};

module.exports = mochaRunnerFactory;