_ = require "underscore"
log = require( "./logMock.coffee" ).log
FP = require( "./fsMock.coffee" ).fsProvider
Compiler = require( "../src/compile.coffee").compiler
Combiner = require( "../src/combiner.coffee").combiner
path = require "path"
Scheduler = require( "../src/scheduler.coffee").scheduler
scheduler = new Scheduler()

require "should"

fp = new FP()

htmlFindPatterns = [ 	///[\<][!][-]{2}.?import[(]?.?['\"].*['\"].?[)]?.?[-]{2}[\>]///g ]
htmlReplacePatterns = [ ///[\<][!][-]{2}.?import[(]?.?['\"]replace['\"].?[)]?.?[-]{2}[\>]///g ]

sourceFindPatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?///g ]
sourceReplacePatterns = [ ///([/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?///g ]

###
cssFindPatterns = [ ///@import[(]?.?[\"'].*[.]css[\"'].?[)]?///g ]
cssReplacePatterns = [ ///@import[(]?.?[\"']replace[\"'].?[)]?///g ]
###

cssFindPatterns = [ ///([/]{2}|[/][*]).?import[(]?.?[\"'].*[\"'].?[)]?([*][/])?///g ]
cssReplacePatterns = [ ///([/]{2}|[/][*]).?import[(]?.?[\"']replace[\"'].?[)]?([*][/])?///g ]

stripSpace = ( content ) -> content.replace ///\s///g, ""
compareOutput = ( one, two ) ->  ( stripSpace one ).should.equal ( stripSpace two )

coffeeOneTxt = """
	call: () ->
		### import 'two.coffee'
"""

coffeeTwoTxt = """
	console.log 'This example is weak-sauce'
"""

coffeeThreeTxt = """
	class Container
		### import 'one.coffee'
"""

jsFourTxt = """
	call: function() {
		// import( 'five.js' );
	}
"""

jsFiveTxt = """
	console.log( 'This example is weak-sauce' );
"""

jsSixTxt = """
	var Container = function() {
		// import( 'four.js' );	
	};
"""

cssOneTxt = """
	/* import 'two.css' */
"""

cssTwoTxt = """
	.stylin {
		margin: .25em;
	}
"""

ignoredTxt = """
RAWR
"""

coffeeFinalTxt = """
	class Container
		call: () ->
			console.log 'This example is weak-sauce'
"""

jsFinalTxt = """
	var Container = function() {
		call: function() {
			console.log( 'This example is weak-sauce' );
		}
	};
"""

cssFinalTxt = """
	.stylin {
		margin: .25em;
	}
"""

htmlText = """
<html>
	<head>
		<script type="text/coffeescript">
			<!-- import( "three.coffee" ) -->
		</script>

		<script type="text/javascript">
			<!-- import( "six.js" ) -->
		</script>

		<style type="text/css">
			<!-- import( "one.css" ) -->
		</style>
	</head>
	<body>
	</body>
</html>
"""

htmlFinalText = """
<html>
	<head>
		<script type="text/coffeescript">
			class Container
				call: () ->
					console.log 'This example is weak-sauce'
		</script>

		<script type="text/javascript">
			var Container = function() {
				call: function() {
					console.log( 'This example is weak-sauce' );
				}
			};
		</script>

		<style type="text/css">
			.stylin {
				margin: .25em;
			}
		</style>
	</head>
	<body>
	</body>
</html>
"""

createFile = ( local, name, working, content ) ->
	dependents: 0
	ext: () -> path.extname name
	fullPath: path.join working, name
	imports: []
	name: name
	originalName: name
	relativePath: working
	workingPath: working
	content: content
	combined: false

oneCoffee = createFile "source", "one.coffee", "tmp", coffeeOneTxt
twoCoffee = createFile "source", "two.coffee", "tmp", coffeeTwoTxt
threeCoffee = createFile "source", "three.coffee", "tmp", coffeeThreeTxt

fourJs = createFile "source", "four.js", "tmp", jsFourTxt
fiveJs = createFile "source", "five.js", "tmp", jsFiveTxt
sixJs = createFile "source", "six.js", "tmp", jsSixTxt

oneCss = createFile "style", "one.css", "tmp", cssOneTxt
twoCss = createFile "style", "two.css", "tmp", cssTwoTxt
ignored = createFile "style", "ignored.less", "tmp", ignoredTxt

htmlFile = createFile "markup", "one.html", "tmp", htmlText

all = [ oneCoffee, twoCoffee, threeCoffee, fourJs, fiveJs, sixJs, oneCss, twoCss, ignored, htmlFile ]

describe "when adding files for tests", ->

	it "should have created all files", ( ready ) ->
		scheduler.parallel( 
			all, 
			( x, done ) -> 
				fp.write x.fullPath, x.content, done
			, () -> ready()
		)

describe "when getting imports for coffeescript", ->

	combine = new Combiner fp, scheduler, sourceFindPatterns, sourceReplacePatterns
	coffeeFiles = [ oneCoffee, twoCoffee, threeCoffee ]
	findImport = ( file, done ) ->
		combine.findImports file, coffeeFiles, done

	before ( done ) ->
		scheduler.parallel coffeeFiles, findImport, () -> done()

	it "one.coffee should have 1 import", () ->
		oneCoffee.imports.length.should.equal 1

	it "one.coffee should import two.coffee", () ->
		oneCoffee.imports[0].name.should.equal "two.coffee"

	it "three.coffee should have 1 import", () ->
		threeCoffee.imports.length.should.equal 1

	it "three.coffee should import one.coffee", () ->
		threeCoffee.imports[0].name.should.equal "one.coffee"

	it "two.coffee should have no imports", () ->
		twoCoffee.imports.length.should.equal 0

describe "when getting dependencies for coffeescript", ->
	combine = new Combiner fp, scheduler, sourceFindPatterns, sourceReplacePatterns
	coffeeFiles = [ oneCoffee, twoCoffee, threeCoffee ]
	
	before () ->
		for f in coffeeFiles
			combine.findDependents f, coffeeFiles

	it "one.coffee should have 1 dependent", () ->
		oneCoffee.dependents.should.equal 1

	it "two.coffee should have 1 dependent", () ->
		twoCoffee.dependents.should.equal 1

	it "three.coffee should have no dependents", () ->
		threeCoffee.dependents.should.equal 0

describe "when combining coffee files", ->
	combine = new Combiner fp, scheduler, sourceFindPatterns, sourceReplacePatterns
	coffeeFiles = [ oneCoffee, twoCoffee, threeCoffee ]

	wrapper = ( f, done ) ->
		combine.combineFile f, done

	before ( done ) ->
		scheduler.parallel coffeeFiles, wrapper, () -> done()

	it "should combine files correctly", ( done ) ->
		fp.read [ threeCoffee.workingPath, threeCoffee.name ], ( content ) ->
			compareOutput content, coffeeFinalTxt
			done()

describe "when combining js files", ->
	combine = new Combiner fp, scheduler, sourceFindPatterns, sourceReplacePatterns
	jsFiles = [ fourJs, fiveJs, sixJs ]

	before ( done ) ->
		combine.combineList jsFiles, () -> done()

	it "should combine files correctly", ( done ) ->
		fp.read [ sixJs.workingPath, sixJs.name ], ( content ) ->
			compareOutput content, jsFinalTxt
			done()

describe "when getting imports for css", ->

	combine = new Combiner fp, scheduler, cssFindPatterns, cssReplacePatterns
	cssFiles = [ oneCss, twoCss, ignored ]
	findImport = ( file, done ) ->
		combine.findImports file, cssFiles, done

	before ( done ) ->
		scheduler.parallel cssFiles, findImport, () -> done()

	it "one.css should have 1 import", () ->
		oneCss.imports.length.should.equal 1

	it "one.css should import two.css", () ->
		oneCss.imports[0].name.should.equal "two.css"

	it "two.coffee should have no imports", () ->
		twoCoffee.imports.length.should.equal 0

describe "when getting dependencies for css", ->
	combine = new Combiner fp, scheduler, cssFindPatterns, cssReplacePatterns
	cssFiles = [ oneCss, twoCss, ignored ]
	
	before () ->
		for f in cssFiles
			combine.findDependents f, cssFiles

	it "one.css should have no dependents", () ->
		oneCss.dependents.should.equal 0

	it "two.css should have 1 dependent", () ->
		twoCss.dependents.should.equal 1

describe "when combining css files", ->
	combine = new Combiner fp, scheduler, cssFindPatterns, cssReplacePatterns
	cssFiles = [ oneCss, twoCss, ignored ]

	before ( done ) ->
		combine.combineList cssFiles, () -> done()

	it "should combine files correctly", ( done ) ->
		fp.read [ oneCss.workingPath, oneCss.name ], ( content ) ->
			compareOutput content, cssFinalTxt
			done()


describe "when getting imports for html", ->

	combine = new Combiner fp, scheduler, htmlFindPatterns, htmlReplacePatterns
	htmlFiles = [ htmlFile ]
	findImport = ( file, done ) ->
		combine.findImports file, all, done

	before ( done ) ->
		scheduler.parallel htmlFiles, findImport, () -> done()

	it "one.html should have 3 import", () ->
		htmlFile.imports.length.should.equal 3

	it "one.html should import one.css", () ->
		htmlFile.imports[2].name.should.equal "one.css"

	it "one.html should import three.coffee", () ->
		htmlFile.imports[0].name.should.equal "three.coffee"

	it "one.html should import six.js", () ->
		htmlFile.imports[1].name.should.equal "six.js"

describe "when combining html with other resources", ->
	combine = new Combiner fp, scheduler, htmlFindPatterns, htmlReplacePatterns
	htmlFiles = [ htmlFile ]

	before ( done ) ->
		combine.combineFile htmlFile, () -> done()

	it "should combine files correctly", ( done ) ->
		fp.read [ htmlFile.workingPath, htmlFile.name ], ( content ) ->
			compareOutput content, htmlFinalText
			done()