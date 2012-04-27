
var Combiner, FP, Scheduler, all, coffeeFinalTxt, coffeeOneTxt, coffeeThreeTxt, coffeeTwoTxt, compareOutput, createFile, cssFinalTxt, cssFindPatterns, cssOneTxt, cssReplacePatterns, cssTwoTxt, fiveJs, fourJs, fp, htmlFile, htmlFinalText, htmlFindPatterns, htmlReplacePatterns, htmlText, ignored, ignoredTxt, indentChild, indentChildCoffee, indentGrandChild, indentGrandChildCoffee, indentHost, indentHostCoffee, indentResult, indentResultCoffee, jsFinalTxt, jsFiveTxt, jsFourTxt, jsSixTxt, log, oneCoffee, oneCss, path, scheduler, sixJs, sourceFindPatterns, sourceReplacePatterns, stripSpace, threeCoffee, twoCoffee, twoCss, _;

_ = require("underscore");

log = require("./logMock.js").log;

FP = require("./fsMock.js").fsProvider;

path = require("path");
Scheduler = require("../src/scheduler.js")( _ );
fp = new FP();
scheduler = new Scheduler();

Combiner = require("../src/combiner.js")(_, fp, scheduler);

require("should");

htmlFindPatterns = [/[\<][!][-]{2}.?import[(]?.?['\"].*['\"].?[)]?.?[-]{2}[\>]/g];

htmlReplacePatterns = [/([\t]*)[\<][!][-]{2}.?import[(]?.?['\"]replace['\"].?[)]?.?[-]{2}[\>]/g];

sourceFindPatterns = [/([\/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?[\#]{0,3}/g];

sourceReplacePatterns = [/([\t]*)([\/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?.?[\#]{0,3}/g];

/*
cssFindPatterns = [ ///@import[(]?.?[\"'].*[.]css[\"'].?[)]?///g ]
cssReplacePatterns = [ ///@import[(]?.?[\"']replace[\"'].?[)]?///g ]
*/


cssFindPatterns = [/([\/]{2}|[\/][*]).?import[(]?.?[\"'].*[\"'].?[)]?([*][\/])?/g];

cssReplacePatterns = [/([\t]*)([\/]{2}|[\/][*]).?import[(]?.?[\"']replace[\"'].?[)]?([*][\/])?/g];

stripSpace = function(content) {
	return content.replace(/\s/g, "");
};

compareOutput = function(one, two) {
	return (stripSpace(one)).should.equal(stripSpace(two));
};

coffeeOneTxt = "call: () ->\n	### import 'two.coffee'";

coffeeTwoTxt = "console.log 'This example is weak-sauce'";

coffeeThreeTxt = "class Container\n	### import 'one.coffee'";

jsFourTxt = "call: function() {\n	// import( 'five.js' );\n}";

jsFiveTxt = "console.log( 'This example is weak-sauce' );";

jsSixTxt = "var Container = function() {\n	// import( 'four.js' );	\n};";

cssOneTxt = "/* import 'two.css' */";

cssTwoTxt = ".stylin {\n	margin: .25em;\n}";

ignoredTxt = "RAWR";

coffeeFinalTxt = "class Container\n	call: () ->\n		console.log 'This example is weak-sauce'";

jsFinalTxt = "var Container = function() {\n	call: function() {\n		console.log( 'This example is weak-sauce' );\n	}\n};";

cssFinalTxt = ".stylin {\n	margin: .25em;\n}";

htmlText = "<html>\n	<head>\n		<script type=\"text/coffeescript\">\n			<!-- import( \"three.coffee\" ) -->\n		</script>\n\n		<script type=\"text/javascript\">\n			<!-- import( \"six.js\" ) -->\n		</script>\n\n		<style type=\"text/css\">\n			<!-- import( \"one.css\" ) -->\n		</style>\n	</head>\n	<body>\n	</body>\n</html>";

htmlFinalText = "<html>\n	<head>\n		<script type=\"text/coffeescript\">\n			class Container\n				call: () ->\n					console.log 'This example is weak-sauce'\n		</script>\n\n		<script type=\"text/javascript\">\n			var Container = function() {\n				call: function() {\n					console.log( 'This example is weak-sauce' );\n				}\n			};\n		</script>\n\n		<style type=\"text/css\">\n			.stylin {\n				margin: .25em;\n			}\n		</style>\n	</head>\n	<body>\n	</body>\n</html>";

indentHostCoffee = "test = () ->\n	###import 'indentChild.coffee' ###";

indentChildCoffee = "printStuff: () ->\n\n	###import 'indentGrandChild.coffee' ###\n\n";

indentGrandChildCoffee = "console.log \"this is just some text and stuff\"\nconsole.log \"this is a second line, just to be sure\"";

indentResultCoffee = "test = () ->\n	printStuff: () ->\n\n		console.log \"this is just some text and stuff\"\n		console.log \"this is a second line, just to be sure\"\n\n";

createFile = function(local, name, working, content) {
	return {
		dependents: 0,
		ext: function() {
			return path.extname(name);
		},
		fullPath: path.join(working, name),
		imports: [],
		name: name,
		originalName: name,
		relativePath: working,
		workingPath: working,
		content: content,
		combined: false
	};
};

oneCoffee = createFile("source", "one.coffee", "tmp", coffeeOneTxt);
twoCoffee = createFile("source", "two.coffee", "tmp", coffeeTwoTxt);
threeCoffee = createFile("source", "three.coffee", "tmp", coffeeThreeTxt);
fourJs = createFile("source", "four.js", "tmp", jsFourTxt);
fiveJs = createFile("source", "five.js", "tmp", jsFiveTxt);
sixJs = createFile("source", "six.js", "tmp", jsSixTxt);
oneCss = createFile("style", "one.css", "tmp", cssOneTxt);
twoCss = createFile("style", "two.css", "tmp", cssTwoTxt);
ignored = createFile("style", "ignored.less", "tmp", ignoredTxt);
htmlFile = createFile("markup", "one.html", "tmp", htmlText);
indentHost = createFile("source", "indentHost.coffee", "tmp", indentHostCoffee);
indentChild = createFile("source", "indentChild.coffeee", "tmp", indentChildCoffee);
indentGrandChild = createFile("source", "indentGrandChild.coffeee", "tmp", indentGrandChildCoffee);
indentResult = createFile("source", "indentResult.coffee", "tmp", indentResultCoffee);
all = [oneCoffee, twoCoffee, threeCoffee, fourJs, fiveJs, sixJs, oneCss, twoCss, ignored, htmlFile, indentHost, indentChild, indentGrandChild, indentResult];

describe("when adding files for tests", function() {
	return it("should have created all files", function(ready) {
		return scheduler.parallel(all, function(x, done) {
			return fp.write(x.fullPath, x.content, done);
		}, function() {
			return ready();
		});
	});
});

describe("when getting imports for coffeescript", function() {
	var coffeeFiles, combine, findImport;
	combine = new Combiner( sourceFindPatterns, sourceReplacePatterns );
	coffeeFiles = [oneCoffee, twoCoffee, threeCoffee];
	findImport = function(file, done) {
		return combine.findImports(file, coffeeFiles, done);
	};
	before(function(done) {
		return scheduler.parallel(coffeeFiles, findImport, function() {
			return done();
		});
	});
	it("one.coffee should have 1 import", function() {
		return oneCoffee.imports.length.should.equal(1);
	});
	it("one.coffee should import two.coffee", function() {
		return oneCoffee.imports[0].name.should.equal("two.coffee");
	});
	it("three.coffee should have 1 import", function() {
		return threeCoffee.imports.length.should.equal(1);
	});
	it("three.coffee should import one.coffee", function() {
		return threeCoffee.imports[0].name.should.equal("one.coffee");
	});
	it("two.coffee should have no imports", function() {
		return twoCoffee.imports.length.should.equal(0);
	});
});

describe("when getting dependencies for coffeescript", function() {
	var coffeeFiles, combine;
	combine = new Combiner( sourceFindPatterns, sourceReplacePatterns );
	coffeeFiles = [oneCoffee, twoCoffee, threeCoffee];
	before(function() {
		var f, _i, _len, _results;
		_results = [];
		for (_i = 0, _len = coffeeFiles.length; _i < _len; _i++) {
			f = coffeeFiles[_i];
			_results.push(combine.findDependents(f, coffeeFiles));
		}
		return _results;
	});
	it("one.coffee should have 1 dependent", function() {
		return oneCoffee.dependents.should.equal(1);
	});
	it("two.coffee should have 1 dependent", function() {
		return twoCoffee.dependents.should.equal(1);
	});
	return it("three.coffee should have no dependents", function() {
		return threeCoffee.dependents.should.equal(0);
	});
});

describe("when combining coffee files", function() {
	var coffeeFiles, combine, wrapper;
	combine = new Combiner( sourceFindPatterns, sourceReplacePatterns );
	coffeeFiles = [oneCoffee, twoCoffee, threeCoffee];
	wrapper = function(f, done) {
		return combine.combineFile(f, done);
	};
	before(function(done) {
		return scheduler.parallel(coffeeFiles, wrapper, function() {
			return done();
		});
	});
	return it("should combine files correctly", function(done) {
		return fp.read([threeCoffee.workingPath, threeCoffee.name], function(content) {
			compareOutput(content, coffeeFinalTxt);
			return done();
		});
	});
});

describe("when combining js files", function() {
	var combine, jsFiles;
	combine = new Combiner( sourceFindPatterns, sourceReplacePatterns );
	jsFiles = [fourJs, fiveJs, sixJs];
	before(function(done) {
		return combine.combineList(jsFiles, function() {
			return done();
		});
	});
	return it("should combine files correctly", function(done) {
		return fp.read([sixJs.workingPath, sixJs.name], function(content) {
			compareOutput(content, jsFinalTxt);
			return done();
		});
	});
});

describe("when getting imports for css", function() {
	var combine, cssFiles, findImport;
	combine = new Combiner( cssFindPatterns, cssReplacePatterns );
	cssFiles = [oneCss, twoCss, ignored];
	findImport = function(file, done) {
		return combine.findImports(file, cssFiles, done);
	};
	before(function(done) {
		return scheduler.parallel(cssFiles, findImport, function() {
			return done();
		});
	});
	it("one.css should have 1 import", function() {
		return oneCss.imports.length.should.equal(1);
	});
	it("one.css should import two.css", function() {
		return oneCss.imports[0].name.should.equal("two.css");
	});
	return it("two.coffee should have no imports", function() {
		return twoCoffee.imports.length.should.equal(0);
	});
});

describe("when getting dependencies for css", function() {
	var combine, cssFiles;
	combine = new Combiner( cssFindPatterns, cssReplacePatterns );
	cssFiles = [oneCss, twoCss, ignored];
	before(function() {
		var f, _i, _len, _results;
		_results = [];
		for (_i = 0, _len = cssFiles.length; _i < _len; _i++) {
			f = cssFiles[_i];
			_results.push(combine.findDependents(f, cssFiles));
		}
		return _results;
	});
	it("one.css should have no dependents", function() {
		return oneCss.dependents.should.equal(0);
	});
	return it("two.css should have 1 dependent", function() {
		return twoCss.dependents.should.equal(1);
	});
});

describe("when combining css files", function() {
	var combine, cssFiles;
	combine = new Combiner( cssFindPatterns, cssReplacePatterns );
	cssFiles = [oneCss, twoCss, ignored];
	before(function(done) {
		return combine.combineList(cssFiles, function() {
			return done();
		});
	});
	return it("should combine files correctly", function(done) {
		return fp.read([oneCss.workingPath, oneCss.name], function(content) {
			compareOutput(content, cssFinalTxt);
			return done();
		});
	});
});

describe("when getting imports for html", function() {
	var combine, findImport, htmlFiles;
	combine = new Combiner( htmlFindPatterns, htmlReplacePatterns );
	htmlFiles = [htmlFile];
	findImport = function(file, done) {
		return combine.findImports(file, all, done);
	};
	before(function(done) {
		return scheduler.parallel(htmlFiles, findImport, function() {
			return done();
		});
	});
	it("one.html should have 3 import", function() {
		return htmlFile.imports.length.should.equal(3);
	});
	it("one.html should import one.css", function() {
		return htmlFile.imports[2].name.should.equal("one.css");
	});
	it("one.html should import three.coffee", function() {
		return htmlFile.imports[0].name.should.equal("three.coffee");
	});
	return it("one.html should import six.js", function() {
		return htmlFile.imports[1].name.should.equal("six.js");
	});
});

describe("when combining html with other resources", function() {
	var combine, htmlFiles;
	combine = new Combiner( htmlFindPatterns, htmlReplacePatterns );
	htmlFiles = [htmlFile];
	before(function(done) {
		return combine.combineFile(htmlFile, function() {
			return done();
		});
	});
	return it("should combine files correctly", function(done) {
		return fp.read([htmlFile.workingPath, htmlFile.name], function(content) {
			compareOutput(content, htmlFinalText);
			return done();
		});
	});
});

describe("when combining files with indented import statements", function() {
	var coffeeFiles, combine, wrapper;
	combine = new Combiner( sourceFindPatterns, sourceReplacePatterns );
	coffeeFiles = [indentHost, indentChild, indentGrandChild];
	wrapper = function(f, done) {
		return combine.combineFile(f, done);
	};
	before(function(done) {
		return scheduler.parallel(coffeeFiles, wrapper, function() {
			return done();
		});
	});
	return it("should combine files correctly", function(done) {
		return fp.read([indentResult.workingPath, indentResult.name], function(content) {
			content.should.equal(indentResultCoffee);
			return done();
		});
	});
});
