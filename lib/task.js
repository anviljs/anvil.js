/*
	anvil.js - an extensible build system
	version:	0.9.0-RC2
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var taskFactory = function( _, anvil ) {

	var checkArg = function( task, arg ) {
		if( _.isArray( arg ) ) {
			task.dependencies = arg;
		} else if( _.isFunction( arg ) ) {
			task.run = arg;
		}
	};

	var Task = function( name, description, opt1, opt2 ) {		
		_.bindAll( this );
		this.name = name;
		this.description = description || "";
		this.dependencies = [];
		this.config = {};
		this.events = {};
		checkArg( this, opt1 );
		checkArg( this, opt2 );
	};

	Task.prototype.configure = function( config, command, done ) {
		done();
	};

	Task.prototype.on = function( eventName, handler ) {
		anvil.events.on( this.name + "." + eventName, handler );
	};

	Task.prototype.run = function( done ) {
		done();
	};

	Task.prototype.publish = function( topic, message ) {
		var e = this.events[ topic ];
		if( e ) {
			var args = _.flatten( _.pick( message, e ) );
			args.unshift( this.name + "." + topic );
			anvil.events.raise.apply( undefined, args );
		}
		anvil.bus.publish( this.name, topic, message );
	};

	Task.prototype.raise = function( eventName ) {
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

	Task.prototype.subscribe = function( eventName, handler ) {
		anvil.bus.subscribe( this.name, eventName, handler );
	};

	anvil.task = function( name, description, opt1, opt2 ) {
		var instance = new Task( name, description, opt1, opt2 );
		_.bindAll( instance );
		anvil.extensions.tasks[ instance.name ] = instance;
		anvil.raise( "task.loaded", instance );
		anvil.log.debug( "loaded task " + instance.name );
		return instance;
	};
};

module.exports = taskFactory;