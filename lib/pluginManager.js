/*
	anvil.js - an extensible build system
	version:	0.8.3
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var path = require("path");
var fs = require( "fs" );
var npm = require( "npm" );
var child_process = require( "child_process" );

var pluginManagerFactory = function( _, anvil, testing ) {

	var globalDataPath = path.resolve( __dirname, "../plugins.json" ),
		localDataPath = path.resolve( "./plugins.json" ),
		dataPath = globalDataPath,
		installPath = path.join( __dirname, "../plugins/" );
	installPath = testing ? path.resolve( "./spec/plugins/" ) : installPath;
	
	var PluginManager = function() {
		_.bindAll( this );
		this.installPath = installPath;
		anvil.pluginManager = this;
	};

	PluginManager.prototype.getPlugins = function( done ) {
		var self =this,
			list = [];
		anvil.log.step( "loading plugins" );
		
		anvil.fs.read( dataPath, function( json, err ) {
			var plugins = JSON.parse( json ),
				removals = [];
			_.each( plugins.list, function( plugin ) {
				var pluginPath = anvil.fs.buildPath( [ installPath, plugin ] );
				self.loadPlugin( plugin, pluginPath, list, removals );
			} );
			if( removals.length > 0 ) {
				_.defer( function() {
					anvil.scheduler.pipeline( undefined, removals, function() {
						anvil.events.raise( "all.stop", -1 );
					} );
				} );
			}
			done( list );
		} );
	};

	PluginManager.prototype.loadPlugin = function( plugin, pluginPath, list, removals ) {
		removals = removals || [];
		try {
			var instance = require( path.resolve( pluginPath ) )( _, anvil ),
				metadata = { instance: instance, name: plugin };
			if( list ) {
				list.push( metadata );
			}
			anvil.events.raise( "plugin.loaded", instance );
			anvil.log.debug( "loaded plugin " + plugin );
		} catch ( err ) {
			anvil.log.error( "Error loading plugin '" + plugin + "' : " + err );
			removals.push( function( done ) { self.removePlugin( plugin, function() {
					anvil.log.step( "Plugin '" + plugin + "' cannot be loaded and has been disabled");
				} );
			} );
		}
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

	PluginManager.prototype.checkDependencies = function( dependencies, done ) {
		anvil.log.step( "checking for " + dependencies.length + " build dependencies " );
		var self = this;
		this.getInstalled( function( list ) {
			var installers = _.map( dependencies, function( dependency ) {
				if( !_.contains( list, dependency ) ) {
					return function( done ) {
						self.install( dependency, function( result ) {
							if( !result ) {
								done();
							} else {
								anvil.log.error( "Fatal: Could not install missing build dependency " + dependency );
								anvil.events.raise( "all.stop", -1 );
							}
						} );
					};
				} else {
					return function( done ) { done(); };
				}
			} );
			if( installers.length > 0 ) {
				anvil.scheduler.pipeline( undefined, installers, done );
			} else {
				done();
			}
		} );
	};

	PluginManager.prototype.disable = function( pluginName, done ) {
		this.removePlugin( pluginName, function( succeeded, err ) {
			if( succeeded && !err ) {
				anvil.log.complete( "Plugin '" + pluginName + "' is disabled" );
			} else {
				anvil.log.error( "Disabling plugin '" + pluginName + "' failed" );
			}
		} );
	};

	PluginManager.prototype.enable = function( pluginName, done ) {
		var self = this;
		this.getInstalled( function( list ) {
			if( _.contains( list, pluginName ) ) {
				self.addPlugin( pluginName, function() {
					anvil.log.complete( "Plugin '" + pluginName + "' is enabled" );
					done();
				} );
			} else {
				anvil.log.error( "Can't enable plugin '" + pluginName + "'. It is not installed." );
				done();
			}
		} );
	};

	PluginManager.prototype.getInstalled = function( done ) {
		var self = this,
			list = [],
			base = path.resolve( "./" );
		anvil.fs.getFiles( installPath, installPath, function( files, directories ) {
			_.each( directories, function( directory ) {
				if( directory !== base ) {
					list.push( directory.replace( installPath, "" ) );
				}
			}, [ base ], 1 );
			done( list );
		} );
	};

	PluginManager.prototype.getPluginName = function( pluginName ) {
		var pluginPath = path.resolve( pluginName );
		if( anvil.fs.pathExists( pluginPath ) ) {
			return require( path.join( pluginPath, 'package.json' ) ).name;
		}
		return pluginName;
	};

	PluginManager.prototype.install = function( pluginName, done ) {
		var self = this,
			currentPath = path.resolve( installPath, "../" ),
			realPluginName = this.getPluginName( pluginName ),
			linkPath = anvil.fs.buildPath( [ installPath, realPluginName ] ),
			pluginPath = anvil.fs.buildPath( [ currentPath, "node_modules", realPluginName ] );

		anvil.log.step( "Installing plugin: " + realPluginName );
		npm.load( npm.config, function( err, npm ) {
			try {
				npm.localPrefix = currentPath;
				npm.config.set( "loglevel", "silent" );
				npm.commands.install( [ pluginName ], function( err, data ) {
					if( !err ) {
						anvil.log.complete( "Installation of '" + realPluginName + "' completed successfully." );
						anvil.fs.pathExists( linkPath, function( exists ) {
							if( !exists ) {
								anvil.fs.link( pluginPath, linkPath, function( err ) {
									if( err ) {
										anvil.log.error( "Could not link plugin path! " + err.stack );
									}
									self.addPlugin( realPluginName, function() {
										var packagePath = anvil.fs.buildPath( [ realPluginName, "package.json" ] ),
											dependencies = require( packagePath ).requiredPlugins;
										if( dependencies && dependencies.length > 0 ) {
											self.getInstalled( function( installed ) {
												var missing = _.difference( dependencies, installed );
												anvil.scheduler.parallel( missing, self.install, function() { done(); } );
											} );
										} else {
											done();
										}
									} );
								} );
							} else {
								done();
							}
						} );
					} else {
						anvil.log.error( "Installation of '" + realPluginName + "' has failed with error: \n" + err.stack );
						done( { plugin: realPluginName } );
					}
				} );
				
			} catch ( err ) {
				anvil.log.error( "Installation of '" + realPluginName + "' has failed with error: \n" + err.stack );
				done( { plugin: realPluginName } );
			}
		} );
	};

	PluginManager.prototype.list = function( ignore, done ) {
		var self = this;
		anvil.log.complete( "Plugin list: " );
		this.getInstalled( function( plugins ) {
			_.each( plugins, function( plugin ) {
				anvil.log.event( plugin );
			} );
			done();
		} );
	};

	PluginManager.prototype.uninstall = function( pluginName, done ) {
		anvil.log.step( "Uninstalling plugin: " + pluginName );
		var self = this,
			currentPath = path.resolve( installPath, "../" ),
			linkPath = anvil.fs.buildPath( [ installPath, pluginName ] ),
			pluginPath = anvil.fs.buildPath( [ currentPath, "node_modules", pluginName ] );
		npm.load( npm.config, function( err, npm ) {
			try {
				npm.localPrefix = currentPath;
				npm.config.set( "loglevel", "silent" );
				npm.commands.uninstall( [ pluginName ], function( err, data ) {
					if( !err ) {
						anvil.log.complete( "Uninstallation of '" + pluginName + "' completed successfully." );
						anvil.fs["delete"]( linkPath, function( err ) {
							if( err ) {
								anvil.log.error( "Link at '" + linkPath + "' could not be deleted: " + err );
							}
						} );
						self.removePlugin( pluginName, done );
					} else {
						anvil.log.error( "Uninstallation of '" + pluginName + "' has failed: " + err );
						done( { plugin: pluginName } );
					}
				} );
			} catch ( err ) {
				anvil.log.error( "Uninstallation of '" + pluginName + "' has failed: " + err );
				done( { plugin: pluginName } );
			}
		} );
	};

	return new PluginManager();
};

module.exports = pluginManagerFactory;