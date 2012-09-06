var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var realFS = require( "fs" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "./scheduler.js" )( _ );
var events = require( "./eventAggregator.js" )( _ );
var bus = require( "./bus.js")( _, postal );
var anvil = require( "./anvil.js" )( _, scheduler, fs, events, bus );
require( "./utility.js")( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var plugin = require( "./plugin.js" )( _, anvil );
var manager = require( "./pluginManager.js" )( _, anvil );
var locator = require( "./pluginLocator.js" )( _, manager, anvil );
var config = require( "./config.js" )( _, commander, path, anvil );
var activityManager = require( "./activityManager.js" )( _, machina, anvil );

var harnessFactory = function( _, anvil ) {

	var Harness = function() {
		_.bindAll( this );
		this.command = [];
		this.build = {};
		this.files = {};
		this.root = path.resolve( "./" );
	};

	return new Harness();

};

module.exports = harnessFactory;