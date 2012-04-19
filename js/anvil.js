
var anvilFactory = function( _, Scheduler, FSProvider, Log ) {

	var Anvil = function( ) {

		this.conventions = {
			defaultSiteBlock: {

			},
			defaultLibBlock: {

			}
		};

		
		this.services = {};
		this.combiner = {};
		this.compilers = {};
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
			require( moduleSpecification )( Scheduler, )
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


			// wire up extensions


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
