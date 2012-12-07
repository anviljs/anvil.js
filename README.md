# Anvil

Anvil started as a way to build a single javascript module from several source files. Build tools that require a lot of explicit/declarative instructions distract from getting work on the project done.

Anvil has been rewritten as a general build system with an extension-based architecture. It should be easy to add features or change almost any behavior as needed. There's a lot of work going on now that will add new ways to use and extend anvil.

## !Recent Changes!
Changes to terminology and concepts from the 0.8.* version:
* An extension is anything you install from npm or anything anvil loads from your file system
* Plugins add features to and extend the build process
* Commands will allow developers to extend anvil to perform specific tasks that aren't part of a build
* Tasks will be a way for you to define individual instructions (ala Make) that can take dependencies on one another
* Scaffolds provide ways to generate structure and files from metadata

Huge thanks go to Eli Perelman, Doug Neiner and Brian Edgerton for providing general ideas, specifications and implementations that lead to this new direction!

## What Does It Do?

All parts of the build process are implemented as extensions (specifically as build plugins). Some extensions ship along with anvil's source so that it can do _something_ out of the box. Most of the interesting features will likely be extensions that you install.

A baseline install can do the following:

* Install, remove, enable or disable extensions
* Automatically install any extensions your build file defines as dependencies
* Run local extensions (an extension that's not installed from npm)
* Continuously and incrementally build the project as files change
* Create default build files based on installed extensions
* Combine resource files through a comment-based import syntax
* Concat resource files in specified order using
    * JSON or YAML file that lists files to create from other files
    * individual JSON or YAML files
* Replace tokens (with customizable syntax) in source with 
    * values from package.json
    * JSON or YAML key/value files
* Add file headers to final build output based on output file type

## Installation

    npm install anvil.js -g

## By Convention

Without a build file, anvil will use its default conventions to attempt to build your project.

## The Build File ( minimalist example )

    {
        "source": "src",
        "spec": "spec"
        "output":  "build"
        "dependencies": [ "anvil.mocha" ]
    }

* source is the path where _all_ project source belongs; this can be a flat or complex hierarchy
* output is a list of paths to copy build output to.
* spec is the folder where test specifications can be found
* dependencies is a list of anvil extension names that should be installed before the build can proceed

## Building By Convention

If you don't specify your own build file, anvil assumes you intend to use a build.json file. If one isn't present, it will use its own conventions to build your project. If that's all you need, great! Chances are you'll want a build.json that's configured for your specific project.

## Writing New Build Files

Keeping up with all the extension defaults can be difficult. To see what's available by default for each extension, you can write a new build file for customization.

    anvil --write {name}

This command creates a build file in the current directory at {name}.json. It will include all the default settings for all the installed and built-in extensions.

## Combining source files, Import Style

Anvil allows you to combine source files by using a commented command

**Javascript**

    // import("dependency.{ext}");

**Coffeescript**

    ### import "dependency.{ext}" ###

**Stylus, LESS, CSS**

    CSS: 			/* import "dependency.{ext}" */ 
    LESS, Stylus:	// import "dependency.{ext}

When you use anvil to compile your project, it will traverse all the files in your source directory and combine them so that your top level files are what get output. 

**Warning** Currently, anvil is not clever enough to detect circular dependencies created via import statements and it will _shatter your world_ if you do this.

## Combining source files, Concatenation Style

Anvil provides you with two ways to drive concatenation: yaml lists or individual yaml files

### List Files
Anvil allows you to combine source files by listing the order of concatenation in a JSON or YAML format. Note: the paths must all be absolute OR relative to the top level of your source folder.

#### JSON Format
    {
        "./file1.js": [ "./file1a.js", "./file1b.js", "./file1c.js" ],
        "./file2.js": [ "./file2a.js", "./file2b.js", "./file2c.js" ],
    }

#### YAML Format

    ./file1.js:
        - ./file1a.js
        - ./file1b.js
        - ./file1c.js

    file2.js:
        - ./file2a.js
        - ./file2b.js
        - ./file2c.js


Anvi will create file1.js and file2.js by concatenating the corresponding list of files in the order they appear.

### Individual Files
This approach allows you to create a list of files to concatenate to create the final outcome. The name and location of the file will be identical to the original but anvil will strip the .json or .yaml extension off.

#### JSON Format
    { "imports": [ "./file1a.js", "./file1c.js", "./file1c.js" ] }

#### YAML Format
file1.js.yaml's contents:

    - ./file1a.js    
    - ./file1b.js    
    - ./file1c.js    


Each example would produce file1.js and concat each of the three listed files together to create its contents. ***NOTE***: The paths in an individual concat file _must_ be relative to the concat file itself.

## Building With Specific Build Files

To build with a specific build file

    anvil -b <buildfile>

## Continuous Integration

Anvil will watch your source directory for changes and incrementally rebuild changed files ( and any affected files ).

    anvil --ci

You can configure a build to always run in this mode by adding the following JSON snippet to your build.json file:
    
    "fileLoader": {
        "continuous": "true"
    }

## Console log

Anvil uses color-coded messages to let you see what's happening during the build. Here's the color key:

    magenta - debug
    default - events
    blue - build steps
    green - success
    yellow - warning
    red - error

By default anvil will print everything but debug and warning messages unless you provide a --verbose argument or add this to your build.json :

    "log": {
        "debug": true
    }

You can tell anvil to run in quiet mode (it will still print errors (red) and step completions (green) )

    anvil -q

# Extensions
Anvil has three primary points for extension:
* plugins - extensions to the build system
* commands - utility features that run outside of the build
* tasks - specialized functions that can be combined to give you explicit control of what anvil does
* scaffolds - folder structure and source generators

An extension module can contain one or more of any of the three above types. Installing, uninstalling, enabling and disabling an extension module will affect **all** extensions defined within the module.

## Installation
Anvil installs extensions from npm to a global location: ~/.anvilextensions/node_modules and keeps a manifest of installed and enabled extensions at: ~/.anvilextensions/extensions.json.

Once an extension is installed, anvil will load it unless you:
  * Disable it globally with '''anvil disable {extensionname}''' at the command line
  * Explicitly include other extensions besides it in the build file
  * Explicitly exclude it in the build file

### When Extensions Misbehave
Anvil will attempt to automatically disable a extension that throws an exception that would break the build. This is to try and prevent an installed extension from breaking your build system.

### Installing & Uninstalling
Anvil provides simple command line arguments to install or uninstall extensions to itself at a global level:

    anvil install {extensionname}

or

    anvil uninstall {extensionname}

You can also install extensions from a file path using the relative path to the extension directory in place of the extension's name.

### Enabling & Disabling
Anvil provides command line arguments that allow you to enable or disable extensions at the global level:

    anvil enable {extensionname}

or

    anvil disable {extensionname}

Disabled extensions should never be loaded into a build session.

### Updating Extensions
Anvil will check npm for updates to all globally installed extensions with one simple command:

    anvil update

This command will take longer the more extensions you have installed and the more extensions which require updates from npm. Note: anvil automatically does this every time you install a new anvil version from npm.


### Including Specific Extensions
Anvil's build file now supports explicit inclusion only so that only extensions which you specify in the build file will be run as part of the build.

    "extensions": {
        "include": [ "anvil.one", "anvil.two", ... ]
    }

### Excluding Specified Extensions
Anvil also supports explicit exclusion so that all extensions except for those you specify in the build file will be run as part of the build.

    "extension": {
        "exclude": [ "anvil.one", "anvil.two", ... ]
    }

### Installing Extensions Locally For A Project
You can now install an extension locally to a project using npm like so:

    npm install {extensionname}

In order for anvil to know about the extension, you must add the following option to your build file:

    "extensions": {
        "local": [ "myLocallyInstalledPluginName" ]
    }

Please note: if you have already installed a global version of the extension, anvil will always prefer the locally installed extension; if you wish to use a global version of the extension, you must use npm to uninstall the local version. Anvil does not manage locally installed extensions.

# Contributors

Special thanks to the following individuals who have contributed source code or ideas to help make anvil less buggy and more useful:

 * Doug Neiner
 * Eli Perelman
 * Brian Edgerton
 * Jim Cowart
 * Jonathan Creamer
 * Mike Hostetler
 * Elijah Manor
 * Aaron McCall
 * Mike Stenhouse
 * Robert Messerle
 * Derick Bailey

# Legal Bits

"Anvil.js"( also referred to as "Anvil") is owned by Alex Robson.  All rights not explicitly granted in the MIT or GPL license are reserved. See the included LICENSE-* files for more details.

Extensions to Anvil (plugins, commands, tasks, etc.) are not part of Anvil itself, and are the sole property of their respective maintainers.  While every effort is made to ensure accountability, there is absolutely no guarantee, warrantee, or assertion made as to the quality, fitness for a specific purpose, or lack of malice in any given extension.  Extensions published on the npm registry are not affiliated with or endorsed by myself (Alex Robson) or my employer unless otherwise stated in the repository for the extension.

If you have a complaint about an extension, and cannot resolve it with the package owner, please express your concerns to anviljs@gmail.com.

### In plain english

This is mine; not my employer's. They have graciously supported the efforts and made contributions but are in no way responsible or liable for it's suitability or function.

If you create and publish an extension, it's yours, and you are solely accountable
for it.  Not me, not my employer.

If other people create and publish an extension, it's theirs.  Not mine, not my employer's.

Malicious extensions could be published; consider the author behind the extension and perhaps review the code. There is no vetting process for published extensions.

If this concerns you, inspect the source before installing or using any extension.