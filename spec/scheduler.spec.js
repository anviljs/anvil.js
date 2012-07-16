require( "should" );
var _ = require( "underscore" );
var scheduler = require( "../src/scheduler.js" )( _ );

describe( "when building an item through a pipeline", function() {
	var start = "",
		steps = [
			function( x, done ) { done( x + "hello" ); },
			function( x, done ) { done( x + " " ); },
			function( x, done ) { done( x + "world" ); },
			function( x, done ) { done( x + "!" ); }
		],
		expected = "hello world!";

		it( "should run pipeline in order", function( done ) {
			scheduler.pipeline( start, steps, function( result ) {
				result.should.equal( expected );
				done();
			} );
		} );
} );

describe( "when manipulating a single item through a pipeline", function() {
	var start = 100,
		steps = [
			function( x, done ) { done( x / 2 ); },
			function( x, done ) { done( x - 25 ); },
			function( x, done ) { done( x / 5 ); },
			function( x, done ) { done( x + 5 ); }
		],
		expected = 10;

	it( "should run pipeline in order", function( done ) {
		scheduler.pipeline( start, steps, function( result ) {
			result.should.equal( expected );
			done();
		} );
	} );
} );

describe( "when running calls in parallel", function() {
	var start = [ 2, 3, 4 ],
		call = function( x, done ) { done( x * 2 ); },
		expected = [ 4, 6, 8 ];

	it( "should return collection (in any order)", function( done ) {
		scheduler.parallel( start, call, function( result ) {
			_.difference( result, expected ).length.should.equal( 0 );
			done();
		} );
	} );
} );

describe( "when aggregating mapped calls ", function() {
	var calls = {
		one: function( done ) { setTimeout( function() { done( 1 ); }, 10 ); },
		two: function( done ) { setTimeout( function() { done( 2 ); }, 5 ); },
		three: function( done ) { setTimeout( function() { done( 3 ); }, 1 ); }
	};

	it( "should complete with a correctly constructed object", function( done ) {
		scheduler.mapped( calls, function( result ) {
			result.one.should.equal( 1 );
			result.two.should.equal( 2 );
			result.three.should.equal( 3 );
			done();
		} );
	} );
} );