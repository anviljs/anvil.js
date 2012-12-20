/*
	anvil.js - an extensible build system
	version:	0.9.0-RC3
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
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
var files = require( "./fileSystem.js" )( _, fs, path, mkdir, crawler, scheduler );
var events = require( "./eventAggregator.js" )( _ );
var bus = require( "./bus.js")( _, postal );
var anvil = require( "./anvil.js" )( _, scheduler, files, events, bus );
require( "./utility.js")( _, anvil );
var plugin = require( "./plugin.js" )( _, anvil );
var command = require( "./command.js" )( _, anvil );
var scaffold = require( "./scaffold.js" )( _, anvil );
var task = require( "./task.js" )( _, anvil );
var widget = require( "./widget.js" )( _, anvil );
var host = require( "./host.js" )( _, anvil );
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