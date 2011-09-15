_ = require "underscore"
colors = require "colors"
fs = require "fs"
mkdir = require( "mkdirp" ).mkdirp
path = require "path"

jsp = require( "uglify-js" ).parser
pro = require( "uglify-js" ).uglify
jslint = require( "readyjslint" ).JSLINT
gzipper = require( "zlib-sync" ).gzipcompress
coffeeScript = require "coffee-script"