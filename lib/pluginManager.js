/*
	anvil.js - an extensible build system
	version: 0.8.0
	author: Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright: 2011 - 2012
	license: Dual licensed 
			 MIT (http://www.opensource.org/licenses/mit-license) 
			 GPL (http://www.opensource.org/licenses/gpl-license)
*/
var path = require("path");
var fs = require( "fs" );

var pluginManagerFactory = function( _, anvil, testing ) {


	var dataPath = path.resolve( __dirname, "../plugins.json" );
	var installPath = path.join( __dirname, "../plugins/" );
	installPath = testing ? path.resolve( "./spec/plugins/" ) : installPath;

	var PluginManager = function() {
		_.bindAll( this );
		this.installPath = installPath;
		anvil.pluginManager = this;
	};

	PluginManager.prototype.getPlugins = function( done ) {
		var self =this,
			list = [];
		anvil.fs.read( dataPath, function( json, err ) {
			var plugins = JSON.parse( json );
			_.each( plugins.list, function( plugin ) {
				try {
					var pluginPath = anvil.fs.buildPath( [ installPath, plugin ] ),
						instance = require( path.resolve( pluginPath ) )( _, anvil ),
						metadata = { instance: instance, name: plugin };
					list.push( metadata );
					anvil.events.raise( "plugin.loaded", instance );
					anvil.log.debug( "loaded plugin " + plugin );
				} catch ( err ) {
					anvil.log.error( "Error loading plugin '" + plugin + "' : " + err );
					self.removePlugin( plugin, function() {
						anvil.log.step( "Plugin '" + plugin + "' cannot be loaded and has been disabled");
						anvil.events.raise( "all.stop", -1 );
					} );
				}
			} );
			done( list );
		} );
	};

	PluginManager.prototype.addPlugin = function( plugin, onComplete ) {
		anvil.fs.read( dataPath, function( json ) {
			var plugins = JSON.parse( json );
			if( ! _.any( plugins.list, function( name ) { return name === plugin; } ) ) {
				plugins.list.push( plugin );
				json = JSON.stringify( plugins, null, 4 );
				anvil.fs.write( dataPath, json, function( err ) {
					onComplete( err );
				} );
			} else {
				onComplete();
			}
		} );
	};

	PluginManager.prototype.removePlugin = function( plugin, onComplete ) {
		anvil.fs.read( dataPath, function( json ) {
			var plugins = JSON.parse( json );
			if( _.any( plugins.list, function( name ) { return name === plugin; } ) ) {
				plugins.list = _.reject( plugins.list, function( name ) { return name === plugin; } );
				json = JSON.stringify( plugins, null, 4 );
				anvil.fs.write( dataPath, json, function( err ) {
					onComplete( true, err );
				} );
			} else {
				onComplete( false );
			}
		} );
	};

	return new PluginManager();
};

module.exports = pluginManagerFactory;