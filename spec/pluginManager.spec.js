require( "should" );
_ = require( "underscore" );

var pluginManager = require( "../src/pluginManager.js" )();

describe( "when getting the list of loaded plugins", function() {
	var list = pluginManager.getPlugins();

	it( "should return the list of plugins installed", function() {
		_.isEqual( list, [] ).should.ok;
		list.length.should.equal( 0 );
	} );
} );

describe( "when adding a new plugin", function() {
	var list = [],
		err;

	before( function( done ) {
		pluginManager.addPlugin( "test", function() { 
			list = pluginManager.getPlugins();
			done();
		} );
	} );
	

	it( "should return the list of plugins installed", function() {
		_.isEqual( list, [ "test" ] ).should.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 1 );
	} );
} );

describe( "when adding an existing plugin", function() {
	var list = [],
		err;

	before( function( done ) {
		pluginManager.addPlugin( "test", function() { 
			list = pluginManager.getPlugins();
			done();
		} );
	} );
	

	it( "should return the list of plugins installed", function() {
		_.isEqual( list, [ "test" ] ).should.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 1 );
	} );
} );

describe( "when removing an existing plugin", function() {
	var list = [],
		err;

	before( function( done ) {
		pluginManager.removePlugin( "test", function() { 
			list = pluginManager.getPlugins();
			done();
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
			list = pluginManager.getPlugins();
			done();
		} );
	} );
	

	it( "should return the list of plugins installed", function() {
		_.isEqual( list, [] ).should.ok;
		( err == undefined ).should.ok;
		list.length.should.equal( 0 );
	} );
} );