var path = require( "path" );
var child_process = require( "child_process" );

var pluginInstallerFactory = function( _, anvil ) {
	
	var PluginInstaller = function() {
		_.bindAll( this );
		this.name = "pluginInstaller";
		this.commander = [
			[ "disable [value]", "Disable plugin" ],
			[ "enable [value]", "Enable plugin" ],
			[ "install [value]", "Install a plugin from npm" ],
			[ "list", "List available plugins" ],
			[ "uninstall [value]", "Uninstall plugin" ]
		];
		this.commands = [ "disable", "enable", "install", "list", "uninstall" ];
		this.pluginDir = path.resolve( __dirname, "../" );
	};

	PluginInstaller.prototype.configure = function( config, commander, done ) {
		var self = this,
			commands = _.chain( this.commands )
						.filter( function( arg ) { return commander[ arg ]; } )
						.map( function( arg ) {
							var value = commander[ arg ];
							return { command: arg, value: value };
						} )
						.value(),
			command = commands.length === 0 ? undefined : commands[ 0 ];
		if( command ) {
			this[ command.command ]( command.value, function() {
				anvil.events.raise( "all.stop", 0 );
			} );
		} else {
			this.checkDependencies( config.dependencies, done );
		}
	};

	PluginInstaller.prototype.checkDependencies = function( dependencies, done ) {
		anvil.log.step( "checking build dependencies " );
		var self = this;
		anvil.fs.getFiles( this.pluginDir, this.pluginDir, function( files, directories ) {
			var installers = _.map( dependencies, function( dependency ) {
				if( !_.any( directories, function( directory ) {
					return dependency === directory.replace( self.pluginDir ); } ) ) {
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

	PluginInstaller.prototype.getInstalled = function( done ) {
		var self = this,
			list = [],
			base = path.resolve( "./" );
		anvil.fs.getFiles( this.pluginDir, this.pluginDir, function( files, directories ) {
			_.each( directories, function( directory ) {
				if( directory !== base ) {
					list.push( directory.replace( self.pluginDir + "/", "" ) );
				}
			}, [ base ] );
			done( list );
		} );
	};

	PluginInstaller.prototype.disable = function( pluginName, done ) {
		anvil.pluginManager.removePlugin( pluginName, function( succeeded, err ) {
			if( succeeded && !err ) {
				anvil.log.complete( "Plugin '" + pluginName + "'' is disabled" );
			} else {
				anvil.log.error( "Disabling plugin '" + pluginName + "'' failed" );
			}
		} );
	};

	PluginInstaller.prototype.enable = function( pluginName, done ) {
		this.getInstalled( function( list ) {
			if( _.any( list, function( plugin ) { return plugin === pluginName; } ) ) {
				anvil.pluginManager.addPlugin( pluginName, function() {
					anvil.log.complete( "Plugin '" + pluginName + "' is enabled" );
					done();
				} );
			} else {
				anvil.log.error( "Can't enable plugin '" + pluginName + "'. It is not installed." );
				done();
			}
		} );
		
	};

	PluginInstaller.prototype.install = function( pluginName, done ) {
		try {
		var currentPath = process.cwd(),
			linkPath = anvil.fs.buildPath( [ currentPath, "plugins", pluginName ] ),
			installPath = anvil.fs.buildPath( [ currentPath, "node_modules", pluginName ] ),
			child = child_process.spawn( "npm", [ "install", pluginName ], { cwd: currentPath } );
		anvil.log.step( "Installing plugin: " + pluginName );
		child.on( "exit", function( code ) {
			if( code === 0 ) {
				anvil.log.complete( "Installation of " + pluginName + " completed successfully." );
				anvil.fs.link( installPath, linkPath );
				anvil.pluginManager.addPlugin( pluginName, done );
			} else {
				anvil.log.error( "Installation of " + pluginName + " has failed" );
				done( { plugin: pluginName, code: code } );
			}
		} );
		} catch ( err ) { console.log( err ); }
	};

	PluginInstaller.prototype.list = function( ignore, done ) {
		var self = this;
		anvil.log.complete( "Plugin list: " );
		this.getInstalled( function( plugins ) {
			_.each( plugins, function( plugin ) {
				anvil.log.event( plugin );
			} );
			done();
		} );
	};

	PluginInstaller.prototype.uninstall = function( pluginName, done ) {
		anvil.log.step( "Uninstalling plugin: " + pluginName );
		var currentPath = process.cwd(),
			linkPath = anvil.fs.buildPath( [ currentPath, "plugins", pluginName ] ),
			installPath = anvil.fs.buildPath( [ currentPath, "node_modules", pluginName ] ),
			child = child_process.spawn( "npm", [ "uninstall", pluginName ], { cwd: currentPath } );
		child.on( "exit", function( code ) {
			if( code === 0 ) {
				anvil.log.complete( "Uninstallation of " + pluginName + " completed successfully." );
				anvil.fs["delete"]( linkPath );
				anvil.pluginManager.removePlugin( pluginName, done );
			} else {
				anvil.log.error( "Uninstallation of " + pluginName + " has failed" );
				done( { plugin: pluginName, code: code } );
			}
		} );
	};

	return new PluginInstaller();
};

module.exports = pluginInstallerFactory;