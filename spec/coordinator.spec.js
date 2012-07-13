require( "should" );

var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var log = require( "./log.mock.js" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, log, events, bus );
var manager = require( "./fakeManager.js" )( _, anvil );
var locator = require( "../src/pluginLocator.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );
var coordinator = require( "../src/coordinator.js" )( _, anvil );

describe( "when initiating activity coordination", function() {


	it( "should signal plugins registered for activity", function() {

	} );

	it( "should order plugins by dependencies", function() {

	} );

	it( "should execute plugins in order", function() {

	} );

} );