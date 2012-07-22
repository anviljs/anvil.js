var factory = function( _, fs, path, scheduler, realFS ) {

	var root = path.resolve( "./" );
	var source = path.resolve( "./src" );

	var js1 = {
		path: source,
		name: "a.js",
		source: "var a = 'a';" +
				"\nvar f = function() {" +
				"\n   // import( 'b.js' )" +
				"\n};"
	};

	var js2 = {
		path: source,
		name: "b.js",
		source: "var b = 'b';"
	};

	var js3 = {
		path: source,
		name: "test.js",
		source: "var x = 'test';"
	};

	var js4 = {
		path: source + "/parent/sibling1/",
		name: "c.js",
		source: "var c = 'this is contrived!';"
	};

	var js5 = {
		path: source + "/parent/sibling2/",
		name: "d.js",
		source: "// import( '../sibling1/c.js' )"
	};

	var js6 = {
		path: source + "/parent/",
		name: "e.js",
		source: "// import( './sibling2/d.js' )"
	};

	var js7 = {
		path: source + "/parts/",
		name: "f.js",
		source: "var a = '1';"
	};

	var js8 = {
		path: source + "/parts/",
		name: "g.js",
		source: "var b = '2';"
	};

	var js9 = {
		path: source + "/parts/",
		name: "h.js",
		source: "var c = '3';"
	};

	var js10 = {
		path: source + "/parts/",
		name: "i.js",
		source: "var a = 1;"
	};
	var js11 = {
		path: source + "/parts/",
		name: "j.js",
		source: "var b = 2;"
	};
	var js12 = {
		path: source + "/parts/",
		name: "k.js",
		source: "var c = 3;"
	};
	var js13 = {
		path: source + "/parts/",
		name: "l.js",
		source: "var d = 4;"
	};

	var yaml1 = {
		path: source,
		name: "./cat1.js.yaml",
		source: "- ./parts/f.js\n" +
				"- ./parts/g.js\n" +
				"- ./parts/h.js"
	};

	var yaml2 = {
		path: source,
		name: "./data.yaml",
		source: "- minding\n" +
				"- my\n" +
				"- business"
	};

	var json1 = {
		path: source,
		name: "./cat4.js.json",
		source: '{ "imports": [ "./parts/f.js", "./parts/g.js", "./parts/h.js" ] }'
	};

	var json2 = {
		path: source,
		name: "./cat2.js.json",
		source: '{ "datums": [ "minding", "my", "business" ] }'
	};

	var concatList1 = {
		path: "/special/",
		name: "concat.yaml",
		source: "./cat2.js:\n" +
				"	- ./parts/i.js\n" +
				"	- ./parts/j.js\n" +
				"./cat3.js:\n" +
				"	- ./parts/k.js\n" +
				"	- ./parts/l.js\n"
	};

	var tokenized = {
		path: source,
		name: "tokenized.js",
		source: "// author: {{{author}}}\n" +
				"// project: {{{name}}}\n" +
				"// version: {{{version}}}\n" +
				" var a = '{{{key}}}';"
	};

	var valueFile = {
		path: "./",
		name: "values.yaml",
		source: "key: this value"
	};

	var buildFile = {
		path: root,
		name: "build.json",
		source: '{\n' +
				'	"source": "./src",\n' +
				'	"output": "./lib",\n' +
				'	"spec": "./spec"\n' +
				'}'
	};

	var files = [
		js1, js2, js3, js4, js5, js6, js7, js8, js9, js10, js11, js12, js13,
		yaml1, yaml2, json1, json2,
		concatList1, tokenized, valueFile, buildFile
	];

	return function( done ) {
		var write = function( file, done ) {
			fs.write( [ file.path, file.name ], file.source, done );
		};
		scheduler.parallel( files, write, function() {
			realFS.readFile( "./package.json", "utf8", function( error, content ) {
				if( !error ) {
					fs.write( "./package.json", content, done );
				} else {
					done();
				}
			} );
		} );
	};
};

module.exports = factory;
