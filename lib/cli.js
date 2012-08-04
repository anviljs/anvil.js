 _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var fs = require( "fs" );
var path = require( "path" );
var mkdir = require( "mkdirp" ).mkdirp;
var colors = require( "colors" );
var scheduler = require( "./scheduler.js" )( _ );
var crawler = require( "./fileCrawler.js" )( _, fs, path, scheduler );
var files = require( "./fileSystem.js" )( _, fs, path, mkdir, crawler );
var events = require( "./eventAggregator.js" )( _ );
var bus = require( "./bus.js")( _, postal );
var anvil = require( "./anvil.js" )( _, scheduler, files, events, bus );
require( "./utility.js")( _, anvil );
var plugin = require( "./plugin.js" )( _, anvil );
var log = require( "./log.js" )( anvil );
var consoleLog = require( "./consoleLogger.js" )( _, anvil );
var manager = require( "./pluginManager.js" )( _, anvil );
var locator = require( "./pluginLocator.js" )( _, manager, anvil );
var config = require( "./config.js" )( _, commander, path, anvil );
var activityManager = require( "./activityManager.js" )( _, machina, anvil );

var cliFactory = function() {
	
	var Cli = function() {
		config.initialize( process.argv );
	};

	return new Cli();
};

module.exports = cliFactory;