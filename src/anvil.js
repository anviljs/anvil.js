var anvilFactory = function( _, scheduler, fs, log, events, bus ) {
	
	var Anvil = function() {
		_.bindAll( this );
		this.plugins = {};
		this.pluginCount = 0;
		this.configuredPlugins = 0;
		this.config = {};
		this.bus = bus;
		this.events = events;
		this.fs = fs;
		this.log = log;
		this.scheduler = scheduler;

		events.on( "all.stop", function( exitCode ) {
			process.exit( exitCode );
		} );
	};

	Anvil.prototype.onConfig = function( config ) {
		this.config = config;
		events.raise( "config", this.onPluginsConfigured );
	};

	Anvil.prototype.onCommander = function( commander ) {
		this.commander = commander;
		events.raise( "commander" );
	};

	Anvil.prototype.onPluginsConfigured = function() {
		this.pluginConfigurationCompleted = true;
		events.raise( "plugins.configured" );
	};

	return new Anvil();
};

module.exports = anvilFactory;