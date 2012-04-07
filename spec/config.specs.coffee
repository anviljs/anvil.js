_ = require "underscore"
log = require( "./logMock.coffee" ).log
FP = require( "./fsMock.coffee" ).fsProvider
ArgParser = require( "./argParserMock.coffee" ).parser
Configuration = require( "../src/config").configuration
scheduler = require( "../src/scheduler.coffee").scheduler

require "should"

defaultSiteConfig =
	"source": "src"
	"style": "style"
	"markup": "markup"
	"output": 
		{
			"source": [ "lib", "site/js" ],
			"style": [ "css", "site/css" ],
			"markup": "site/"
		}
	"spec": "spec"
	"ext": "ext"
	"lint": {}
	"uglify": {}
	"cssmin": {}
	"gzip": {}
	"hosts": {
	  "/": "site"
	}
	"working": "./tmp"

defaultLibConfig = 
	"source": "src"
	"output": "lib"
	"spec": "spec"
	"ext": "ext"
	"lint": {}
	"uglify": {}
	"gzip": {}
	"hosts": {
	  "/": "spec"
	}
	"working": "./tmp"

class Anvil
	constructor: () ->
	build: () ->

describe "when building in lib without build file", ->
	fp = new FP()
	parser = new ArgParser( {} )
	cp = new Configuration fp, parser, scheduler, log

	it "should provide default lib configuration", ( done ) ->
		cp.configure ( config ) ->
			defaultLibConfig.output = 
				"style": "lib"
				"source": "lib"
				"markup": "lib"
			_.isEqual( config, defaultLibConfig ).should.be.ok
			done()

describe "when building in site without build file", ->
	fp = new FP()
	parser = new ArgParser( {} )
	cp = new Configuration fp, parser, scheduler, log

	before ( done ) ->
		fp.ensurePath "./site", done

	it "should provide default site configuration", ( done ) ->
		cp.configure ( config ) ->
			_.isEqual( config, defaultSiteConfig ).should.be.ok
			done()

describe "when using default build.json file", ->
	fp = new FP()

	build = 
		"source": "thisHereIsMuhSource"
		"output": 
			"style": "lib"
			"source": "lib"
			"markup": "lib"
		"spec": "spec"
		"ext": "ext"
		"lint": {}
		"uglify": {}
		"gzip": {}
		"hosts":
			"/": "spec"
		"finalize": {}
		"wrap": {}
			
	before ( done ) ->
		json = JSON.stringify build
		fp.write "./build.json", json, done

	parser = new ArgParser( {} )
	cp = new Configuration fp, parser, scheduler, log

	it "should use the loaded file", ( complete ) ->
		cp.configure ( config ) ->
			build.working = "./tmp"
			_.isEqual( config, build ).should.be.ok
			complete()

