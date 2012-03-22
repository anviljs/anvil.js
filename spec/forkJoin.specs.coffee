_ = require "underscore"
scheduler = require( "../src/scheduler.coffee").scheduler
require "should"

describe "when mutating a single item through a pipeline", ->

	start = ""
	step1 = ( x, done ) -> done( x + "hello" )
	step2 = ( x, done ) -> done( x + " " )
	step3 = ( x, done ) -> done( x + "world" )
	step4 = ( x, done ) -> done( x + "!" )
	expected = "hello world!"

	steps = [ step1, step2, step3, step4 ]

	it "should run pipeline in order", ( done ) ->
		scheduler.pipeline start, steps, ( result ) ->
			result.should.equal expected
			done()

describe "when running calls in parallel", ->

	start = [ 2, 3, 4 ]
	call = ( x, done ) -> done x * 2
	expected = [ 4, 6, 8 ]

	it "should return collection (in any order)", ( done ) ->
		scheduler.parallel start, call, ( result ) ->
			_.difference( result, expected ).length.should.equal 0
			done()