_ = require( "underscore" );
require( "./underscorePatch" )( _ );
var commander = require( "commander" );
var machina = require( "machina" );
var fs = require( "fs" );
var path = require( "path" );
var mkdir = require( "mkdirp" ).mkdirp;
var colors = require( "colors" );
var scheduler = require( "./scheduler.js" )( _ );
var crawler = require( "./fileCrawler.js" )( _, fs, path, scheduler );
var minimatch = require( "minimatch" );
var Monologue = require( "monologue.js" )( _ );
var files = require( "./fileSystem.js" )( _, fs, path, mkdir, crawler, minimatch, scheduler, Monologue );
var postal = require( "postal" );
var bridge = require( "monopost" );
bridge( _, Monologue, postal );
var bus = require( "./bus.js")( _, postal );
var anvil = require( "./anvil.js" )( _, scheduler, files, Monologue, bus );
require( "./utility.js")( _, anvil );
var plugin = require( "./plugin.js" )( _, anvil );
var command = require( "./command.js" )( _, anvil );
var scaffold = require( "./scaffold.js" )( _, anvil );
var task = require( "./task.js" )( _, anvil );
var widget = require( "./widget.js" )( _, anvil );
anvil.http = require( "./host.js" )( _, anvil );
anvil.processes = require( "./processHost.js" )( _, anvil );
anvil.minimatch = minimatch;
var log = require( "./log.js" )( anvil );
var consoleLog = require( "./consoleLogger.js" )( _, anvil );
var manager = require( "./extensionManager.js" )( _, anvil );
var container = require( "./extensionContainer.js" )( _, manager, anvil );
var config = require( "./config.js" )( _, commander, path, anvil );
var activityManager = require( "./activityManager.js" )( _, machina, anvil );

var cliFactory = function() {

	var Cli = function() {
		anvil.project.root = path.resolve( "./" );
		config.initialize( process.argv );
	};

	return new Cli();
};

module.exports = cliFactory;