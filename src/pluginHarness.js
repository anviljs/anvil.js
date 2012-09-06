var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var realFS = require( "fs" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "./scheduler.js" )( _ );
var events = require( "./eventAggregator.js" )( _ );
var bus = require( "./bus.js")( _, postal );
var anvil = require( "./anvil.js" )( _, scheduler, fs, events, bus );
require( "./utility.js")( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var plugin = require( "./plugin.js" )( _, anvil );
var manager = require( "./pluginManager.js" )( _, anvil );
var locator = require( "./pluginLocator.js" )( _, manager, anvil );
var config = require( "./config.js" )( _, commander, path, anvil );
var activityManager = require( "./activityManager.js" )( _, machina, anvil );

var harnessFactory = function( _, anvil ) {

	var Harness = function() {
		_.bindAll( this );
		this.command = [ "node", "anvil.js" ];
		this.build = {};
		this.files = [];
	};

	Harness.prototype.addFile = function( pathSpec, content ) {
		pathSpec = anvil.fs.buildPath( pathSpec );
		this.files.push( { path: pathSpec, content: content} );
	};

	Harness.prototype.assertOutput = function( assert ) {
		_.each( this.build, function( content, path ) {
			assert( anvil.fs.pathExists( path ), true );
			anvil.fs.read( path, function( actual ) {
				assert( content, actual );
			} );
		} );
	};

	Harness.prototype.addCommandArgs = function( line ) {
		this.command = this.command.concat( line.split( " " ) );
	};

	Harness.prototype.expectFile = function( pathSpec, content ) {
		pathSpec = anvil.fs.buildPath( pathSpec );
		this.build[ pathSpec ] = content;
	};

	Harness.prototype.runAndTest = function( assert ) {
		var self = this;
		this.runBuild( function() {
			self.assertOutput( assert );
		} );
	};

	Harness.prototype.runBuild = function( done ) {
		var self = this;

		anvil.events.on( "build.done", function() {
			done();
		} );
		anvil.scheduler.parallel(
			this.files,
			function( file, done ) {
				anvil.fs.write( file.path, file.content, done );
			},
			function() {
				config.initialize( self.command );
			} );
	};

	return new Harness();

};

module.exports = harnessFactory;