describe "when requesting version", ->
	fp = new FP()
	parser = new ArgParser { "v": true }
	cp = new Configuration fp, parser, scheduler, log

	it "should write version to console", ( done ) ->
		cp.configure ( config ) ->
			_.find( log.messages, ( m ) -> m.match ///Anvil.js.*[0-9].[0-9].[0-9]/// ).should.be.ok
			done()

describe "when specifying CI", ->
	fp = new FP()
	parser = new ArgParser { "ci": true }
	cp = new Configuration fp, parser, scheduler, log

	it "should set continuous flag", ( done ) ->
		cp.configure ( config ) ->
			config.continuous.should.be.ok
			done()

describe "when specifying hosting", ->
	fp = new FP()
	parser = new ArgParser { "host": true }
	cp = new Configuration fp, parser, scheduler, log

	it "should set host flag", ( done ) ->
		cp.configure ( config ) ->
			config.host.should.be.ok
			done()

describe "when specifying pavlov test runner", ->
	fp = new FP()
	parser = new ArgParser { "pavlov": true }
	cp = new Configuration fp, parser, scheduler, log

	it "should set testWith to pavlov", ( done ) ->
		cp.configure ( config ) ->
			config.testWith.should.equal "pavlov"
			done()

describe "when specifying mocha test runner", ->
	fp = new FP()
	parser = new ArgParser { "mocha": true }
	cp = new Configuration fp, parser, scheduler, log

	it "should set testWith to mocha", ( done ) ->
		cp.configure ( config ) ->
			config.testWith.should.equal "mocha"
			done()

describe "when lib scaffold is requested", ->
	fp = new FP()
	parser = new ArgParser { "lib": "newlib" }
	cp = new Configuration fp, parser, scheduler, log

	config = {}
	before ( done ) ->
		cp.configure ( cfg ) -> 
			config = cfg
			done()

	describe "once scaffold is complete", ->
		it "should create source folder", () -> fp.paths["newlib/src"].should.be.ok
		it "should create lib folder", () -> fp.paths["newlib/lib"].should.be.ok
		it "should create ext folder", () -> fp.paths["newlib/ext"].should.be.ok
		it "should create spec folder", () -> fp.paths["newlib/spec"].should.be.ok
		it "should create the standard lib build config", () ->
			# validate that build file is standard site build
			_.isEqual( config, defaultSiteConfig ).should.be.ok

describe "when site scaffold is requested", ->
	fp = new FP()
	parser = new ArgParser { "site": "newSite" }
	cp = new Configuration fp, parser, scheduler, log

	config = {}
	before ( done ) ->
		cp.configure ( cfg ) -> 
			config = cfg
			done()

	describe "once scaffold is complete", ->
		it "should create source folder", () -> fp.paths["newSite/src"].should.be.ok
		it "should create style folder", () -> fp.paths["newSite/style"].should.be.ok
		it "should create markup folder", () -> fp.paths["newSite/markup"].should.be.ok
		it "should create lib folder", () -> fp.paths["newSite/lib"].should.be.ok
		it "should create css folder", () -> fp.paths["newSite/css"].should.be.ok
		it "should create site/css folder", () -> fp.paths["newSite/site/css"].should.be.ok
		it "should create site/js folder", () -> fp.paths["newSite/site/js"].should.be.ok
		it "should create ext folder", () -> fp.paths["newSite/ext"].should.be.ok
		it "should create spec folder", () -> fp.paths["newSite/spec"].should.be.ok
		it "should create the standard site build config", () ->
			# validate that build file is standard site build
			_.isEqual( config, defaultSiteConfig ).should.be.ok

describe "when requesting new lib build file", ->
	fp = new FP()
	parser = new ArgParser( { "libfile": "new" } )
	cp = new Configuration fp, parser, scheduler, log
	
	it "should create the default lib configuration", ( done ) ->
		cp.configure ( config ) ->
			fp.read "new.json", ( content ) ->
				obj = JSON.parse content
				delete obj["testWith"]
				delete obj["host"]
				delete obj["continuous"]

				_.isEqual( obj, defaultLibConfig ).should.be.ok
				done()

describe "when requesting new site build file", ->
	fp = new FP()
	parser = new ArgParser( { "sitefile": "new" } )
	cp = new Configuration fp, parser, scheduler, log
	
	it "should create the default site configuration", ( done ) ->
		cp.configure ( config ) ->
			fp.read "new.json", ( content ) ->
				obj = JSON.parse content
				delete obj["testWith"]
				delete obj["host"]
				delete obj["continuous"]

				_.isEqual( obj, defaultSiteConfig ).should.be.ok
				done()

describe "when requesting creation of HTML file", ->
	fp = new FP()
	parser = new ArgParser( { "html": "new" } )
	cp = new Configuration fp, parser, scheduler, log

	it "should create an html file with script tags for all lib and ext files", ( done ) ->
		cp.configure ( config ) ->
			cp.configure ( config ) ->
			config.genHtml.should.equal "new"
			done()

describe "when finalize has string header only", ->
	fp = new FP()

	build = 
		"source": "thisHereIsMuhSource"
		"output": 
			"style": "lib"
			"source": "lib"
			"markup": "lib"
		"spec": "spec"
		"ext": "ext"
		"lint": {}
		"uglify": {}
		"gzip": {}
		"hosts":
			"/": "spec"
		"finalize": 
			"header": "// this is a test header"
			
	expected =
		"source": "thisHereIsMuhSource"
		"output": 
			"style": "lib"
			"source": "lib"
			"markup": "lib"
		"spec": "spec"
		"ext": "ext"
		"lint": {}
		"uglify": {}
		"gzip": {}
		"hosts":
			"/": "spec"
		"finalize": 
			"source": 
				"header": "// this is a test header"
				"footer": ""
		"working": "./tmp"

	before ( done ) ->
		json = JSON.stringify build
		fp.write "./build.json", json, done

	parser = new ArgParser( {} )
	cp = new Configuration fp, parser, scheduler, log

	it "should use the loaded file", ( complete ) ->
		cp.configure ( config ) ->
			build.working = "./tmp"
			_.isEqual( config, expected ).should.be.ok
			complete()

describe "when finalize has a file header only", ->
	fp = new FP()

	build = 
		"source": "thisHereIsMuhSource"
		"output": 
			"style": "lib"
			"source": "lib"
			"markup": "lib"
		"spec": "spec"
		"ext": "ext"
		"lint": {}
		"uglify": {}
		"gzip": {}
		"hosts":
			"/": "spec"
		"finalize": 
			"header-file": "test.txt"
			
	expected =
		"source": "thisHereIsMuhSource"
		"output": 
			"style": "lib"
			"source": "lib"
			"markup": "lib"
		"spec": "spec"
		"ext": "ext"
		"lint": {}
		"uglify": {}
		"gzip": {}
		"hosts":
			"/": "spec"
		"finalize": 
			"source": 
				"header": "// this is a test header"
				"footer": ""
		"working": "./tmp"

	before ( done ) ->
		json = JSON.stringify build
		fp.write "./build.json", json, () ->
			fp.write "test.txt", "// this is a test header", done

	parser = new ArgParser( {} )
	cp = new Configuration fp, parser, scheduler, log

	it "should use the loaded file", ( complete ) ->
		cp.configure ( config ) ->
			build.working = "./tmp"
			_.isEqual( config, expected ).should.be.ok
			complete()




