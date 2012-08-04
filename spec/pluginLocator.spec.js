require( "should" );

var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, events, bus );
require( "../src/utility.js")( _, anvil );
var plugin = require( "../src/plugin.js" )( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );

var mockPluginManager = {
	installPath: "../spec/plugins",
	checkDependencies: function( list, done ) {
		done();
	},
	getPlugins: function( done ) {
		done( [
			{ name: "testPlugin", instance: { test: function() { return "hello anvil!"; } } }
		] );
	}
};

var pluginLocator = require( "../src/pluginLocator.js" )( _, mockPluginManager, anvil );

describe( "when loading configured plugins", function() {

	pluginLocator.loadPlugins( {}, {} );

	it( "should correctly store instance of plugin", function() {
		pluginLocator.instances[ "testPlugin" ].test().should.equal( "hello anvil!" );
	} );

} );