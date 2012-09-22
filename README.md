# Anvil

Anvil started as a way to build a single javascript module from several source files. Build tools that require a lot of explicit/declarative instructions distract from getting work on the project done.

Anvil has been rewritten as a general build system with a plugin architecture. It should be easy to add features or change almost any behavior as needed.

The new version of anvil is not entirely backwards compatible. If you want to continue using the old version, you can still install it from npm by specifying the version number ( 0.7.9 ). If you need help converting your project to the new version, please send me an e-mail or submit an issue to the project and I'll help as I have time.

## What Does It Do?

All parts of the build process are implemented as plugins. Some plugins ship along with anvil's source so that it can do _something_ out of the box. Most of the interesting features will likely be plugins that you install.

A baseline install can do the following:

* Install, remove, enable or disable plugins
* Automatically install any plugins your build file defines as dependencies
* Run local tasks (follows the same api as a plugin)
* Continuously and incrementally build the project as files change
* Create default build files based on installed plugins
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
* dependencies is a list of anvil plugin names that should be installed before the build can proceed

## Building By Convention

If you don't specify your own build file, anvil assumes you intend to use a build.json file. If one isn't present, it will use its own conventions to build your project. If that's all you need, great! Chances are you'll want a build.json that's configured for your specific project.

## Writing New Build Files

Keeping up with all the plugin defaults can be difficult. To see what's available by default for each plugin, you can write a new build file for customization.

    anvil --write {name}

This command creates a build file in the current directory at {name}.json. It will include all the default settings for all the installed and built-in plugins.

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

# Plugins & Tasks
Anvil has two primary points for extension: plugins (things installed by anvil from npm) and tasks (local plugins).

## Plugins
Anvil installs plugins from npm to a global location: ~/.anvilplugins/node_modules and keeps a manifest of installed and enabled plugins at: ~/.anvilplugins/plugins.json.

Once a plugin is installed, anvil will load it and use it in the build process unless you:
  * Disable it globally with '''anvil disable {pluginname}''' at the command line
  * Explicitly include other plugins besides it in the build file
  * Explicitly exclude it in the build file

### When Plugins Misbehave
Anvil will attempt to automatically disable a plugin that throws an exception that would break the build. This is to try and prevent an installed plugin from breaking your build system.

### Installing & Uninstalling
Anvil provides simple command line arguments to install or uninstall plugins to itself at a global level:

    anvil install {pluginname}

or

    anvil uninstall {pluginname}

You can also install plugins from a file path using the relative path to the plugin directory in place of the plugin's name.

### Enabling & Disabling
Anvil provides command line arguments that allow you to enable or disable plugins at the global level:

    anvil enable {pluginname}

or

    anvil disable {pluginname}

Disabled plugins should never be loaded into a build session.

### Updating Plugins
Anvil will check npm for updates to all globally installed plugins with one simple command:

    anvil update

This command will take longer the more plugins you have installed and the more plugins which require updates from npm. Note: anvil automatically does this every time you install a new anvil version from npm.


### Including Specific Plugins
Anvil's build file now supports explicit inclusion only so that only plugins which you specify in the build file will be run as part of the build.

    "plugins": {
        "include": [ "anvil.one", "anvil.two", ... ]
    }

### Excluding Specified Plugins
Anvil also supports explicit exclusion so that all plugins except for those you specify in the build file will be run as part of the build.

    "plugins": {
        "exclude": [ "anvil.one", "anvil.two", ... ]
    }

### Installing Plugins Locally For A Project
You can now install a plugin locally to a project using npm like so:

    npm install {pluginname}

In order for anvil to know about the plugin, you must add the following option to your build file:

    "plugins": {
        "local": [ "myLocallyInstalledPluginName" ]
    }

Please note: if you have already installed a global version of the plugin, anvil will always prefer the locally installed plugin; if you wish to use a global version of the plugin, you must use npm to uninstall the local version. Anvil does not manage locally installed plugins.

# Contributors

Special thanks to the following individuals who have contributed source code or ideas to help make anvil less buggy and more useful:

 * Jim Cowart
 * Aaron McCall
 * Mike Stenhouse
 * Robert Messerle
 * Mike Hostetler
 * Jonathan Creamer
 * Brian Edgerton
 * Elijah Manor
 * Doug Neiner
 * Derick Bailey