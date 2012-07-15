var consoleLogFactory = function( _, anvil ) {
	
	var ConsoleLogger = function() {
		_.bindAll( this );

		anvil.events.on( "log.options", this.onOptions );
		anvil.events.on( "log.debug", this.onDebug );
		anvil.events.on( "log.event", this.onEvent );
		anvil.events.on( "log.step", this.onStep );
		anvil.events.on( "log.complete", this.onComplete );
		anvil.events.on( "log.warning", this.onWarning );
		anvil.events.on( "log.error", this.onError );
	};

	ConsoleLogger.prototype.log = function( level, x ) {
		if( anvil.config.log.options[ level ] ) {
			console.log( x );
		}
	};

	ConsoleLogger.prototype.onOptions = function( options ) {
		this.options = options;
	};

	ConsoleLogger.prototype.onDebug = function( x ) {
		this.log( "debug", x.magenta );
	};

	ConsoleLogger.prototype.onEvent = function( x ) {
		this.log( "event", x );
	};

	ConsoleLogger.prototype.onStep = function( x ) {
		this.log( "step", x.blue );
	};

	ConsoleLogger.prototype.onComplete = function( x ) {
		this.log( "complete", x.green );
	};

	ConsoleLogger.prototype.onWarning = function( x ) {
		this.log( "warning", x.yellow );
	};

	ConsoleLogger.prototype.onError = function( x ) {
		this.log( "error", x.red );
	};

	return new ConsoleLogger();
};

module.exports = consoleLogFactory;