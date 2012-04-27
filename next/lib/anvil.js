
var anvilFactory = function( _, scheduler, fs, log, compiler, combiner ) {

	var Anvil = function( ) {

		this.conventions = {
			defaultSiteBlock: {
				source: "src",
				style: "style",
				markup: "markup",
				output: {
					source: [ "lib", "site/js" ],
					style: [ "css", "site/css" ],
					markup: "site/"
				},
				spec: "spec",
				ext: "ext",
				lint: {},
				uglify: {},
				cssmin: {},
				hosts: {
					"/": "site"
				}
			},
			defaultLibBlock: {
				source: "src",
				output: "lib",
				spec: "spec",
				ext: "ext",
				lint: {},
				uglify: {},
				hosts: {
					"/": "site"
				}
			}
		};

		this.services = {};
		this.combiner = combiner;
		this.compiler = compiler;
		this.preprocessors = {};
		this.postprocessors = {};
		this.buildState = {};
		this.events = {};
		this.inProcess = false;

		_.bindAll( this );
	};

	Anvil.prototype.load = function() {
		var moduleSpecification;
		_.each( this.extensions, function( extension ) {
			moduleSpecification = extension.file || extension.module;
			require( moduleSpecification )( _, scheduler, fs, log, this );
		} );
	};

	Anvil.prototype.raise = function( eventName, data ) {
		var handlers = this.events[ eventName ];
		_.each( handlers, function( handler ) {
			try {
				handler.apply( arguments );
			} catch( error ) {
				// we don't need to do anything,
				// but there's no reason to blow up
				// just because a subscriber did
			}
		} );
	};

	Anvil.prototype.onConfiguration = function( config, stop ) {
		this.configuration = config;
		if( !stop ) {
			// create load pipeline


			// create the initialization pipeline


			// wire up services


			// create build pipeline


		}
	};

	Anvil.prototype.on = function( eventName, onEvent ) {
		var handlers = this.events[ eventName ] || [];
		handlers.push( onEvent );
	};

	return Anvil;
};

module.exports = anvilFactory;
