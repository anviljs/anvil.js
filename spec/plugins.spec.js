require( "should" );

var _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var realFS = require( "fs" );
var fs = require( "../src/fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, events, bus );
require( "../src/utility.js")( _, anvil );
var log = require( "./log.mock.js" )( anvil );
var plugin = require( "../src/plugin.js" )( _, anvil );
var command = require( "../src/command.js" )( _, anvil );
var manager = require( "../src/extensionManager.js" )( _, anvil );
var container = require( "../src/extensionContainer.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );
var activityManager = require( "../src/activityManager.js" )( _, machina, anvil );
var setup = require( "./project.setup.js" )( _, fs, path, scheduler, realFS );

var root = path.resolve( "./" );
var combinedA = "var a = 'a';" +
		"\nvar f = function() {" +
		"\n   var b = 'b';" +
		"\n};";

describe( "when scanning project directory with file plugin", function() {
	
	before( function( done ) {
		setup( done );
	} );

	describe( "when spinning up system for build", function() {

		var buildComplete = false;
		before( function( done ) {
			anvil.on( "build.done", function() {
				buildComplete = true;
				done();
			} );
			anvil.config.source = "./";
			config.initialize( [ "node", "anvil", "--ci", "--concat", "/special/concat.yaml", "--values", "./values.yaml" ] );
		} );

		it( "should complete build", function() {
			buildComplete.should.be.true;
		} );

		it( "should have loaded all files", function() {
			anvil.project.files.length.should.be.greaterThan( 1 );
		} );

		it( "should copy files to working path", function() {
			fs.files[ root + "/.anvil/tmp/test.js" ].should.be.ok;
		} );

		it( "should have combined a.js", function() {
			fs.files[ root + "/.anvil/tmp/a.js" ].content.should.equal( combinedA );
		} );

		it( "should have combined d.js", function() {
			fs.files[ root + "/.anvil/tmp/parent/sibling2/d.js" ].content.should.equal( "var c = 'this is contrived!';" );
		} );

		it( "should have combined e.js", function() {
			fs.files[ root + "/.anvil/tmp/parent/e.js" ].content.should.equal( "var c = 'this is contrived!';" );
		} );

		it( "should have written files to output", function() {
			fs.files[ root + "/lib/a.js" ].should.be.ok;
			fs.files[ root + "/lib/test.js" ].should.be.ok;
			fs.files[ root + "/lib/parent/e.js" ].should.be.ok;
		} );

		it( "should transform concat yaml files", function() {
			fs.files[ root + "/lib/cat1.js" ].should.be.ok;
			fs.files[ root + "/lib/cat1.js" ].content.should.equal( "var a = '1';\nvar b = '2';\nvar c = '3';" );
		} );

		it( "should transform concat json files", function() {
			fs.files[ root + "/lib/cat4.js" ].should.be.ok;
			fs.files[ root + "/lib/cat4.js" ].content.should.equal( "var a = '1';\nvar b = '2';\nvar c = '3';" );
		} );

		it( "should create files from yaml list file", function() {
			fs.files[ root + "/lib/cat2.js" ].should.be.ok;
			fs.files[ root + "/lib/cat2.js" ].content.should.equal( "var a = 1;\nvar b = 2;" );
			fs.files[ root + "/lib/cat3.js" ].should.be.ok;
			fs.files[ root + "/lib/cat3.js" ].content.should.equal( "var c = 3;\nvar d = 4;" );
		} );

		it( "should replace tokens in files", function() {
			fs.files[ root + "/lib/tokenized.js" ].should.be.ok;
			fs.files[ root + "/lib/tokenized.js" ].content.should.equal( "// author: Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)\n" +
			"// project: anvil.js\n" +
			"// version: 0.9.0\n" +
			" var a = 'this value';" );
		} );

		it( "should raise file change event on file change", function( done ) {
			anvil.on( "file.changed", function( fileEvent, file ) {
				fileEvent.should.equal( "change" );
				file.should.equal( root + "/src/test.js" );
				done();
			} );
			fs.write( root + "/src/test.js", "this is new content", function() {} );
		} );
	} );
} );