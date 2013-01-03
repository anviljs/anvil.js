/*
	anvil.js - an extensible build system
	version:	0.9.0-RC4
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

	anvil.addEvents( Scaffold );

	Scaffold.prototype.configure = function( config, command, done ) {
		done();
	};

	Scaffold.prototype.build = function( done ) {
		var self = this;
		if( !this.output ) {
			anvil.log.warning( "Scaffold + '" + this.type + "' did not specify any output" );
			done();
		}
		this._processData();
		var clean = function( callback ) {
			return function() { callback(); };
		};
		anvil.scheduler.pipeline( undefined, [
				function( done ) { self.runTasks( "before", clean( done ) ); },
				function( done ) { self.parse( self.output, "", clean( done ) ); },
				function( done ) { self.transformFiles( clean( done ) ); },
				function( done ) { self.runTasks( "after", clean( done ) ); }
			], done );
	};

	Scaffold.prototype.parse = function( content, pathSpec, done ) {
		var self = this;
		if( _.isFunction( content ) ) {
			content.call( self, _.deepExtend( self._viewContext, true ), function( data ) {
				if( data )
				{
					self.write( data, pathSpec, done );
				} else {
					done();
				}
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

	Scaffold.prototype.runTasks = function( type, done ) {
		if( this.tasks && this.tasks[ type ] && !_.isEmpty( this.tasks[ type ] ) ) {
			var taskList = _.map( this.tasks[ type ], function( options, taskName ) {
				return function( done ) {
					var task = anvil.extensions.tasks[ taskName ];
					if( task ) {
						task.run( options, done );
					} else {
						done();
					}
				};
			} );
			anvil.log.step( "Executing scaffold tasks" );
			anvil.scheduler.pipeline( undefined, taskList, done );
		} else {
			done();
		}
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

	Scaffold.prototype.transformFiles = function( done ) {
		if( this.transform && !_.isEmpty( this.transform ) ) {
			_.each( this.transform, function( call, file ) {
				anvil.fs.transform( file, call, file, done );
			} );
		} else {
			done();
		}
	};

	anvil.scaffold = function( instance ) {
		var base = new Scaffold();
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		extended._viewContext = _.extend( {}, instance.data, { type: instance.type } );
		anvil.extensions.scaffolds[ instance.type ] = extended;
		anvil.emit( "scaffold.loaded", { instance: extended } );
		anvil.log.debug( "loaded scaffold " + instance.type );
		extended.goPostal( this.type );
		return extended;
	};

	anvil.scaffold.file = function( pathSpec ) {
		return function( viewModel, done ) {
			anvil.fs.read( pathSpec, done );
		};
	};

};

module.exports = scaffoldFactory;