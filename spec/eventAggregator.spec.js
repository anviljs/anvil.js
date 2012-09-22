require( "should" );

var _ = require( "underscore" );
var events = require( "../src/eventAggregator.js" )( _ );

describe( "when raising and handling events", function() {
	var oneCount = 0,
		twoCount = 0,
		arg1, arg2;

	var subscriberOne = function( one, two ) {
		oneCount++;
		arg1 = one;
		arg2 = two;
	};

	var subscriberTwo = function( data ) {
		twoCount++;
	};

	var freakOut = function( data ) {
		throw new Error( "I AM FREAKING OUT!" );
	};

	events.on( "one", subscriberOne );
	events.on( "one", freakOut );
	events.on( "two", freakOut );
	events.on( "two", subscriberTwo );

	events.raise( "one", 1, 2 );
	events.raise( "two", {} );

	it( "should have notified subscriberOne once", function() { oneCount.should.equal( 1 ); } );
	it( "should have passed the correct arguments", function() {
		arg1.should.equal( 1 );
		arg2.should.equal( 2 );
	} );
	it( "should have notified subscriberTwo once", function() { twoCount.should.equal( 1 ); } );
} );