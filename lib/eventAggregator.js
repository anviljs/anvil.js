/*
	anvil.js - an extensible build system
	version:	0.8.15
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var eventAggregatorFactory = function( _ ) {
	
	var EventAggregator = function() {
		_.bindAll( this );
		this.events = {};
	};

	EventAggregator.prototype.ignore = function( eventName, onEvent ) {
		var handlers = this.events[ eventName ];
		if( handlers ) {
			this.events[ eventName ] = _.reject( handlers, function( handler ) {
				return handler === onEvent;
			} );
		}
	};

	EventAggregator.prototype.on = function( eventName, onEvent ) {
		var self = this,
			handlers;
		onEvent.cancel = function() { self.ignore( eventName, onEvent ); };
		if( ( handlers = this.events[ eventName ] ) ) {
			handlers.push( onEvent );
		} else {
			this.events[ eventName ] = [ onEvent ];
		}
		return onEvent;
	};

	EventAggregator.prototype.raise = function( eventName ) {
		var handlers = this.events[ eventName ] || [],
			fullArgs = Array.prototype.slice.call( arguments ),
			args = fullArgs.slice( 1 );

		_.each( handlers, function( handler ) {
			try {
				handler.apply( undefined, args );
			} catch( error ) {
				// we don't need to do anything,
				// but there's no reason to blow up
				// just because a subscriber did
			}
		} );
	};

	return new EventAggregator();
};

module.exports = eventAggregatorFactory;