require( "should" );

var _ = require( "underscore" );
require( "../src/underscorePatch.js" )( _ );
var postal = require( "postal" );
var bus = require( "../src/bus.js" )( _, postal );

describe( "when publishing and subscribing to bus channels", function() {
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

	bus.subscribe( "one", "*", subscriberOne );
	bus.subscribe( "one", "*", freakOut );
	bus.subscribe( "two", "*", freakOut );
	bus.subscribe( "two", "*", subscriberTwo );

	bus.publish( "one", "test", {} );
	bus.publish( "two", "test", {} );

	it( "should have notified subscriberOne once", function() { oneCount.should.equal( 1 ); } );
	it( "should have notified subscriberTwo once", function() { twoCount.should.equal( 1 ); } );
} );