/*
	anvil.js - an extensible build system
	version:	0.9.0-RC2
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var commandFactory = function( _, anvil ) {

	var Command = function() {
		_.bindAll( this );
		this.name = "";
		this.commander = {};
		this.config = {};
		this.events = {};
	};

	Command.prototype.configure = function( config, command, done ) {
		done();
	};

	Command.prototype.on = function( eventName, handler ) {
		anvil.events.on( this.name + "." + eventName, handler );
	};

	Command.prototype.run = function( done, activity ) {
		done();
	};

	Command.prototype.publish = function( topic, message ) {
		var e = this.events[ topic ];
		if( e ) {
			var args = _.flatten( _.pick( message, e ) );
			args.unshift( this.name + "." + topic );
			anvil.events.raise.apply( undefined, args );
		}
		anvil.bus.publish( this.name, topic, message );
	};

	Command.prototype.raise = function( eventName ) {
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

	Command.prototype.subscribe = function( eventName, handler ) {
		anvil.bus.subscribe( this.name, eventName, handler );
	};

	anvil.command = function( instance ) {
		var base = new Command();
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		anvil.extensions.commands[ instance.name ] = extended;
		anvil.raise( "command.loaded", extended );
		anvil.log.debug( "loaded command " + instance.name );
		return extended;
	};
};

module.exports = commandFactory;