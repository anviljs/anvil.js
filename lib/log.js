/*
	anvil.js - an extensible build system
	version:	0.9.0
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var logFactory = function( anvil ) {
	
	var Log = function() {
	};

	Log.prototype.debug = function( x ) {
		anvil.emit( "log.debug", { message: x } );
	};

	Log.prototype.event = function( x ) {
		anvil.emit( "log.event", { message: x } );
	};

	Log.prototype.step = function( x ) {
		anvil.emit( "log.step", { message: x } );
	};

	Log.prototype.complete = function( x ) {
		anvil.emit( "log.complete", { message: x } );
	};

	Log.prototype.warning = function( x ) {
		anvil.emit( "log.warning", { message: x } );
	};

	Log.prototype.error = function( x ) {
		anvil.emit( "log.error", { message: x } );
	};

	var log = new Log();
	anvil.log = log;
	return log;
};

module.exports = logFactory;