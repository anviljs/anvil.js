require( "should" );

 _ = require( "underscore" );
var commander = require( "commander" );
var machina = require( "machina" );
var postal = require( "postal" );
var path = require( "path" );
var fs = require( "./fs.mock.js" )( _, path );
var scheduler = require( "../src/scheduler.js" )( _ );
var events = require( "../src/eventAggregator.js" )( _ );
var bus = require( "../src/bus.js")( _, postal );
var anvil = require( "../src/anvil.js" )( _, scheduler, fs, events, bus );
var log = require( "./log.mock.js" )( anvil );
var manager = require( "../src/pluginManager.js" )( _, anvil );
var locator = require( "../src/pluginLocator.js" )( _, manager, anvil );
var config = require( "../src/config.js" )( _, commander, path, anvil );
var activityManager = require( "../src/activityManager.js" )( _, machina, anvil );

var root = path.resolve( "./" );
var combinedA = "var a = 'a';" +
"\nvar f = function() {" +
"\n   var b = 'b';" +
"\n};";

var js1 = {
	path: root,
	name: "a.js",
	source: "var a = 'a';" +
			"\nvar f = function() {" +
			"\n   // import( 'b.js' )" +
			"\n};"
};

var js2 = {
	path: root,
	name: "b.js",
	source: "var b = 'b';"
};

var js3 = {
	path: root,
	name: "test.js",
	source: "var x = 'test';"
};

var js4 = {
	path: root + "/parent/sibling1/",
	name: "c.js",
	source: "var c = 'this is contrived!';"
};

var js5 = {
	path: root + "/parent/sibling2/",
	name: "d.js",
	source: "// import( '../sibling1/c.js' )"
};

var js6 = {
	path: root + "/parent/",
	name: "e.js",
	source: "// import( './sibling2/d.js' )"
};

files = [
	js1, js2, js3, js4, js5, js6
];

var write = function( file, done ) {
	fs.write( [ file.path, file.name ], file.source, done );
};

describe( "when scanning project directory with file plugin", function() {
	
	before( function( done ) {
		anvil.scheduler.parallel( files, write, function() { done(); } );
	} );

	describe( "when spinning up system for build", function() {

		var buildComplete = false;
		before( function( done ) {
			events.on( "build.done", function() {
				buildComplete = true;
				done();
			} );
			anvil.config.source = "./";
			config.initialize( [ "node", "anvil" ] );
		} );

		it( "should complete build", function() {
			buildComplete.should.be.true;
		} );

		it( "should have loaded all files", function() {
			anvil.project.files.length.should.be.greaterThan( 1 );
		} );

		it( "should raise file change event on file change", function( done ) {
			anvil.events.on( "file.changed", function( fileEvent, file ) {
				fileEvent.should.equal( "change" );
				file.should.equal( root + "/test.js" );
				done();
			} );
			fs.write( root + "/test.js", "this is new content", function() {} );
		} );

		it( "should copy files to working path", function() {
			fs.files[ root + "/.anvil/tmp/test.js" ].should.be.ok;
		} );

		it( "should have rewritten changed content to working folder", function() {
			fs.files[ root + "/.anvil/tmp/test.js" ].content.should.equal( "this is new content" );
		} );

		it( "should have combined a.js", function() {
			fs.files[ root + "/.anvil/tmp/a.js" ].content.should.equal( combinedA );
		} );

		it( "should have combined d.js", function() {
			fs.files[ root + "/.anvil/tmp/parent/sibling2/d.js" ].content.should.equal( js4.source );
		} );

		it( "should have combined e.js", function() {
			fs.files[ root + "/.anvil/tmp/parent/e.js" ].content.should.equal( js4.source );
		} );

		it( "should have written files to output", function() {
			fs.files[ root + "/build/a.js" ].should.be.ok;
			fs.files[ root + "/build/test.js" ].should.be.ok;
			fs.files[ root + "/build/parent/e.js" ].should.be.ok;
		} );
	} );
} );