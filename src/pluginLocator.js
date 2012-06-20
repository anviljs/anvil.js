var pluginLocatorFactory = function( _, plugins, anvil, scheduler, fs, log ) {

	var PluginLocator = function() {
		this.instances = {};
	};

	PluginLocator.prototype.configurePlugins = function( configure ) {
		_.each( this.instance, function( plugin ) {
			configure( plugin );
		} );
	};

	PluginLocator.prototype.loadPlugins = function() {
		var self = this;
		_.each( this.getPluginList(), function( plugin ) {
			console.log( "About to require " + plugin.path );
			self.instances[ plugin.name ] = require( plugin.path )( _, anvil, scheduler, fs, log );
		} );	
	};

	PluginLocator.prototype.getPluginList = function() {
		return _.map( plugins.getPlugins(), function( pluginName ) {
			return { name: pluginName, path: fs.buildPath( [ plugins.installPath, pluginName ] ) };
		} );
	};

	return new PluginLocator();
};

module.exports = pluginLocatorFactory;