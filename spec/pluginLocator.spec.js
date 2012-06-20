require( "should" );
_ = require( "underscore" );
var postal = require( "postal" );
var path = require( "path" );
var log = require( "./log.mock.js" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var anvil = require( "../src/anvil.js" )( _, postal, [], scheduler, fs, log );

var mockPluginManager = {
	installPath: "../spec/plugins",
	getPlugins: function() {
		return [ "testPlugin" ];
	}
};

var pluginLocator = require( "../src/pluginLocator.js" )( _, mockPluginManager, anvil, scheduler, fs, log );

describe( "when loading configured plugins", function() {

	pluginLocator.createPlugins();

	it( "should correctly store instance of plugin", function() {
		pluginLocator.instances[ "testPlugin" ].test().should.equal( "hello anvil!" );
	} );

} );