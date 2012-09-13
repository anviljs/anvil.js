 _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var fs = require( "fs" );
var path = require( "path" );
var colors = require( "colors" );
var mkdir = require( "mkdirp" ).mkdirp;
var scheduler = require( "./lib/scheduler.js" )( _ );
var crawler = require( "./lib/fileCrawler.js" )( _, fs, path, scheduler );
var files = require( "./lib/fileSystem.js" )( _, fs, path, mkdir, crawler, scheduler );
var events = require( "./lib/eventAggregator.js" )( _ );
var bus = require( "./lib/bus.js")( _, postal );
var anvil = require( "./lib/anvil.js" )( _, scheduler, files, events, bus );
require( "./lib/utility.js")( _, anvil );
var plugin = require( "./lib/plugin.js" )( _, anvil );
var log = require( "./lib/log.js" )( anvil );
var consoleLog = require( "./lib/consoleLogger.js" )( _, anvil );
var manager = require( "./lib/pluginManager.js" )( _, anvil );
var locator = require( "./lib/pluginLocator.js" )( _, manager, anvil );
var config = require( "./lib/config.js" )( _, commander, path, anvil );
var plugins = [
		"anvil.combiner",
		"anvil.concat",
		"anvil.headers",
		"anvil.identify",
		"anvil.output",
		"anvil.plugin",
		"anvil.token",
		"anvil.transform",
		"anvil.workset"
	];

anvil.events.on( "all.stop", function() {
	process.exit();
} );

anvil.log.step( "Checking for core plugins" );
manager.checkDependencies( plugins, function() {
	anvil.log.complete( "Core dependencies are installed" );
} );