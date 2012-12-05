require( "should" );
require( "should" );
var _ = require( "underscore" );
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

var extensionManager = require( "../src/extensionManager.js" )( _, anvil );

describe( "when getting the list of loaded extensions", function() {
	var list = [];

	before( function( done ) {
		extensionManager.getEnabledExtensions( function( instances ) {
			list = instances;
			done();
		} );
	} );

	it( "should return the list of extensions installed", function() {
		_.isEqual( list, [] ).should.not.ok;
		list.length.should.equal( 9 );
	} );
} );

describe( "when adding a new extension", function() {
	var list = [],
		err;

	before( function( done ) {
		extensionManager.addExtension( "testExtension", function() {
			extensionManager.getEnabledExtensions( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	
	it( "should return the list of extensions installed", function() {
		//list[ list.length - 1 ].name.should.equal( "testExtension" );
		( err == undefined ).should.ok;
		list.length.should.equal( 10 );
	} );
} );

describe( "when adding an existing extension", function() {
	var list = [],
		err;

	before( function( done ) {
		extensionManager.addExtension( "testExtension", function() {
			extensionManager.getEnabledExtensions( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	

	it( "should return the list of extensions installed", function() {
		list[ list.length - 1 ].should.equal( "testExtension" );
		( err == undefined ).should.ok;
		list.length.should.equal( 10 );
	} );
} );

describe( "when removing an existing extension", function() {
	var list = [],
		err;

	before( function( done ) {
		extensionManager.removeExtension( "testExtension", function() {
			extensionManager.getEnabledExtensions( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	

	it( "should return the list of extensions except the removed one", function() {
		_.isEqual( list, [] ).should.not.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 9 );
	} );
} );

describe( "when removing a missing extension", function() {
	var list = [],
		err;

	before( function( done ) {
		extensionManager.removeExtension( "lulzImNot4Real", function() {
			extensionManager.getEnabledExtensions( function( instances ) {
				list = instances;
				done();
			} );
		} );
	} );
	

	it( "should return the list of extensions installed", function() {
		_.isEqual( list, [] ).should.not.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 9 );
	} );
} );