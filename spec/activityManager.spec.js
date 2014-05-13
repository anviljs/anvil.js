require( "should" );

 _ = require( "underscore" );
 require( "../src/underscorePatch.js" )( _ );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var fs = require( "../src/fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var Monologue = require( "monologue.js" )( _ );
var postal = require( "postal" );
var bridge = require( "monopost" );
bridge( _, Monologue, postal );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, Monologue, bus );
var minimatch = require( "minimatch" );
anvil.minimatch = minimatch;
var host = require( "./host.mock.js" )( _, anvil );
require( "../src/utility.js")( _, anvil );
var plugin = require( "../src/plugin.js" )( _, anvil );
var command = require( "../src/command.js" )( _, anvil );
var scaffold = require( "../src/scaffold.js" )( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var manager = require( "./fakeManager.js" )( _, anvil );
var container = require( "../src/extensionContainer.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );
var activityManager = require( "../src/activityManager.js" )( _, machina, anvil );

describe( "when using activity manager during system start", function() {

	var buildComplete = false;
	before( function( done ) {
		anvil.on( "build.done", function() {
			buildComplete = true;
			done();
		} );
		config.initialize( [ "node", "anvil", "--pa", "test" ] );
	} );

	it( "should complete build", function() {
		buildComplete.should.be.true;
	} );

	it( "should have run all plugins", function() {
		_.all( anvil.extensions.plugins, function( plugin ) {
			return plugin.ran;
		} ).should.be.true;
	} );

} );