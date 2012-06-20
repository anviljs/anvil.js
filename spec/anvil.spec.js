require( "should" );

var _ = require( "underscore" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var log = require( "./log.mock.js" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var anvil = require( "../src/anvil.js" )( _, postal, [], scheduler, fs, log );

describe( "when publishing and subscribing to Anvil channels", function() {
	var oneCount = 0,
		twoCount = 0;

	var subscriberOne = function( data ) {
		oneCount++;
	};

	var subscriberTwo = function( data ) {
		twoCount++;
	};

	var freakOut = function( data ) {
		throw new Error( "I AM FREAKING OUT!" );
	};

	anvil.subscribe( "one", "*", subscriberOne );
	anvil.subscribe( "one", "*", freakOut );
	anvil.subscribe( "two", "*", freakOut );
	anvil.subscribe( "two", "*", subscriberTwo );

	anvil.publish( "one", "test", {} );
	anvil.publish( "two", "test", {} );

	it( "should have notified subscriberOne once", function() { oneCount.should.equal( 1 ); } );
	it( "should have notified subscriberTwo once", function() { twoCount.should.equal( 1 ); } );
} );

describe( "when raising and handling Anvil events", function() {
	var oneCount = 0,
		twoCount = 0;

	var subscriberOne = function( data ) {
		oneCount++;
	};

	var subscriberTwo = function( data ) {
		twoCount++;
	};

	var freakOut = function( data ) {
		throw new Error( "I AM FREAKING OUT!" );
	};

	anvil.on( "one", subscriberOne );
	anvil.on( "one", freakOut );
	anvil.on( "two", freakOut );
	anvil.on( "two", subscriberTwo );

	anvil.raise( "one", {} );
	anvil.raise( "two", {} );

	it( "should have notified subscriberOne once", function() { oneCount.should.equal( 1 ); } );
	it( "should have notified subscriberTwo once", function() { twoCount.should.equal( 1 ); } );
} );