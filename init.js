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
var Monologue = require( "monologue.js" )( _ );
var postal = require( "postal" );
var bridge = require( "monopost" );
bridge( _, Monologue, postal );
var bus = require( "./lib/bus.js")( _, postal );
var anvil = require( "./lib/anvil.js" )( _, scheduler, files, Monologue, bus );
require( "./lib/utility.js")( _, anvil );
var plugin = require( "./lib/plugin.js" )( _, anvil );
var log = require( "./lib/log.js" )( anvil );
var consoleLog = require( "./lib/consoleLogger.js" )( _, anvil );
var manager = require( "./lib/extensionManager.js" )( _, anvil );
var container = require( "./lib/extensionContainer.js" )( _, manager, anvil );
var config = require( "./lib/config.js" )( _, commander, path, anvil );
var plugins = [
		"anvil.combiner",
		"anvil.concat",
		"anvil.headers",
		"anvil.identify",
		"anvil.output",
		"anvil.extension",
		"anvil.scaffold.cli",
		"anvil.scaffolding",
		"anvil.task.cli",
		"anvil.token",
		"anvil.transform",
		"anvil.testem",
		"anvil.workset"
	];

anvil.on( "all.stop", function() {
	process.exit();
} );

anvil.log.step( "Checking for core plugins" );
manager.checkDependencies( plugins, function() {
	anvil.log.complete( "Core dependencies are installed" );
	var timeout = setTimeout( function() {
		anvil.log.event( "\nTimed out waiting for your response. Updates will not be installed." );
		process.exit();
	}, 5000 );
	commander.prompt( "Check for updates for all installed plugins? (this could take a minute)\n ([Y]/N): ", function( resp ) {
		if( resp === "y" || resp === "Y" || resp === "" ) {
			clearTimeout( timeout );
			manager.update( function() {
				anvil.log.complete( "All installed plugins are up to date!" );
				process.exit();
			} );
		} else {
			process.exit();
		}
	} );
} );
