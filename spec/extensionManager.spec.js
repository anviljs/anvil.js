require( "should" );
require( "should" );
var _ = require( "underscore" );
require( "../src/underscorePatch.js" )( _ );
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
		list.length.should.equal( 12 );
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
		list.length.should.equal( 13 );
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
		list.length.should.equal( 13 );
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
		list.length.should.equal( 12 );
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
		list.length.should.equal( 12 );
	} );
} );