/*
	anvil.js - an extensible build system
	version:	0.8.10
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var _ = require( "underscore" );
var path = require( "path" );
var fs = require( "./fs.mock.js" )( _, path );

var factory = function(
		scheduler,
		crawler,
		mkdir,
		events,
		bus,
		manager,
		locator,
		config,
		activityManager,
		plugin,
		log
	) {
	var anvil = require( "./anvil.js" )(
		_, scheduler, fs, events, bus
	);
	require( "./utility.js")( _, anvil );
	anvil.project.root = path.resolve( "./" );
	return function( plugin, pluginPath ) {

		var preLoaded = [];
		manager.loadPlugin( plugin, pluginPath, preLoaded );
		locator.preLoaded = preLoaded;

		var pluginsPath = path.resolve( __dirname, "../plugins.json" );
		fs.write(
			pluginsPath,
			'{ "list": [ "combiner", "compiler", "concat", "fileLoader", "filePrep", "output", "pluginInstaller", "replace" ] }',
			function() {} );

		var Harness = function() {
			_.bindAll( this );
			this.command = [ "node", "anvil.js" ];
			this.expected = [];
			this.files = [];
			this.logs = {
				debug: [],
				"event": [],
				step: [],
				complete: [],
				warning: [],
				error: []
			};
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
			pathSpec = path.resolve( anvil.fs.buildPath( pathSpec ) );
			this.expected.push( { path: pathSpec, content: content } );
		};

		Harness.prototype.build = function( assert, done ) {
			this.buildOnly( function() {
				done( self.generateAssertions( assert ) );
			} );
		};

		Harness.prototype.buildOnly = function( done ) {
			var self = this,
				handles = this.subscribe();
			anvil.on( "build.done", function() {
				_.each( handles, function( handle ) { handle.cancel(); } );
				done();
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
						self.logs[ type ].push( x );
					} ) );
				}
			);
			return handles;
		};

		return new Harness();
	};
};

module.exports = factory;