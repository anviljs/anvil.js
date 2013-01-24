require( "should" );

var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
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
require( "../src/utility.js")( _, anvil );
var host = require( "./host.mock.js" )( _, anvil );
var plugin = require( "../src/plugin.js" )( _, anvil );
var command = require( "../src/command.js" )( _, anvil );
var scaffold = require( "../src/scaffold.js" )( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var manager = require( "./fakeManager.js" )( _, anvil );
var container = require( "../src/extensionContainer.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );

var pluginFile = {

};

describe( "when setting up configuration and plugins", function() {

	var configCompleted = false;

	before( function( done ) {
		commander.removeAllListeners();
		anvil.on( "plugins.configured", function() {
			configCompleted = true;
			done();
		} );
		config.initialize( [ "node", "anvil", "--pa", "test" ] );
	} );
	
	it( "should configure all plugins", function() {
		configCompleted.should.be.true;
	} );

	it( "should dispatch completed commander to plugins", function() {
		anvil.extensions.plugins[ "pluginA" ].config.commandLine.should.equal( "test" );
	} );

} );