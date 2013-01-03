/*
	anvil.js - an extensible build system
	version:	0.9.0-RC4
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
_ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var fs = require( "fs" );
var path = require( "path" );
var mkdir = require( "mkdirp" ).mkdirp;
var scheduler = require( "./scheduler.js" )( _ );
var crawler = require( "./fileCrawler.js" )( _, fs, path, scheduler );
var files = require( "./fileSystem.js" )( _, fs, path, mkdir, crawler, scheduler );
var Monologue = require( "monologue.js" )( _ );
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
var host = require( "./host.js" )( _, anvil );
var log = require( "./log.js" )( anvil );
var manager = require( "./pluginManager.js" )( _, anvil );
var locator = require( "./pluginLocator.js" )( _, manager, anvil );
var config = require( "./config.js" )( _, commander, path, anvil );
var activityManager = require( "./activityManager.js" )( _, machina, anvil );
var Harness = require( "./pluginHarness.js" )();

anvil.project.root = path.resolve( "./" );
module.exports = {
		config: config,
		scheduler: scheduler,
		files: files,
		events: events,
		bus: bus,
		anvil: anvil,
		log: log,
		PluginHarness: Harness
	};