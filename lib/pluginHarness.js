/*
	anvil.js - an extensible build system
	version:	0.8.8
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "./scheduler.js" )( _ );
var events = require( "./eventAggregator.js" )( _ );
var bus = require( "./bus.js")( _, postal );
var anvil = require( "./anvil.js" )( _, scheduler, fs, events, bus );
require( "./utility.js")( _, anvil );
var log = require( "../spec/log.mock.js" )( anvil );
var plugin = require( "./plugin.js" )( _, anvil );
var manager = require( "./pluginManager.js" )( _, anvil );
var locator = require( "./pluginLocator.js" )( _, manager, anvil );
var config = require( "./config.js" )( _, commander, path, anvil );
var activityManager = require( "./activityManager.js" )( _, machina, anvil );

var harnessFactory = function( plugin, pluginPath ) {

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
		var self = this;
		this.buildOnly( function() {
			done( self.generateAssertions( assert ) );
		} );
	};

	Harness.prototype.buildOnly = function( done ) {
		var self = this;

		anvil.events.on( "build.done", function() {
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

	return new Harness();

};

module.exports = harnessFactory;