events = require("events")
emitter = events.EventEmitter

_ = require "underscore"
colors = require "colors"
fs = require "fs"
mkdir = require( "mkdirp" ).mkdirp
path = require "path"

ArgParser = require "argparser"
express = require "express"
resource = require "express-resource"
builder = require "DOMBuilder"
watcher = require "watch"

jsp = require( "uglify-js" ).parser
pro = require( "uglify-js" ).uglify
jslint = require( "readyjslint" ).JSLINT
gzipper = require( "gzip" )
coffeeScript = require "coffee-script"