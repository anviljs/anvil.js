_ = require "underscore"
log = require( "./logMock.coffee" ).log
FP = require( "./fsMock.coffee" ).fsProvider
ArgParser = require( "./argParserMock.coffee" ).parser
Anvil = require( "../src/anvil").
scheduler = require( "../src/scheduler.coffee").scheduler

require "should"

