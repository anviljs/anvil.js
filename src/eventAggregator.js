var eventAggregatorFactory = function( _ ) {
	
	var EventAggregator = function() {
		_.bindAll( this );
		this.events = {};
	};

	EventAggregator.prototype.on = function( eventName, onEvent ) {
		var handlers;
		if( ( handlers = this.events[ eventName ] ) ) {
			handlers.push( onEvent );
		} else {
			this.events[ eventName ] = [ onEvent ];
		}
	};

	EventAggregator.prototype.raise = function( eventName ) {
		var handlers = this.events[ eventName ],
			fullArgs = Array.prototype.slice.call( arguments ),
			args = fullArgs.slice( 1 );

		_.each( handlers, function( handler ) {
			try {
				handler.apply( undefined, args );
			} catch( error ) {
				console.log( "Error in handler for " + eventName + " : " + error );
				// we don't need to do anything,
				// but there's no reason to blow up
				// just because a subscriber did
			}
		} );
	};

	return new EventAggregator();
};

module.exports = eventAggregatorFactory;