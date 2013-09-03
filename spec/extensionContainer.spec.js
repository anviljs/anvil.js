require( "should" );

var _ = require( "underscore" );
require( "../src/underscorePatch.js" )( _ );
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
var host = require( "./host.mock.js" )( _, anvil );
require( "../src/utility.js")( _, anvil );
var plugin = require( "../src/plugin.js" )( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );

var mockPluginManager = {
	installPath: "../spec/plugins",
	checkDependencies: function( list, done ) {
		done();
	},
	getExtensions: function( done ) {
		anvil.plugin( { name: "testPlugin", test: function() { return "hello anvil!"; } } );
		done();
	},
	getLocalExtensions: function( done ) {
		done();
	}
};

var extensionContainer = require( "../src/extensionContainer.js" )( _, mockPluginManager, anvil );

describe( "when loading configured extensions", function() {

	extensionContainer.loadExtensions( { config: {}, commander: { option: function() {} } } );

	it( "should correctly store instance of plugin", function() {
		anvil.extensions.plugins[ "testPlugin" ].test().should.equal( "hello anvil!" );
	} );

} );