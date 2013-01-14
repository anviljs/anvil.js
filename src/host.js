var http = require( "http" );
var express = require( "express" );
var socketIO = require( "socket.io" );
var path = require( "path" );
var fs = require( "fs" );
var open = require( "open" );
var url = require( "url" );

module.exports = function( _, anvil ) {
	
	var Host = function() {
		this.clients = [];
		this.compilers = {};
		_.bindAll( this );
		this.topics = {};
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
		socket.on( "end", this.removeClient );
	};

	Host.prototype.addCompiler = function( extension, mimeType, compiler ) {
		this.compilers[ extension ] = {
			extension: extension,
			compiler: compiler,
			mimeType: mimeType
		};
	};

	Host.prototype.addMiddleware = function( callback ) {
		var middleware = function( req, res, next ) {
			if (req.method !== "GET") {
				next();
				return;
			}
			var writeHead = res.writeHead,
				write = res.write,
				end = res.end,
				chunks = [],
				body,
				totalSize = 0;

			res.write = function( chunk, encoding ) {
				if ( typeof chunk === "string" ) {
					var length;
					if ( !encoding || encoding === 'utf8' ) {
						length = Buffer.byteLength( chunk );
					}
					var buffer = new Buffer( length );
					buffer.write( chunk, encoding );
					chunks.push( buffer );
				} else {
					chunks.push( chunk );
				}
				totalSize += chunk.length;
			};

			res.end = function( chunk, encoding ) {
				if ( chunk && chunk.length ) {
					res.write( chunk, encoding );
				}
				body = new Buffer( totalSize );
				var offset = 0;
				chunks.forEach( function( chunk ) {
					chunk.copy( body, offset );
					offset += chunk.length;
				});
				res.writeHead = writeHead;
				res.write = write;
				res.end = end;
				callback( body, req, res );
			};
			next();
		};

		this.app.use( middleware );
	};

	Host.prototype.addSocketInclude = function() {
		var socketMiddleware = function( body, req, res ) {
			var original = body.toString();
			if( original.match( /[<][\/]body[>]/ ) ) {
				var modified = original.replace( /[<][\/]body[>]/,
					"<script src=\"/socket.io/socket.io.js\"></script>\n<script src=\"/anvil/buildHook.js\"></script>\n</body>"
				);
				res._headers[ "content-length" ] = modified.length;
				res.end( modified );
			} else {
				res.end( body );
			}
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
	};

	Host.prototype.refreshClients = function() {
		anvil.log.event( "refreshing connected socket clients" );
		this.notifyClients( "refresh", {} );
	};

	Host.prototype.registerPath = function( url, filePath ) {
		anvil.log.debug( "registering: " + url + " to " + filePath );
		this.app.use( url, express[ "static" ]( path.resolve( filePath ) ) );
	};

	Host.prototype.registerRoute = function( url, verb, callback ) {
		anvil.log.debug( "registering: " + url + " with method " + verb );
		this.app[ verb ]( url, callback );
	};

	Host.prototype.registerCompiler = function( compiler ) {
		var pattern = new RegExp( compiler.extension + "$" );
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
					topic = name + "." + route,
					url = self.buildUrl( prefix, name, route, ( definition.path || "" ) ),
					verb = definition.verb;
				self.createRouteHandle( url, verb, resource, handle );
				self.createTopicHandle( topic, resource, handle );
			} );
		} );
	};

	return new Host();
};