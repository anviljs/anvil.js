# Anvil

I wanted a way to build a single javascript module from several source files. Jake/Rake/Make aren't really doing enough for me. Everything else I found that came close was also trying to enforce how that output got used (Ender, Require, etc.)

## Anvil; Dumb but Helpful

Anvil just wants to be your friend. All you need is a build.json file in the root. If you have a valid build.json file, Anvil will do everything else.

## Quick Start

Look at the demo directory. It's very simple. Just cd to the build dir in your console and type
    coffee ../anvil.js

## How to include source

Anvil allows you to

## The Build File

    {
        "source": "src",
        "output": "build",
        "lint": {},
        "uglify": {},
        "gzip": {},
        "extensions": { "uglify": "min", "gzip": "gz" },
        "prefix": "(function(context) {",
        "suffix": "})(this);"
    }

Source is where Anvil expects *all* your code. Don't get fancy or Anvil can't help you.
Output is where Anvil will write all the build output and temp files. This should NOT be the same as source.
Lint specifies that you want your output files run through JSLint before Uglify and Gzip occur.
Uglify specifies that you want your output uglified. (happens before gzip)
Gzip specifies that you want your output gzipped.
Prefix prepends the following string to your output files.
Suffix appends the following string to your output files.

## To Do

* Finish package for npm upload
* Add ability to run based on convention w/o build files
* Provide advanced uglify configuration options
* Provide advanced JSLint configuration options
* Allow for multiple build "targets" ( simple client side vs. CommonJs )
* Add continuous build behavior
* Add test integration options