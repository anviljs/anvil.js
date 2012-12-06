/*
	anvil.js - an extensible build system
	version:	0.9.0-RC1
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var path = require( "path" );
var handlebars = require( "handlebars" );

var scaffoldFactory = function( _, anvil ) {

	var Scaffold = function() {
		_.bindAll( this );
		this.type = "";
		this.dependencies =[];
		this.commander = [];
		this.config = {};
		this.events = {};
		this._viewContext = {};
	};

	Scaffold.prototype.configure = function( config, command, done ) {
		done();
	};

	Scaffold.prototype.build = function( done ) {
		if( !this.output ) {
			anvil.log.warning( "Scaffold + '" + this.type + "' did not specify any output" );
			done();
		}
		this._processData();
		this.parse( this.output, "", done );
	};

	Scaffold.prototype.file = function( pathSpec ) {
		return function( viewModel, done ) {
			anvil.fs.read( pathSpec, done );
		};
	};

	Scaffold.prototype.parse = function( content, pathSpec, done ) {
		var self = this;
		if( _.isFunction( content ) ) {
			content.call( self, _.deepExtend( self._viewContext, true ), function( data ) {
				self.write( data, pathSpec, done );
			} );
		} else {
			self.write( content, pathSpec, done );
		}
	};

	Scaffold.prototype.processData = function( data ) {
		return data;
	};

	Scaffold.prototype._processData = function() {
		this._viewContext = this.processData( this._viewContext );
	};

	Scaffold.prototype.render = function( options ) {
		var template = handlebars.compile( options.template );
		return template( options.data );
	};

	Scaffold.prototype.write = function( content, pathSpec, done ) {
		var self = this,
			mapped = {},
			realPath;
		if( _.isObject( content ) ) {
			// this is a directory, add the slash
			// but only if it's not top level
			if( pathSpec ) {
				pathSpec += "/";
			}

			// loop over each item in the object
			// and prep for processing
			_.each( content, function( value, name ) {
				// process the name via render if present
				if( self.render ) {
					name = self.render.call( self, {
						mode: "name",
						filename: null,
						template: name,
						data: _.deepExtend( self._viewContext, true )
					} );
				}

				mapped[ name ] = function( done ) {
					self.parse( value, pathSpec + name, done );
				};
			} );

			if( pathSpec ) {
				realPath = anvil.fs.buildPath( pathSpec );
				anvil.fs.ensurePath( realPath, function( err ) {
					if( err ) {
						anvil.log.error( "scaffold could not create directory: " + pathSpec + " everyone panic!" );	
					} else {
						anvil.log.debug( "created scaffold directory: " + pathSpec );
						anvil.scheduler.mapped( mapped, done );
					}
				} );
				
			} else {
				anvil.scheduler.mapped( mapped, done );
			}
		} else {
			if( pathSpec === "" ) {
				anvil.log.error( "scaffolds require an object to output - in scaffold " + self.type );
				return;
			}

			realPath = anvil.fs.buildPath( pathSpec );

			if ( self.render ) {
				content	= self.render.call( self, {
					mode: "file",
					filename: path.basename( realPath ),
					fullpath: pathSpec,
					template: content,
					data: _.deepExtend( self._viewContext, true )
				});
			}

			anvil.fs.write( realPath, content, function ( err ) {
				if ( err ) {
					// No error handler yet
				}
				anvil.log.debug( "Created file: " + pathSpec );
				done();
			});
		}
	};

	Scaffold.prototype.on = function( eventName, handler ) {
		anvil.events.on( this.name + "." + eventName, handler );
	};

	Scaffold.prototype.publish = function( topic, message ) {
		var e = this.events[ topic ];
		if( e ) {
			var args = _.flatten( _.pick( message, e ) );
			args.unshift( this.name + "." + topic );
			anvil.events.raise.apply( undefined, args );
		}
		anvil.bus.publish( this.name, topic, message );
	};

	Scaffold.prototype.raise = function( eventName ) {
		var e = this.events[ eventName ],
			fullArgs = Array.prototype.slice.call( arguments ),
			args = fullArgs.slice( 1 );
		if( args.length > 0 && e ) {
			var msg = _[ "object" ]( e, args );
			anvil.bus.publish( this.name, eventName, msg );
		}
		args.unshift( this.name + "." + eventName );
		anvil.events.raise.apply( undefined, args );
	};

	Scaffold.prototype.subscribe = function( eventName, handler ) {
		anvil.bus.subscribe( this.name, eventName, handler );
	};

	anvil.scaffold = function( instance ) {
		var base = new Scaffold();
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		extended._viewContext = _.extend( {}, instance.data, { type: instance.type } );
		anvil.extensions.scaffolds[ instance.type ] = extended;
		anvil.raise( "scaffold.loaded", extended );
		anvil.log.debug( "loaded scaffold " + instance.type );
		return extended;
	};

};

module.exports = scaffoldFactory;