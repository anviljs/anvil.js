var logFactory = function( _, anvil ) {
	
	var Log = function() {
	};

	Log.prototype.debug = function( x ) {
		anvil.events.raise( "log.debug", x );
	};

	Log.prototype.event = function( x ) {
		anvil.events.raise( "log.event", x );
	};

	Log.prototype.step = function( x ) {
		anvil.events.raise( "log.step", x );
	};

	Log.prototype.complete = function( x ) {
		anvil.events.raise( "log.complete", x );
	};

	Log.prototype.warning = function( x ) {
		anvil.events.raise( "log.warning", x );
	};

	Log.prototype.error = function( x ) {
		anvil.events.raise( "log.error", x );
	};

	return new Log();
};

module.exports = logFactory;