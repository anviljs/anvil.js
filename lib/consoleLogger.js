/*
	anvil.js - an extensible build system
	version:	0.9.0-RC3.1
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var consoleLogFactory = function( _, anvil ) {
	
	var ConsoleLogger = function() {
		_.bindAll( this );
		anvil.console = this;
		this.on();
	};

	ConsoleLogger.prototype.on = function() {
		this.handles = [
			anvil.on( "log.debug", this.onDebug ),
			anvil.on( "log.event", this.onEvent ),
			anvil.on( "log.step", this.onStep ),
			anvil.on( "log.complete", this.onComplete ),
			anvil.on( "log.warning", this.onWarning ),
			anvil.on( "log.error", this.onError )
		];
	};

	ConsoleLogger.prototype.off = function() {
		if( this.handles && this.handles.length ) {
			_.each( this.handles, function( handle ) {
				handle.cancel();
			} );
		}
	};

	ConsoleLogger.prototype.log = function( level, x ) {
		if( anvil.config.log[ level ] ) {
			console.log( x );
		}
	};

	ConsoleLogger.prototype.onDebug = function( x ) {
		this.log( "debug", "\t" + x.magenta );
	};

	ConsoleLogger.prototype.onEvent = function( x ) {
		this.log( "event", "\t" + x );
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