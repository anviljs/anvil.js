/*
	anvil.js - an extensible build system
	version:	0.9.0-RC4
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var pluginFactory = function( _, anvil ) {

	var Plugin = function() {
		_.bindAll( this );
		this.name = "";
		this.activity = "";
		this.dependencies =[];
		this.commander = [];
		this.config = {};
		this.events = {};
	};

	anvil.addEvents( Plugin );

	Plugin.prototype.configure = function( config, command, done ) {
		done();
	};

	Plugin.prototype.run = function( done, activity ) {
		done();
	};

	anvil.plugin = function( instance ) {
		var base = new Plugin();
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		anvil.extensions.plugins[ instance.name ] = extended;
		anvil.emit( "plugin.loaded", { instance: extended } );
		anvil.log.debug( "loaded plugin " + instance.name );
		extended.goPostal( this.name );
		return extended;
	};

};

module.exports = pluginFactory;