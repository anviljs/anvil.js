# Anvil

I wanted a way to build a single javascript module from several source files. Jake/Rake/Make aren't really doing enough for me. Everything else I found that came close was also trying to enforce how that output got used (Ender, Require, etc.)

## Anvil; Dumb but Helpful (i hope)

Anvil just wants to be your friend. All you need is a build.json file in the root. If you have a valid build.json file, Anvil will do everything else.

## The Build File

    {
        source: "src",
        modules: "node_modules",
        output: "./",
        packages: [
            { name: "underscore" }
        ],
        uglify: {
        }
        prefix: "(function(context) {",
        suffix: ")(this));"
    }

## To Do

* Everything