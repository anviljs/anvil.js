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
				_.each( spec, function( callback, verb ) {
					if( _.isFunction( callback ) ) {
						self.registerRoute( widgetPath + route, verb, function( req, resp ) {
							callback.apply( widget, [ req, resp ] );
						} );
					} else {
						self.registerRoute( widgetPath + route, verb, function( req, resp ) {
							widget[ callback ].apply( widget, [ req, resp ] );
						} );
					}
				} );
			} );
		} );
	};

	Host.prototype.registerPath = function( url, filePath ) {
		console.log( "registering: " + url + " to " + filePath );
		this.app.use( url, express[ "static" ]( path.resolve( filePath ) ) );
	};

	Host.prototype.registerRoute = function( url, method, callback ) {
		console.log( "registering: " + url + " with method " + method );
		this.app[ method ]( url, callback );
	};

	Host.prototype.addClient = function( socket ) {
		var self = this;
		this.clients.push( socket );
		socket.on( "end", this.removeClient );
		this.raise( "socket.connected", socket );
	};

	Host.prototype.removeClient = function( socket ) {
		var index = this.clients.indexOf( socket );
		if( index >= 0 ) {
			this.clients.splice( index, 1 );
			this.raise( "socket.disconnected", socket );
		}
	};

	return new Host();
};

module.exports = hostFactory;