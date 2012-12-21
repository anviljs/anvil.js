/*
	anvil.js - an extensible build system
	version:	0.9.0-RC3.1
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var path = require( "path" );

var widgetFactory = function( _, anvil ) {

	var Widget = function() {
		_.bindAll( this );
		this.name = "";
		this.config = {};
		this.events = {};
	};

	Widget.prototype.configure = function( config, command, done ) {
		done();
	};

	Widget.prototype.on = function( eventName, handler ) {
		anvil.events.on( this.name + "." + eventName, handler );
	};

	Widget.prototype.run = function( done, activity ) {
		done();
	};

	Widget.prototype.publish = function( topic, message ) {
		var e = this.events[ topic ];
		if( e ) {
			var args = _.flatten( _.pick( message, e ) );
			args.unshift( this.name + "." + topic );
			anvil.events.raise.apply( undefined, args );
		}
		anvil.bus.publish( this.name, topic, message );
	};

	Widget.prototype.raise = function( eventName ) {
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

	Widget.prototype.subscribe = function( eventName, handler ) {
		anvil.bus.subscribe( this.name, eventName, handler );
	};

	anvil.widget = function( instance, baseline, relative ) {
		var base = new Widget();
		base.resourcePath = anvil.fs.buildPath( [ path.resolve( baseline, relative ), instance.name ] );
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		anvil.extensions.widgets[ instance.name ] = extended;
		anvil.raise( "widget.loaded", extended );
		anvil.log.debug( "loaded widget " + instance.name );
		return extended;
	};
};

module.exports = widgetFactory;