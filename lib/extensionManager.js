/*
	anvil.js - an extensible build system
	version:	0.9.0-RC2
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

var extensionManagerFactory = function( _, anvil ) {

	var installPath = anvil.fs.buildPath( [ "~/.anvilextensions" ] ),
		localInstallPath = anvil.fs.buildPath( "./node_modules" );
		extensionInstallPath = anvil.fs.buildPath( [ "~/.anvilextensions/node_modules" ] ),
		dataPath = anvil.fs.buildPath( [ installPath, "extensions.json" ] ),
		builtIn = { list: [
			"anvil.combiner",
			"anvil.concat",
			"anvil.headers",
			"anvil.identify",
			"anvil.output",
			"anvil.extension",
			"anvil.scaffold.cli",
			"anvil.scaffolding",
			"anvil.task.cli",
			"anvil.token",
			"anvil.transform",
			"anvil.workset"
		] };

	var ExtensionManager = function() {
		_.bindAll( this );
		this.installPath = extensionInstallPath;
		anvil.extensionManager = this;
		anvil.fs.ensurePath( extensionInstallPath, function() {
			if( !anvil.fs.pathExists( dataPath ) ) {
				anvil.fs.write( dataPath, JSON.stringify( builtIn ) );
			}
		} );
	};

	// Add an extension to the master list found under ~/.anvilextensions/extensions.json
	ExtensionManager.prototype.addExtension = function( packageName, onComplete ) {
		anvil.fs.read( dataPath, function( json ) {
			var extensions = JSON.safeParse( json );
			if( ! _.any( extensions.list, function( name ) { return name === packageName; } ) ) {
				extensions.list.push( packageName );
				json = JSON.stringify( extensions, null, 4 );
				anvil.fs.write( dataPath, json, function( err ) {
					onComplete( err );
				} );
			} else {
				onComplete();
			}
		} );
	};

	// Checks the build file to see if there are extensions required for the build
	// if there are any missing extensions, anvil will install them via npm before
	// allowing the start-up process to continue
	ExtensionManager.prototype.checkDependencies = function( dependencies, done ) {
		anvil.log.debug( "checking for " + dependencies.length + " build dependencies " );
		var self = this;
		this.getInstalled( extensionInstallPath, function( list ) {
			var installers = _.map( dependencies, function( dependency ) {
				if( !_.contains( list, dependency ) ) {
					return function( done ) {
						self.install( dependency, function( result ) {
							if( !result ) {
								done();
							} else {
								anvil.log.error( "Fatal: Could not install missing build dependency " + dependency );
								anvil.raise( "all.stop", -1 );
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

	// disables an extension by removing its name from the global list @ ~/.anvilextensions/extensions.json
	ExtensionManager.prototype.disable = function( extensionName, done ) {
		this.removeExtension( extensionName, function( succeeded, err ) {
			if( succeeded && !err ) {
				anvil.log.complete( "Extension '" + extensionName + "' is disabled" );
			} else {
				anvil.log.error( "Disabling extension '" + extensionName + "' failed" );
			}
		} );
	};

	// adds an installed extension back to the global list @ ~/.anvilextensions/extensions.json
	ExtensionManager.prototype.enable = function( extensionName, done ) {
		var self = this;
		this.getInstalled( extensionInstallPath, function( list ) {
			if( _.contains( list, extensionName ) ) {
				self.addExtension( extensionName, function() {
					anvil.log.complete( "Extension '" + extensionName + "' is enabled" );
					done();
				} );
			} else {
				anvil.log.error( "Can't enable extension '" + extensionName + "'. It is not installed." );
				done();
			}
		} );
	};

	// retrieves the list of enabled extensions from the global list @ ~/.anvilextensions/extensions.json
	ExtensionManager.prototype.getEnabledExtensions = function( done ) {
		var self = this;
		anvil.fs.read( dataPath, function( json, err ) {
			var list = [];
			if(! err ) {
				try {
					list = JSON.safeParse( json ).list;
					done( list );
				} catch ( error ) {
					anvil.log.error( "~/.anvilextensions/extensions.json was corrupted and will be re-created. This will re-enable all installed extensions." );
					self.getInstalled( extensionInstallPath, function( list ) {
						anvil.fs.write( dataPath, JSON.stringify( { list: list }, null, 4 ), function() {
							done( list );
						} );
					} );
				}
			} else {
				done( [] );
			}
		} );
	};

	// gets the list of all installed extensions from the path provided
	ExtensionManager.prototype.getInstalled = function( extPath, done ) {
		var self = this,
			list = [];
		
		if( anvil.fs.pathExists( extPath ) ) {
			anvil.fs.getFiles( extPath, extPath, function( files, directories ) {
				_.each( directories, function( directory ) {
					if( directory !== extPath ) {
						list.push( directory.replace( extPath, "" ).replace( path.sep, "" ) );
					}
				}, [ extPath ], 1 );
				done( list );
			} );
		} else {
			done( list );
		}
	};

	// calls loadExtension for all enabled and local extensions returned from
	// getExtensionList
	ExtensionManager.prototype.getExtensions = function( done ) {
		var self =this,
			list = [];
		anvil.log.debug( "loading extensions" );
		
		this.getExtensionList( function( extensions ) {
			var removals = [];
			_.each( extensions, function( extension ) {
				var extensionPath = self.getExtensionPath( extension );
				self.loadExtension( extension, extensionPath, list, removals );
			} );
			if( removals.length > 0 ) {
				_.defer( function() {
					anvil.scheduler.pipeline( undefined, removals, function() {
						anvil.raise( "all.stop", -1 );
					} );
				} );
			}
			done();
		} );
	};

	// gets a list of enabled extensions first from ~/.anvilextensions/extensions.json
	// extensions can be excluded from a build or a build can exclusively opt-in to specific extensions
	ExtensionManager.prototype.getExtensionList = function( done ) {
		var self = this;
		this.getEnabledExtensions( function( list ) {
			var extensionOptions = anvil.loadedConfig ? anvil.loadedConfig.extensions : {};
			if( extensionOptions ) {
				if( extensionOptions.local ) {
					list = _.union( list, extensionOptions.local );
				}
				if( extensionOptions.include ) {
					done( extensionOptions.include );
				} else {
					done( _.difference( list, extensionOptions.exclude || [] ) );
				}
			} else {
				done( list );
			}
		} );
	};

	// gets the name of the extension from it's package json file
	ExtensionManager.prototype.getExtensionName = function( extensionName ) {
		var extensionPath = path.resolve( extensionName );
		if( anvil.fs.pathExists( extensionPath ) ) {
			return require( path.join( extensionPath, 'package.json' ) ).name;
		}
		return extensionName;
	};

	// gets the path that *should* be used for a given extension
	// this is how anvil is able to prefer a locally installed extension via npm
	ExtensionManager.prototype.getExtensionPath = function( extensionName ) {
		var self = this,
			localPath = anvil.fs.buildPath( [ localInstallPath, extensionName ] ),
			globalPath = anvil.fs.buildPath( [ extensionInstallPath, extensionName ] ),
			localExists = anvil.fs.pathExists( localPath );
		return localExists ? localPath : globalPath;
	};

	// gets a list of locally created extensions from the list of extension paths
	// extension files should be named index.js OR match their containing folder
	ExtensionManager.prototype.getLocalExtensions = function( done ) {
		var self = this,
			list = [],
			localPath = ( anvil.loadedConfig && anvil.loadedConfig.localExtensions ) ?
						anvil.fs.buildPath( anvil.loadedConfig.localExtensions ):
						path.resolve( anvil.config.localExtensions );
		anvil.log.debug( "loading local extensions from " + localPath );
		this.getInstalled( localPath, function( extensions ) {
			_.each( extensions, function( extension ) {
				var basePath = anvil.fs.buildPath( [ localPath, extension ] ),
					scriptPath = anvil.fs.buildPath( [ basePath, extension + ".js" ] ),
					exists = anvil.fs.pathExists( scriptPath );
				self.loadExtension( extension, exists ? scriptPath : basePath , list, [] );
			} );
			done( list );
		} );
	};

	// installs an extension from a path or npm (and one day, github...)
	ExtensionManager.prototype.install = function( extensionName, done ) {
		var self = this,
			realExtensionName = this.getExtensionName( extensionName ),
			isPath = anvil.fs.pathExists( extensionName ),
			cwd = process.cwd(),
			reset = function( data ) {
				process.chdir( cwd );
				done( data );
			};
		extensionName = isPath ? path.resolve( extensionName ) : extensionName;
		anvil.log.step( "Installing extension: " + realExtensionName );
		anvil.fs.ensurePath( extensionInstallPath, function() {
			process.chdir( installPath );
			npm.load( npm.config, function( err, npm ) {
				try {
					npm.localPrefix = installPath;
					npm.config.set( "loglevel", "silent" );
					npm.config.set( "global", false );
					npm.commands.install( [ extensionName ], function( err, data ) {
						if( !err ) {
							anvil.log.complete( "Installation of '" + realExtensionName + "' completed successfully." );
							self.addExtension( realExtensionName, function() {
								var packagePath = anvil.fs.buildPath( [ extensionInstallPath, realExtensionName, "package.json" ] ),
									dependencies = require( packagePath ).requiredPlugins;
								if( dependencies && dependencies.length > 0 ) {
									self.getInstalled( extensionInstallPath, function( installed ) {
										var missing = _.difference( dependencies, installed );
										anvil.scheduler.parallel( missing, self.install, function() { reset(); } );
									} );
								} else {
									reset();
								}
							} );
						} else {
							anvil.log.error( "Installation of '" + realExtensionName + "' has failed with error: \n" + err.stack );
							reset( { extension: realExtensionName } );
						}
					} );
					
				} catch ( err ) {
					anvil.log.error( "Installation of '" + realExtensionName + "' has failed with error: \n" + err.stack );
					reset( { extension: realExtensionName } );
				}
			} );
		} );
	};

	// generates a list of installed extensions
	ExtensionManager.prototype.list = function( done ) {
		var self = this;
		anvil.log.complete( "Installed extension list: " );
		this.getInstalled( extensionInstallPath, function( extensions ) {
			_.each( extensions, function( extension ) {
				anvil.log.event( extension );
			} );
			done();
		} );
	};

	// loads the extension via require so that various extensions in the package
	// will add themselves to anvil
	ExtensionManager.prototype.loadExtension = function( extensionName, extensionPath, list, removals ) {
		var self = this;
		removals = removals || [];
		try {
			var modulePath = path.resolve( extensionPath );
			require( modulePath )( _, anvil );
			anvil.log.debug( "loaded extension " + extensionName );
		} catch ( err ) {
			anvil.log.error( "Error loading extension '" + extensionName + "' : " + err.stack );
			removals.push( function( done ) { self.removeExtension( extensionName, function() {
					anvil.log.step( "Extension '" + extensionName + "' cannot be loaded and has been disabled");
				} );
			} );
		}
	};

	// removes the extension from the global list @ ~/.anvilextensions/extensions.json
	ExtensionManager.prototype.removeExtension = function( extensionName, onComplete ) {
		this.getEnabledExtensions( function( extensions ) {
			if( _.any( extensions, function( name ) { return name === extensionName; } ) ) {
				extensions = _.reject( extensions, function( name ) { return name === extensionName; } );
				var json = JSON.stringify( { list: extensions }, null, 4 );
				anvil.fs.write( dataPath, json, function( err ) {
					onComplete( true );
				} );
			} else {
				onComplete( false );
			}
		} );
	};

	// uninstalls a previously installed extension
	ExtensionManager.prototype.uninstall = function( extensionName, done ) {
		anvil.log.step( "Uninstalling extension: " + extensionName );
		var self = this,
			cwd = process.cwd(),
			reset = function( data ) {
				process.chdir( cwd );
				done( data );
			};
		npm.load( npm.config, function( err, npm ) {
			try {
				process.chdir( installPath );
				npm.localPrefix = installPath;
				npm.config.set( "loglevel", "silent" );
				npm.config.set( "global", false );
				npm.commands.uninstall( [ extensionName ], function( err, data ) {
					if( !err ) {
						anvil.log.complete( "Uninstallation of '" + extensionName + "' completed successfully." );
						self.removeExtension( extensionName, reset );
					} else {
						anvil.log.error( "Uninstallation of '" + extensionName + "' has failed: " + err );
						reset( { extension: extensionName } );
					}
				} );
			} catch ( err ) {
				anvil.log.error( "Uninstallation of '" + extensionName + "' has failed: " + err );
				reset( { extension: extensionName } );
			}
		} );
	};

	// installs an update to an previously installed extension from npm if there is
	// an update by calling npm update
	ExtensionManager.prototype.updateExtension = function( extensionName, done ) {
		var self = this,
			cwd = process.cwd(),
			reset = function( data ) {
				process.chdir( cwd );
				done();
			};
		anvil.log.step( "Updating extension: " + extensionName );
		anvil.fs.ensurePath( extensionInstallPath, function() {
			process.chdir( installPath );
			npm.load( npm.config, function( err, npm ) {
				try {
					npm.localPrefix = installPath;
					npm.config.set( "loglevel", "silent" );
					npm.config.set( "global", false );
					npm.commands.update( [ extensionName ], function( err, data ) {
						if( !err ) {
							anvil.log.complete( "Update to '" + extensionName + "' completed successfully." );
							self.addExtension( extensionName, function() {
								reset();
							} );
						} else {
							anvil.log.error( "Update to '" + extensionName + "' has failed with error: \n" + err.stack );
							reset( { extension: extensionName } );
						}
					} );
				} catch ( err ) {
					anvil.log.error( "Update to '" + extensionName + "' has failed with error: \n" + err.stack );
					reset( { extension: extensionName } );
				}
			} );
		} );
	};

	// updates all installed extensions
	ExtensionManager.prototype.update = function( done ) {
		var self = this;
		this.getInstalled( extensionInstallPath, function( list ) {
			var calls = _.map( list, function( extensionName ) {
				return function( done ) {
					self.updateExtension( extensionName, done );
				};
			} );
			anvil.scheduler.pipeline( undefined, calls, function() {
				anvil.log.complete( "Anvil has finished updating installed extensions" );
				done();
			} );
		} );
	};

	return new ExtensionManager();
};

module.exports = extensionManagerFactory;