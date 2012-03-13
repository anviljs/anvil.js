# Node's event emitter for all engines.
events = require("events")
emitter = events.EventEmitter

# JavaScript's functional programming helper library -- 
# See http://documentcloud.github.com/underscore for more info
_ = require "underscore"

# Console colors for Node -- 
# See https://github.com/Marak/colors.js for more info
colors = require "colors"

# Filesystem API
fs = require "fs"

# Recursive mkdir for Node (think _mkdir -p_) -- 
# See ://github.com/substack/node-mkdirp for more info
mkdir = require( "mkdirp" ).mkdirp

# Node's path helper library
path = require "path"

# Parses command line args and options -- 
# See https://github.com/shinout/argparser for more info
ArgParser = require "argparser"

# A Sinatra inspired web development framework for Node -- 
# See http://expressjs.com for more info
express = require "express"

# Resourceful routing for express -- 
# See https://github.com/visionmedia/express-resource for more info
resource = require "express-resource"

# Generates HTML via an API -- 
# See https://github.com/insin/DOMBuilder for more info
builder = require "DOMBuilder"

# A tool to walk through directory trees and apply an action to every file -- 
# See http://github.com/pvorb/node-dive for more info
dive = require "dive"

# Uglify: JavaScript parser and compressor/beautifier toolkit -- 
# See https://github.com/mishoo/UglifyJS for more info
jsp = require( "uglify-js" ).parser
pro = require( "uglify-js" ).uglify

# A Node-compatible port of Douglas Crockford's JSLint -- 
jslint = require( "readyjslint" ).JSLINT

# Gzip for Node -- 
gzipper = require( "gzip" )

# Unfancy JavaScript -- 
# See http://coffeescript.org/ for more info
coffeeScript = require "coffee-script"
