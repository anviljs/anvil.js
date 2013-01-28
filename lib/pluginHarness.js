/*
	anvil.js - an extensible build system
	version:	0.9.0
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var path = require( "path" ),
	realFs = require( "fs" ),
	_ = require( "underscore" ),
	machina = require( "machina" ),
	postal = require( "postal" ),
	scheduler = require( "./scheduler.js" )( _ );


var factory = function() {
	
	var harnessFactory = function( plugin, pluginPath ) {

		var commander = require( "commander" ),
			fs = require( "./fs.mock.js" )( _, path ),
			events = require( "./eventAggregator.js" )( _ ),
			bus = require( "./bus.js")( _, postal ),
			anvil = require( "./anvil.js" )( _, scheduler, fs, events, bus ),
			log = require( "./log.js" )( anvil );
		require( "./consoleLogger" )( _, anvil );
		require( "./utility.js")( _, anvil );
		anvil.project.root = path.resolve( "./" );
		var pluginModule = require( "./plugin.js" )( _, anvil ),
			manager = require( "./pluginManager.js" )( _, anvil ),
			locator = require( "./pluginLocator.js" )( _, manager, anvil ),
			config = require( "./config.js" )( _, commander, path, anvil ),
			activityManager = require( "./activityManager.js" )( _, machina, anvil ),
			preLoaded = [],
			instance = manager.loadPlugin( plugin, pluginPath, preLoaded ),
			dataPath = fs.buildPath( [ "~/.anvilplugins", "plugins.json" ] ),
			packagePath = "./package.json";

		locator.preLoaded = preLoaded;
		locator.initPlugin( instance );
		scheduler.parallel( [ dataPath, packagePath ], function( filePath, done ) {
			realFs.readFile( filePath, "utf8", function( error, content ) {
				if( !error ) {
					fs.write( filePath, content, function() {
						done();
					} );
				} else {
					done();
				}
			} );
		}, function() {} );

		var Harness = function() {
			_.bindAll( this );
			this.command = [ "node", "anvil.js" ];
			this.expected = [];
			this.files = [];
			this.fileSystem = fs;
			this.logs = {
				debug: [],
				"event": [],
				step: [],
				complete: [],
				warning: [],
				error: []
			};
			this.plugin = instance;
		};

		Harness.prototype.addFile = function( pathSpec, content ) {
			pathSpec = path.resolve( anvil.fs.buildPath( pathSpec ) );
			this.files.push( { path: pathSpec, content: content } );
		};

		Harness.prototype.generateAssertions = function( assert ) {
			return _.map( this.expected, function( file ) {
				return {
					description: "should create " + file.path,
					call: function( done ) {
						assert( anvil.fs.pathExists( file.path ), true );
						anvil.fs.read( file.path, function( actual ) {
							assert( file.content, actual );
							if( done ) {
								done();
							}
						} );
					}
				};
			} );
		};

		Harness.prototype.addCommandArgs = function( line ) {
			this.command = this.command.concat( line.split( " " ) );
		};

		Harness.prototype.expectFile = function( pathSpec, content ) {
			pathSpec = anvil.fs.buildPath( pathSpec );
			this.expected.push( { path: pathSpec, content: content } );
		};

		Harness.prototype.build = function( assert, done ) {
			var self = this;
			this.buildOnly( function() {
				done( self.generateAssertions( assert ) );
			} );
		};

		Harness.prototype.buildOnly = function( done ) {
			var self = this,
				handles = this.subscribe();
			anvil.on( "build.done", {
				callback: function() {
					_.each( handles, function( handle ) { handle.cancel(); } );
					done();
				}
			} );
			anvil.scheduler.parallel(
				this.files,
				function( file, done ) {
					anvil.fs.write( file.path, file.content, function() { done(); } );
				},
				function() {
					config.initialize( self.command );
				} );
		};

		Harness.prototype.subscribe = function() {
			var self = this,
				handles = [];
			_.each( [ "debug", "event", "step", "complete", "warning", "error" ],
				function( type ) {
					handles.push( anvil.on( "log." + type, function( x ) {
						self.logs[ type ].push( x.message );
					} ) );
				}
			);
			return handles;
		};
		return new Harness();
	};
	return harnessFactory;
};

module.exports = factory;