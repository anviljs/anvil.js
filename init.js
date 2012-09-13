 _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var fs = require( "fs" );
var path = require( "path" );
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

var installers = _.map( plugins, function( plugin ) {
	return function( success, done ) {
		try {
			manager.install( plugin, function() { done( success ); } );
		} catch ( err ) {
			console.log( "Installation of core plugin " + plugin + " failed with error:\n " + err.stack );
			done( false );
		}
	};
} );

scheduler.pipeline( true, installers, function( success ) { 
	console.log( "Core plugin installation completed " + ( success ? "without errors " : "with errors" ) ); 
} );