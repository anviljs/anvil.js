# Anvil

I wanted a way to build a single javascript module from several source files. Jake/Rake/Make aren't really doing enough for me. Everything else I found that came close was also trying to enforce how that output got used (Ender, Require, etc.).

I built anvil for myself, but I hope others find it useful.

## What Does It Do?

Here's the current feature list:

* Create simple directory structure for new projects
* Create build.json files
* Combine multiple js or coffee files
* Compile coffee files into js (can be turned off to maintain coffee output)
* Lint resulting file(s)
* Uglify resulting file(s)
* Gzip resulting file(s)
* Run in a CI mode where anvil will re-compile the project on source file changes
* Dynamically generate a pavlov test page
    * Hosted on localhost:1580
    * Auto-refresh of the test page on code changes (thanks to @ifandelse
* Host integration pages at 3080
    * Defaults to hosting ./html at / in the uri
    * Now configurable and can host multiple directories at specified URIs
* Create integration page stubs including all external dependencies and build output

## Installation

    npm install anvil.js -g

## By Convention

Without a build file, Anvil will make assumptions. Here's the list:

* All your source will be in ./src
* Your output will go to ./lib
* You want .coffee files compiled to .js
* Your final files will get run through lint
* Your final files will then be uglified as *.min.js
* Your final files will then be gzipped as *.min.gz.js

There isn't a wrapper by convention.

## The Build File

    {
        "source": "src",
        "output": "build",
        "lint": {},
        "uglify": {},
        "gzip": {},
        "extensions": { "uglify": "min", "gzip": "gz" },
        "wrap": {
            "prefix|prefix-file": "(function(context) {",
            "suffix|suffix-file": "})(this);"
        },
        "finalize:" {
            "header|header-file": "this is some unprocessed text or a file name",
            "footer|footer-file": "this is some unprocessed text or a file name"
        }
    }

* source is where Anvil expects *all* your code. Don't get fancy or Anvil can't help you :(
* output is where Anvil will write all the build output and temp files. This should NOT be the same as source.
* lint specifies that you want your output files run through JSLint before Uglify and Gzip occur.
* uglify specifies that you want your output uglified. (happens before gzip)
* gzip specifies that you want your output gzipped.

* wrap
    * prefix prepends the following string to your output files.
    * suffix appends the following string to your output files.
    * If prefix-file or suffix-file is provided instead, the file will be read and the contents used

* finalize
    * header prepends the following string to the final output ONLY.
    * footer appends the following string to the final output ONLY.
    * If header-file or footer-file is provided, the file will be read and the contents used
    * this section was added to support adding boiler plate text headers to minified/gzipped output

There's also another option called justCoffee that will cause anvil to maintain all output in coffeescript instead of compiling it to js.

## Jumpstart New Projects

Anvil will build a set of standard project directories for you and even spit out a build.json file based on the conventional use.

    anvil -n <projectName>

Will produce a directory structure that looks like this:

    -projectName
        |-ext
        |-src
        |-lib
        |-spec
        build.json


## Building By Convention

If you don't specify your own build file, anvil assumes you intend to use a build.json file. If one isn't present, it will use its own conventions to build your project. If that's all you need, great! Chances are you'll want a build.json that's configured for your specific project.

## Combining source files

Anvil allows you to combine source files by using a commented command

**Javascript**

    //import("dependency.js");

**Coffeescript**

    ###import "dependency.js" ###

When you use Anvil to compile your project, it will traverse all the files in your source directory and combine them so that your top level files are what get output. **Warning** Currently, Anvil is not clever enough to detect circular import statements and it will break the world if you do this.

## Building With Specific Build Files

To build with a specific build file type

    anvil -b <buildfile>

## Creating New / Additional Build Files

To create a build file, you can just type the following:

    anvil -t <buildfile>

and it will create the build file for you. If you don't include the file name, anvil will create a build.json (possibly overwriting your existing one, be careful!)

## Continuous Integration

Anvil will watch your source directory for changes and rebuild the project in the event any changes are saved to the files in the directory.

    anvil --ci

## Hosting

Anvil provides local hosting for pavlov test specification and integration tests via express.

### External Dependencies

External dependencies get included in pavlov host pages and integration pages. The default directory these are stored in is "ext"

### Fun With Coffee

External dependencies, lib files and specs can all be written in coffee script provided the files have a .coffee file extension. Anvil will translate these on-the-fly and serve the js to the browser.

### Pavlov Hosting

Anvil will generate a pavlov test page for your output and host it in express at port 1580. All scripts in the lib, ext and spec folders will be included in this test page. The pavlov, qunit and jquery resources are symlinked into your root directory so that express will load these files correctly.

Thanks to a contribution from @ifandelse, if you're using the CI feature, the test page will automatically refresh itself after each successful build.

    anvil -p

If you've written your specs and source files correctly, you can also provide a 's' switch to tell the test runner to test against the source directory instead of the output directory.

    anvil -p -s

### Integration Hosting

Anvil can also host files from the lib, ext, and other folders at port 3080. Unlike the pavlov host, there is no default page so the URL has to be page specific.

    anvil -h

The hosts key in the build.json file is where you can control what each folder will be hosted at in the relative url.

    "hosts": {
        "/example1" : "./examples/example1",
        "/example2" : "./examples/example2"
    }

The block above would host the folder ./example/example1 at http://localhost:3080/example1 and folder ./example/example2 at http://localhost:3080/example2

### Generating Stub Integration Files

I am incredibly lazy. The thought of typing a bunch of script tags makes me tired. Therefore, anvil will do this for you.

    anvil --html integration

Would create an integration.html file with script tags for all files found in lib and ext named integration.html

## Too chatty?

You can tell anvil to run in quiet mode (it will still print errors (red) and step completions (green) )

    anvil -q

## Demo

If you have the source, check out the demo directory. It's intended to play around and test different features out. If you've installed anvil from npm, all you have to do is type:

    cd demo
    anvil

and watch how anvil builds the demo project.

If you've pulled the repository down, then try this:
    cd demo
    ../bin/anvil

If all's well, you should get some console output and the build directory should have three output files.

I suggest testing the --ci and -p arguments here. There's a silly test included in the spec folder to demonstrate the
pavlov host.

## To Do

* Provide advanced uglify configuration options
* Provide advanced JSLint configuration options
* Support pavlov tests for node projects