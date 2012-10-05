/*
	anvil.js - an extensible build system
	version:	0.8.11
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var busFactory = function( _, postal ) {
	
	var Bus = function() {

	};

	Bus.prototype.publish = function( channel, topic, message ) {
		// try {
		postal
			.channel( { channel: channel, topic: topic } )
			.publish( message );
		// } catch ( err ) {
		// 	console.log( "Could not publish message to channel '" + channel + "' and topic '" + topic + "'" );
		// }
	};

	Bus.prototype.subscribe = function( channel, topic, callback ) {
		postal
			.channel( { channel: channel, topic: topic } )
			.subscribe( function() {
				try {
					callback.apply( this, arguments );
				} catch ( error ) {
					// we don't need to do anything,
					// but there's no reason to blow up
					// just because a subscriber did
				}
			} );
	};

	return new Bus();
};

module.exports = busFactory;