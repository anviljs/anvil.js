require( "should" );
require( "should" );
var _ = require( "underscore" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, events, bus );
var plugin = require( "../src/plugin.js" )( _, anvil );
var log = require( "./log.mock.js" )( anvil );

var pluginManager = require( "../src/pluginManager.js" )( _, anvil, true );

describe( "when getting the list of loaded plugins", function() {
	var list = [];

	before( function( done ) {
		fs.write( path.resolve( "./plugins.json" ), '{ "list": [] }', function() {
			pluginManager.getPlugins( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );

	it( "should return the list of plugins installed", function() {
		_.isEqual( list, [] ).should.ok;
		list.length.should.equal( 0 );
	} );
} );

describe( "when adding a new plugin", function() {
	var list = [],
		err;

	before( function( done ) {
		pluginManager.addPlugin( "testPlugin", function() {
			pluginManager.getPlugins( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	
	it( "should return the list of plugins installed", function() {
		_.isEqual( _.pluck( list, "name" ), [ "testPlugin" ] ).should.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 1 );
	} );
} );

describe( "when adding an existing plugin", function() {
	var list = [],
		err;

	before( function( done ) {
		pluginManager.addPlugin( "testPlugin", function() {
			pluginManager.getPlugins( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	

	it( "should return the list of plugins installed", function() {
		_.isEqual( _.pluck( list, "name" ), [ "testPlugin" ] ).should.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 1 );
	} );
} );

describe( "when removing an existing plugin", function() {
	var list = [],
		err;

	before( function( done ) {
		pluginManager.removePlugin( "testPlugin", function() {
			pluginManager.getPlugins( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	

	it( "should return the list of plugins installed", function() {
		_.isEqual( list, [] ).should.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 0 );
	} );
} );

describe( "when removing a missing plugin", function() {
	var list = [],
		err;

	before( function( done ) {
		pluginManager.removePlugin( "lulzImNot4Real", function() {
			pluginManager.getPlugins( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	

	it( "should return the list of plugins installed", function() {
		_.isEqual( list, [] ).should.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 0 );
	} );
} );