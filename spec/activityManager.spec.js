require( "should" );

 _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var fs = require( "../src/fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, events, bus );
require( "../src/utility.js")( _, anvil );
var plugin = require( "../src/plugin.js" )( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var manager = require( "./fakeManager.js" )( _, anvil );
var locator = require( "../src/pluginLocator.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );
var activityManager = require( "../src/activityManager.js" )( _, machina, anvil );

describe( "when using activity manager during system start", function() {

	var buildComplete = false;
	before( function( done ) {
		events.on( "build.done", function() {
			buildComplete = true;
			done();
		} );
		config.initialize( [ "node", "anvil", "--pa", "test" ] );
	} );

	it( "should complete build", function() {
		buildComplete.should.be.true;
	} );

	it( "should have run all plugins", function() {
		_.all( manager.plugins, function( plugin ) { return plugin.instance.ran; } ).should.be.true;
	} );

} );