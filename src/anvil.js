var anvilFactory = function( _, postal, locators, scheduler, fs, log) {
	
	var Anvil = function() {
		_.bindAll( this );
		this.events = {};
		this.plugins = {};
		this.on( "all.stop", function( exitCode ) {
			process.exit( exitCode );
		} );
		this.on( "config", this.onConfig );
		this.on( "plugin.loaded", this.onPlugin );
		this.initPlugins();
	};

	Anvil.prototype.configurePlugin = function( plugin ) {
		var handle = this.wireHandler;
		handle( "config", plugin.onConfig );
		handle( "preconfig", plugin.preConfig );
		handle( "postconfig", plugin.postConfig );
		handle( "build.done", plugin.buildSucceeded );
		handle( "build.failed", plugin.buildFailed );
		handle( "build.start", plugin.startBuild );
		handle( "build.stop", plugin.stopBuild );
	};

	Anvil.prototype.initPlugins = function() {
		var self = this;
		_.each( locators, function( locator ) {
			locator.loadPlugins();
			locator.configurePlugins( self.configurePlugin );
		} );
	};

	Anvil.prototype.on = function( eventName, onEvent ) {
		var handlers;
		if( ( handlers = this.events[ eventName ] ) ) {
			handlers.push( onEvent );
		} else {
			this.events[ eventName ] = [ onEvent ];
		}
	};

	Anvil.prototype.onConfig = function( config ) {
		this.config = config;
	};

	Anvil.prototype.onPlugin = function( plugin ) {
		this.plugins[ plugin.name ] = plugin.instance;
	};

	Anvil.prototype.raise = function( eventName, data ) {
		var handlers = this.events[ eventName ];
		_.each( handlers, function( handler ) {
			try {
				handler.apply( data );
			} catch( error ) {
				// we don't need to do anything,
				// but there's no reason to blow up
				// just because a subscriber did
			}
		} );
	};

	Anvil.prototype.publish = function( channel, topic, message ) {
		postal
			.channel( { channel: channel, topic: topic } )
			.publish( message );
	};

	Anvil.prototype.start = function( argList ) {
		
	};

	Anvil.prototype.subscribe = function( channel, topic, callback ) {
		postal
			.channel( { channel: channel, topic: topic } )
			.subscribe( function() {
				try {
					callback.apply( this, arguments );
				} catch ( error ) {
					// we don't need to do anything,
					// but there's no reason to blow up
					// just because a subscriber did
				}
			} );
	};

	Anvil.prototype.wireHandler = function( topic, handler ) {
		if( topic ) {
			this.on( topic, handler );
		}
	};

	return new Anvil();
};

module.exports = anvilFactory;