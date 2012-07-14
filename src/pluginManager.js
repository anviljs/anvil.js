var path = require("path");
var fs = require("fs");

var pluginManagerFactory = function( _, anvil, testing ) {


	var dataPath = testing ? path.resolve( "./spec/plugins.json" ) : path.resolve( "./plugins.json" );
	var plugins = require( dataPath );
	var installPath = path.join(path.dirname(fs.realpathSync(__filename, "./")), "../plugins/");
	installPath = testing ? path.resolve( "./spec/plugins/" ) : installPath;

	var PluginManager = function() {
		this.installPath = installPath;
	};

	PluginManager.prototype.getPlugins = function() {
		var list = [];
		_.each( plugins.list, function( plugin ) {
			var pluginPath = anvil.fs.buildPath( [ installPath, plugin ] ),
				instance = require( path.resolve( pluginPath ) )( _, anvil ),
				metadata = { instance: instance, name: plugin };
			list.push( metadata );
			anvil.events.raise( "plugin.loaded", instance );
		} );
		return list;
	};

	PluginManager.prototype.addPlugin = function( plugin, onComplete ) {
		if( ! _.any( plugins.list, function( x ) { return x.name === plugin.name; } ) ) {
			plugins.list.push( plugin );
			var json = JSON.stringify( plugins );
			fs.writeFile( dataPath, json, function( err ) {
				onComplete( err );
			} );
		} else {
			onComplete();
		}
	};

	PluginManager.prototype.removePlugin = function( plugin, onComplete ) {
		if( _.any( plugins.list, function( x ) { return x.name === plugin.name; } ) ) {
			plugins.list = _.filter( plugins.list, function( x ) { return x.name != plugin.name; } );
			var json = JSON.stringify( plugins );
			fs.writeFile( dataPath, json, function( err ) {
				onComplete( err );
			} );
		} else {
			onComplete();
		}
	};

	return new PluginManager();
};

module.exports = pluginManagerFactory;