/*
	anvil.js - an extensible build system
	version:	0.9.0-RC4
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var monitor = require( "forever-monitor" );

module.exports = function( _, anvil ) {

	var Process = function( id ) {
		this.id = id;
		this.goPostal( id );
	};

	Process.prototype.start = function() {

	};

	Process.prototype.stop = function() {

	};

	Process.prototype.start = function() {

	};

	anvil.addEvents( Process );


	var ProcessHost = function() {

		

	};

	anvil.addEvents( ProcessHost );

	return new ProcessHost();
};