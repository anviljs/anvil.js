/*
	anvil.js - an extensible build system
	version:	0.8.3
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var path = require( "path" );

var harnessFactory = function( _, anvil ) {

	var Harness = function() {
		_.bindAll( this );
		this.command = [];
		this.build = {};
		this.files = {};
		this.root = path.resolve( "./" );
	};

	return new Harness();

};

module.exports = harnessFactory;