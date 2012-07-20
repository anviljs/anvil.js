# Anvil

Anvil started as a way to build a single javascript module from several source files. Build tools that require a lot of explicit/declarative instructions distract from getting work on the project done.

Anvil has been rewritten as an extensible tool that uses a plugin architecture to allow developers to change pretty much everything about how it works.

The new version of Anvil is not entirely backwards compatible. If you want to continue using the old version, you can still install it from npm by specifying the version number ( 0.7.9 ). If you need help converting your project to the new version, please send me an e-mail or submit an issue to the project and I'll help as I have time.

## What Does It Do?

All parts of the build process are implemented as plugins. Some plugins ship along with anvil's source so that it can do _something_ out of the box. Most of the interesting features will likely be plugins that you install.

A baseline install can do the following:

* Install, remove, enable or disable plugins
* Automatically install any plugins your build file defines as dependencies
* Continuously and incrementally build the project as files change
* Create default build files based on installed plugins
* Create scaffolding for new projects
* Combine resource files through a comment-based import syntax
* Combine resource files in specified order using
    * concat yaml or json file that lists files to create from other files
    * individual json or yaml files
* Replace tokens (with customizable syntax) in source with 
    * values from package.json
    * yaml or json key/value files
* Add file headers to final build output based on output file type

## Installation

    npm install anvil.js -g

## By Convention

Without a build file, Anvil will use its default conventions to attempt to build your project.

## The Build File ( large example showing lots of options )

    {
        "source": "src",
        "spec": "spec"
        "output":  [ "build" ]
    }

* source is the path where _all_ project source belongs; this can be a flat or complex hierarchy
* output is a list of paths to copy build output to.
* wrap
    * happens before minification
    * provides a means to wrap all output files of a type with a prefix and suffix before minification
    * if prefix-file or suffix-file is provided, the file will be read and the contents used
    * this feature is primarily a convenience method included for legacy reasons
* finalize
    * header prepends the following string to the final output ONLY.
    * footer appends the following string to the final output ONLY.
    * if header-file or footer-file is provided, the file will be read and the contents used
    * this section was added to support adding boiler plate text headers to minified/gzipped output

## Jumpstart New Projects

Anvil will build a set of standard project directories for you and even spit out a build.json file based on the conventional use.

### Lib Projects

    anvil --lib <projectName>

Will produce a directory structure that looks like this:

    -projectName
        |-spec
        build.json

## Building By Convention

If you don't specify your own build file, anvil assumes you intend to use a build.json file. If one isn't present, it will use its own conventions to build your project. If that's all you need, great! Chances are you'll want a build.json that's configured for your specific project.

## Combining source files, Import Style

Anvil allows you to combine source files by using a commented command

**Javascript**

    // import("dependency.{ext}");

**Coffeescript**

    ### import "dependency.{ext}" ###

**Stylus, LESS, CSS**

    CSS: 			/* import "dependency.{ext}" */ 
    LESS, Stylus:	// import "dependency.{ext}

When you use Anvil to compile your project, it will traverse all the files in your source directory and combine them so that your top level files are what get output. **Warning** Currently, Anvil is not clever enough to detect circular dependencies created via import statements and it will _shatter your world_ if you do this.

## Combining source files, Concatenation Style

Anvil provides you with two ways to drive concatenation: yaml lists or individual yaml files

### YAML lists
Anvil allows you to combine source files by listing the order of concatenation in a YAML format. Note: the paths must all be absolute OR relative to the top level of your source folder.

    ./file1.js:
        - ./file1a.js
        - ./file1b.js
        - ./file1c.js

    file2.js:
        - ./file2a.js
        - ./file2b.js
        - ./file2c.js

In this example, Anvil will create file1 and file2 by concatenating the three files below each. This approach only supports 1 level of parent/child relationships (you really shouldn't need more than 1 level)


### YAML files
If you want to use this approach, just create a YAML file with the list of files that should be used to create it in the order to concatenate them. The name of the file should be the name you want after YAML extension has been removed.

file1.js.yaml's contents:

    - ./file1a.js    
    - ./file1b.js    
    - ./file1c.js    
    
This would produce file1.js.yaml and concat each of the three listed files together to create its contents. The difference in the paths here is that they must be relative to the placement of file1.js.yaml.

## Building With Specific Build Files

To build with a specific build file

    anvil -b <buildfile>

## Creating New / Additional Build Files

To create a build file for lib projects, you can just type the following:

    anvil --newbuild <buildfile>

and it will create the build file for you. If you don't include the file name, anvil will create a build.json (possibly overwriting your existing one, be careful!)

## Continuous Integration

Anvil will watch your source directory for changes and incrementally rebuild changed files ( and any affected files ).

    anvil --ci

You can configure a build to always run in this mode by adding the following JSON snippet to your build.json file:
    
    "fileLoader": {
        "continuous": "true"
    }

### Testing With Mocha

Mocha might be the best thing ever. You can tell Anvil to run your spec files with mocha from the command line

    anvil --mocha

or by adding a "mocha" configuration block to your build.json file.

## Console log

Anvil uses color-coded messages to let you see what's happening during the build. Here's the color key:

    magenta - debug
    default - events
    blue - build steps
    green - success
    yellow - warning
    red - error

By default anvil will print everything but debug messages unless you provide a --debug argument or add this to your build.json :

    "log": {
        "debug": true
    }

You can tell anvil to run in quiet mode (it will still print errors (red) and step completions (green) )

    anvil -q

# Contributors

Special thanks to the following individuals who have contributed source code or ideas to help make Anvil.js less buggy and more useful:

 * Jim Cowart
 * Aaron McCall
 * Mike Stenhouse
 * Robert Messerle
 * Mike Hostetler
 * Doug Neiner
 * Derick Bailey