var http = require( "http" );
var express = require( "express" );
var socketIO = require( "socket.io" );
var path = require( "path" );
var fs = require( "fs" );
var open = require( "open" );
var url = require( "url" );

var hostFactory = function( _, anvil ) {
	
	var Host = function() {
		this.clients = [];
		_.bindAll( this );
		anvil.http = {
			init: this.init,
			registerPath: this.registerPath
		};
		this.topics = {};
	};

	Host.prototype.init = function( done ) {
		var self = this;
		
		this.app = express();
		this.app.use( express.bodyParser() );
		this.app.use( this.app.router );

		var extPath = path.resolve( __dirname, "../ext" );
		self.registerPath( "/anvil", extPath );
		this.server = http.createServer( this.app ).listen( anvil.config.port );
		this.socketServer = socketIO.listen( this.server );
		this.socketServer.set( "log level", 1 );
		this.socketServer.sockets.on( "connection", this.addClient );
		
		_.each( anvil.extensions.widgets, function( widget, name ) {
			var widgetPath = "/widgets/" + name + "/";
			self.registerPath( widgetPath, widget.resourcePath );
			_.each( widget.routes, function( spec, route ) {
				_.each( spec, function( definition, operation ) {
					self.registerRoute( widgetPath, route, definition, function( req, resp ) {
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
						definition.handle.apply( widget, [ envelope ] );
					} );
					self.registerTopic( name, route, definition, function( message, socket ) {
						var envelope = {
							data: message.data || message,
							headers: message.headers || [],
							reply: function( envelope ) {
								socket.emit( message.replyTo || "trash", envelope );
							}
						};
						definition.handle.apply( widget, [ envelope ] );
					} );
				} );
			} );
		} );
	};

	Host.prototype.registerPath = function( url, filePath ) {
		console.log( "registering: " + url + " to " + filePath );
		this.app.use( url, express[ "static" ]( path.resolve( filePath ) ) );
	};

	Host.prototype.registerRoute = function( url, route, definition, callback ) {
		var fullUrl = url + route + ( definition.path || "" );
		console.log( "registering: " + fullUrl + " with method " + definition.verb );
		this.app[ definition.verb ]( fullUrl, callback );
	};

	Host.prototype.registerTopic = function( name, route, definition, callback ) {
		var self = this,
			topic = name + "." + route;
		console.log( "registering topic: " + topic );
		if( this.topics[ topic ] ) {
			this.topics[ topic ].push( callback );
		} else {
			this.topics[ topic ] = [ callback ];
		}
		_.each( this.clients, function( client ) {
			client.on( topic, function( data ) { callback( data, client ); } );
		} );
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
		socket.on( "end", this.removeClient );
	};

	Host.prototype.removeClient = function( socket ) {
		var index = this.clients.indexOf( socket );
		if( index >= 0 ) {
			this.clients.splice( index, 1 );
		}
	};

	return new Host();
};

module.exports = hostFactory;