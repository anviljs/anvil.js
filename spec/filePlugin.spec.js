require( "should" );

 _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var log = require( "./log.mock.js" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, log, events, bus );
var manager = require( "../src/pluginManager.js" )( _, anvil );
var locator = require( "../src/pluginLocator.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );
var activityManager = require( "../src/activityManager.js" )( _, machina, anvil );

describe( "when creating mock files for test build", function() {
	
	before( function( done ) {
		fs.write( "./test.js", "var x = 'test';", function() { done(); } );
	} );

} );


describe( "when spinning up system for build", function() {

	var buildComplete = false;
	before( function( done ) {
		events.on( "build.done", function() {
			buildComplete = true;
			done();
		} );
		config.initialize( [ "node", "anvil" ] );
	} );

	it( "should complete build", function() {
		buildComplete.should.be.true;
	} );

	it( "should have loaded all files", function() {
		anvil.project.files.length.should.equal( 1 );
	} );

	it( "should have created file metadata", function() {
		var file = anvil.project.files[ 0 ];
		file.name.should.equal( "test.js" );
	} );

	it( "should raise file change event on file change", function( done ) {
		anvil.events.on( "file.changed", function( fileEvent, file ) {
			fileEvent.should.equal( "change" );
			file.should.equal( "./test.js" );
			done();	
		} );
		fs.raiseEvent( "change", "./test.js" );
	} );

} );