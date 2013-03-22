/*
	anvil.js - an extensible build system
	version:	0.9.4
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var http = require( "http" );
var express = require( "express" );
var socketIO = require( "socket.io" );
var path = require( "path" );
var fs = require( "fs" );
var open = require( "open" );
var url = require( "url" );
var net = require( "net" );

var getScriptInjection = function() {
	return [
		 '<script type="text/javascript">'
		,'	(function(window, undefined){'
		,'		function loadScript(src) {'
		,'			var script = document.createElement("script");'
		,'			script.src = src;'
		,'			script.type = "text/javascript";'
		,'			document.getElementsByTagName("body")[0].appendChild(script);'
		,'		}'
		,'		if(typeof io === "undefined") {'
		,'			if ( typeof define === "function" && define.amd ) {'
		,'			require.config({'
		,'			    paths: {'
		,'			        "io" : "/socket.io/socket.io"'
		,'			    }'
		,'		    });'
		,'		    require(["io"], function(io) {'
		,'			    loadScript("/anvil/buildHook.js");'
		,'			});'
		,'		} else {'
		,'			loadScript("/socket.io/socket.io.js");'
		,'			loadScript("/anvil/buildHook.js");'
		,'			}'
		,'		}'
		,'	}(window));'
		,'</script>'
	].join('\n');
};

module.exports = function( _, anvil ) {
	
	var Host = function() {
		this.clients = [];
		this.compilers = {};
		_.bindAll( this );
		this.topics = {};
		this.widgets = {};
	};

	Host.prototype.addClient = function( socket ) {
		var self = this;
		this.clients.push( socket );
		_.each( this.topics, function( callbacks, topic ) {
			_.each( callbacks, function( callback ) {
				if( callback ) {
					socket.on( topic, function( data ) { callback( data, socket ); } );
				}
			} );
		} );
		anvil.emit( "socket.client.connected", { socket: socket } );
		socket.emit( "anvil.connected", {} );
		socket.on( "end", this.removeClient );
	};

	Host.prototype.addCompiler = function( extension, mimeType, compiler ) {
		this.compilers[ extension ] = {
			extension: extension,
			compiler: compiler,
			mimeType: mimeType
		};
	};

	Host.prototype.addMiddleware = function( filter, middleware ) {
		if( this.app ) {
			this.app.use( filter, middleware );
		}
	};

	Host.prototype.addSocketInclude = function() {
		var socketMiddleware = function( req, res, next ) {
			var isGet = req.method === "GET",
				end = res.end,
				write = res.oldWrite = res.write,
				buffer = "",
				headerSet = false,
				onData = function( chunk, encoding ) {
					if( chunk ) {
						var part = chunk.toString(),
							isHtml = res.get( "Content-Type" ).indexOf( "html" ) >= 0;
						buffer = buffer + part;
						if( isHtml && part.match( /[<][\/]body[>]/ ) ) {
							var modified = part.replace( /[<][\/]body[>]/,
								getScriptInjection() + "</body>"
							);
							if( !headerSet ) {
								res.set( "Content-Length", Buffer.byteLength( modified, "utf8" ) );
							}
							res.oldWrite( modified );
						} else {
							res.oldWrite( chunk );
						}
					}
				};
			
			if( !isGet ) {
				next();
				return;
			}

			res.write = onData;
			res.end = function( chunk, encoding ) {
				res.end = end;
				res.write = write;
				res.end( chunk, encoding );
			}
			next();
		};
		this.addMiddleware( socketMiddleware );
	};

	// yay, Jim Cowart to the rescue with this gem...
	Host.prototype.buildUrl = function() {
		var idx = 0,
			cleaned = [];
		while( idx < arguments.length ) {
			var segment = arguments[ idx ];
			if( segment.substr( 0, 1 ) === "/" ) {
				segment = segment.substr( 1 );
			}
			if( segment.substr( segment.length-1, 1 ) === "/" ) {
				segment = segment.substring( 0, segment.length - 1 );
			}
			if( !_.isEmpty( segment ) ) {
				cleaned.push( segment );
			}
			idx++;
		}
		return "/" + cleaned.join('/');
	};

	Host.prototype.createRouteHandle = function( url, verb, resource, handle ) {
		this.registerRoute( url, verb, function( req, resp ) {
			var envelope = {
				data: req.body,
				headers: req.headers,
				params: {},
				reply: function( envelope ) {
					var code = envelope.statusCode || 200;
					resp.send( 200, envelope.data );
				}
			};
			for( var key in req.params ) {
				var val = req.params[ key ];
				if( envelope.data[ key ] ) {
					envelope.params[ key ] = val;
				} else {
					envelope.data[ key ] = val;
				}
			}
			handle.apply( resource, [ envelope ] );
		} );
	};

	Host.prototype.createTopicHandle = function( topic, resource, handle ) {
		this.registerTopic( topic, function( message, socket ) {
			var envelope = {
				data: message.data || message,
				headers: message.headers || [],
				socket: socket,
				reply: function( envelope ) {
					socket.emit( message.replyTo || "trash", envelope );
				}
			};
			handle.apply( resource, [ envelope ] );
		} );
	};

	Host.prototype.init = function() {
		var self = this;

		this.app = express();
		this.app.use( express.bodyParser() );
		this.app.use('/', function(req, res, next) {
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Headers", "X-Requested-With");
			next();
		} );
		this.app.use( this.app.router );
		this.addSocketInclude();

		var extPath = path.resolve( __dirname, "../ext" );
		self.registerPath( "/anvil", extPath );
		this.server = http.createServer( this.app ).listen( anvil.config.port );
		this.socketServer = socketIO.listen( this.server );
		this.socketServer.set( "log level", 1 );
		this.socketServer.sockets.on( "connection", this.addClient );

		_.each( anvil.extensions.widgets, function( resource, name ) {
			self.processResource( "widget", name, resource );
		} );

		_.each( anvil.config.httpPaths, function( filePath, url ) {
			self.registerPath( url, filePath );
		} );

		_.each( this.compilers, this.registerCompiler );

		anvil.on( "build.done", this.refreshClients );

		if( anvil.config.browser ) {
			this.open();
		}

		var links = _.map( anvil.extensions.widgets, function( resource, name ) {
			if( self.widgets[ resource.category ] ) {
				self.widgets[ resource.category ].push( name );
			} else {
				self.widgets[ resource.category ] = [ name ];
			}
			return { rel: name, verb: "get", href: "/widget/" + name + "/" }
		} );

		var widgets = _.map( anvil.extensions.widgets, function( resource, name ) {
			return { }
		} );

		this.registerRoute( "/public/widget", "get", function( req, res ) {
			res.send( 200, { 
				"widgets": self.widgets,
				"_links": links
			} );
		} );

		anvil.log.complete( "Starting HTTP host at port " + anvil.config.port );
	};

	Host.prototype.notifyClients = function( message, data ) {
		var self = this;
		_.each( this.clients, function( client ) {
			client.emit( message, data );
		} );
	};

	Host.prototype.open = function( path ) {
		var base = "http://localhost:" + anvil.config.port,
			full = _.isEmpty( path ) ? base  + "/" : base + path;
		open( full );
	};

	Host.prototype.refreshClients = function() {
		anvil.log.event( "refreshing connected socket clients" );
		this.notifyClients( "refresh", {} );
	};

	Host.prototype.registerPath = function( url, filePath ) {
		anvil.log.debug( "registering: " + url + " to " + filePath );
		if( this.app ) {
			this.app.use( url, express[ "static" ]( path.resolve( filePath ) ) );
		}
	};

	Host.prototype.registerRoute = function( url, verb, callback ) {
		anvil.log.debug( "registering: " + url + " with method " + verb );
		if( this.app ) {
			this.app[ verb ]( url, callback );
		}
	};

	Host.prototype.registerCompiler = function( compiler ) {
		var pattern = new RegExp( compiler.extension + "$" );
		if( this.app ) {
			this.app.get( pattern, function( req, res ) {
				var fileName = "." + req.url,
					ext = path.extname( fileName );
				res.header( "Content-Type", compiler.mimeType );
				anvil.fs.read( fileName, function( content ) {
					compiler.compiler( content, function( compiled ) {
						res.send( compiled );
					} );
				} );
			} );
		}
	};

	Host.prototype.registerTopic = function( topic, callback ) {
		var self = this;
		anvil.log.debug( "registering topic: " + topic );
		if( this.topics[ topic ] ) {
			this.topics[ topic ].push( callback );
		} else {
			this.topics[ topic ] = [ callback ];
		}
		_.each( this.clients, function( client ) {
			client.on( topic, function( data ) { callback( data, client ); } );
		} );
	};

	Host.prototype.removeClient = function( socket ) {
		var index = this.clients.indexOf( socket );
		if( index >= 0 ) {
			this.clients.splice( index, 1 );
		}
		anvil.emit( "socket.client.disconnected", { socket: socket } );
	};

	Host.prototype.processResource = function( prefix, name, resource ) {
		var self = this,
			resourcePath = self.buildUrl( prefix, name );
		this.registerPath( resourcePath, resource.resourcePath );
		_.each( resource.routes, function( spec, route ) {
			_.each( spec, function( definition, operation ) {
				var handle = definition.handle,
					topic = name + "." + route + "." + operation,
					url = self.buildUrl( prefix, name, route, ( definition.path || "" ) ),
					verb = definition.verb;
				self.createRouteHandle( url, verb, resource, handle );
				self.createTopicHandle( topic, resource, handle );
			} );
		} );
	};

	return new Host();
};