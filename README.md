# Anvil

I wanted a way to build a single javascript module from several source files. Jake/Rake/Make aren't really doing enough for me. Everything else I found that came close was also trying to enforce how that output got used (Ender, Require, etc.)

## Anvil; Dumb but Helpful

Anvil just wants to be your friend. All you need is a build.json file in the root. If you have a valid build.json file, Anvil will do everything else.

## Quick Start

Look at the demo directory. It's very simple. If you've installed anvil from npm, all you have to do is
    cd demo
    anvil

If you've pulled the repository down, then try this:
    cd demo
    ../bin/anvil

If all's well, you should get some console output and the build directory should have three output files.

## How to combine source files

Anvil allows you to combine source files by using a commented command
**Javascript**
    //import("dependency.js");

**Coffeescript**
    ###import "dependency.js" ###

When you use Anvil to compile your project, it will traverse all the files in your source directory and combine them so that your top level files are what get output. **Warning** Currently, Anvil is not clever enough to detect circular import statements and it will break the world if you do this.

## The Build File

    {
        "source": "src",
        "output": "build",
        "lint": {},
        "uglify": {},
        "gzip": {},
        "extensions": { "uglify": "min", "gzip": "gz" },
        "wrap": {
            "prefix": "(function(context) {",
            "suffix": "})(this);"
        }
    }

source is where Anvil expects *all* your code. Don't get fancy or Anvil can't help you.
output is where Anvil will write all the build output and temp files. This should NOT be the same as source.
lint specifies that you want your output files run through JSLint before Uglify and Gzip occur.
uglify specifies that you want your output uglified. (happens before gzip)
gzip specifies that you want your output gzipped.

wrap
prefix prepends the following string to your output files.
suffix appends the following string to your output files.

There's also another option called justCoffee that will cause anvil to maintain all output in coffeescript instead of compiling it to js.

## Multiple Targets

Instead of making your build.json files messy with multiple targets, you can have multiple .json files for each target and name them according to the platform. You then specify the target as a command line argument.

### Example
You have two build files. The default build.json and a coffee.json:

**build.json**

    {
        "source": "source",
        "output": "build",
        "lint": {}
    }

**coffee.json**

    {
        "source": "source",
        "output": "build",
        "justCoffee": {}
    }

To target the coffee build just type:

    anvil coffee

## To Do

* Add ability to run based on convention w/o build files
* Provide advanced uglify configuration options
* Provide advanced JSLint configuration options
* Add continuous build behavior
* Add test integration options