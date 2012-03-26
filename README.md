# Anvil

I initially built Anvil for myself. I wanted a nice way to combine/compile/minify/test my JS/Coffee projects.

Then I landed a sweet gig with appendTo and my focus broadened to included web app development and noticed there are a lot of similarities but Anvil had been built with a very limited scope.

In the end, I think the philosophy is simple: build web and node projects the way you want and Anvil will help you package it the way you need.

## What Does It Do?

Here's the current feature list:

* 'Compile' CoffeeScript, Stylus, LESS, HAML, Markdown and CoffeeKup
* Combine resource files into output files via import syntax (varies by language and file type)
* Compress JS and CSS resources (maybe images one day)
* Continously perform these steps in the background as files change
* Run tests with QUnit, Pavlov or Mocha after each build
* Kick-off new projects with simple scaffolding
* Create new build.json configurations
* Customized file names for output
* Create integration page stubs that include all external dependencies and build output
* Host any set of directories in the project at custom URL paths (port 3080)

## Installation

    npm install anvil.js -g

## By Convention

Without a build file, Anvil will make assumptions. Here's the list:

* All your source will be in ./src and get output to ./lib and ./site/js
* All your styles will be in ./style and get output to ./css and ./site/css
* All your markup will be in ./markup and get output to ./site
* All resources will be compiled to JS, CSS and HTML
* All JS and CSS will be minified
* If the project includes a markup or style folder, you're building a site, not a lib

## The Build File ( large example showing all options )

    {
        "source": "src",
        "style": "style",
        "markup": "markup",
        {
            "source": [ "lib", "site/js" ],
            "style": [ "css", "site/css" ],
            "markup": "site/"
        }
        "lint": {},
        "uglify": {},
        "gzip": {},
        "cssmin": {},
        "extensions": { "uglify": "min", "gzip": "gz" },
        "finalize:" {
            "header|header-file": "this is some unprocessed text or a file name",
            "footer|footer-file": "this is some unprocessed text or a file name"
        },
        "hosts": {
          "/": "site"
        },
        "name": "custom-name.js",
        "testWith": "mocha|pavlov",
        "continuous": true,
        "host": true
    }

* source is where Anvil expects *all* your code. Don't get fancy or Anvil can't help you :(
* output is where Anvil will write all the build output and temp files. This should NOT be the same as source.
* lint specifies that you want your output files run through JSLint before Uglify and Gzip occur.
* uglify specifies that you want your output uglified. (happens before gzip)
* gzip specifies that you want your output gzipped.

* finalize
    * header prepends the following string to the final output ONLY.
    * footer appends the following string to the final output ONLY.
    * If header-file or footer-file is provided, the file will be read and the contents used
    * this section was added to support adding boiler plate text headers to minified/gzipped output

* name
    * for projects with a single file output, this will replace the name of the output file
    * for projects with multiple file outputs, you can provide a lookup hash to over-write
        each specific file name

There's also another option called justCoffee that will cause anvil to maintain all output in coffeescript instead of compiling it to js.

## Jumpstart New Projects

There are two ways to do this now - one for lib projects and one for sites.

Anvil will build a set of standard project directories for you and even spit out a build.json file based on the conventional use.

### Lib Projects

    anvil --lib <projectName>

Will produce a directory structure that looks like this:

    -projectName
        |-ext
        |-src
        |-lib
        |-spec
        build.json


### Site Projects

    anvil --site <projectName>

Will produce a directory structure that looks like this:

    -projectName
        |-ext
        |-src
        |-site
            |-js
            |-css
        |-style
        |-markup
        |-lib
        |-css
        |-spec
        build.json

## Building By Convention

If you don't specify your own build file, anvil assumes you intend to use a build.json file. If one isn't present, it will use its own conventions to build your project. If that's all you need, great! Chances are you'll want a build.json that's configured for your specific project. 

Now that there are two types of projects, Anvil infers the project type based on the folders you have.

## Combining source files

Anvil allows you to combine source files by using a commented command

**Javascript**

    //import("dependency.{ext}");

**Coffeescript**

    ###import "dependency.{ext}" ###

**Stylus, LESS, CSS**

    import "dependency.{ext}"

When you use Anvil to compile your project, it will traverse all the files in your source directory and combine them so that your top level files are what get output. **Warning** Currently, Anvil is not clever enough to detect circular dependencies created via import statements and it will _shatter your world_ if you do this.

## Building With Specific Build Files

To build with a specific build file type

    anvil -b <buildfile>

## Creating New / Additional Build Files

To create a build file for lib projects, you can just type the following:

    anvil --libfile <buildfile>

or for a site project

    anvil --sitefile <buildfile>

and it will create the build file for you. If you don't include the file name, anvil will create a build.json (possibly overwriting your existing one, be careful!)

## Custom Naming

For projects with a single file output, you can provide a name property which will override the default name of the file:

    "name": "my-custom-name.js"

For projects where there are multiple files in the output, you must provide a hash object that will tell anvil how to rename each specific file. For example, if you have a build producing 'one.js' and 'two.js' you would need to provide a hash object that would tell anvil how to name each:

    "name": {
        "one.js" : "main.js",
        "two.js" : "plugin.js"
    }

## Continuous Integration

Anvil will watch your source directory for changes and rebuild the project in the event any changes are saved to the files in the directory.

    anvil --ci

Remember, if you intend to always run in this mode, you can put a "continuous": true in your build.json file.

## Hosting

Anvil provides local hosting based on the "hosts" config block. Adding -h, --host argument or a "host": true block to your build.json file will cause Anvil to host your project's directories (according to configuration) at port 3080 via express.

    anvil -h

or

    anvil --host

Coffee, Stylus, LESS, Mardown, HAML and CoffeeKup are all converted at request time if they are requested.

The hosts key in the build.json file is where you can control what each folder will be hosted at in the relative url.

    "hosts": {
        "/example1" : "./examples/example1",
        "/example2" : "./examples/example2"
    }

The block above would host the folder ./example/example1 at http://localhost:3080/example1 and folder ./example/example2 at http://localhost:3080/example2

### External Dependencies

External dependencies get included in all hosting scenarios.

### Testing With Mocha

Mocha might be the best thing ever. You can tell Anvil to run your spec files with mocha from the command line

    anvil --mocha

or by adding "testWith": "mocha" to your build.json file.

### Pavlov Hosting

Anvil will generate a pavlov test page for your output and host it in express at port 1580. All scripts in the lib, ext and spec folders will be included in this test page. The pavlov, qunit and jquery resources are symlinked into your root directory so that express will load these files correctly.

Thanks to a contribution from @ifandelse, if you're using the CI feature, the test page will automatically refresh itself after each successful build.

    anvil -p

or
    anvil --pavlov

### Generating Stub Integration Files

I am incredibly lazy. The thought of typing a bunch of script tags makes me tired. Therefore, anvil will do this for you.

    anvil --html integration

Would create an integration.html file with script tags for all files found in lib and ext named integration.html. You need
to provide the full path to the file you want it to create (minus the .html extension) and the path must already exist.

## Too chatty?

You can tell anvil to run in quiet mode (it will still print errors (red) and step completions (green) )

    anvil -q