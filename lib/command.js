/*
	anvil.js - an extensible build system
	version:	0.9.3
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var commandFactory = function( _, anvil ) {

	var Command = function() {
		_.bindAll( this );
		this.name = "";
		this.commander = {};
		this.config = {};
		this.events = {};
	};

	anvil.addEvents( Command );

	Command.prototype.configure = function( config, command, done ) {
		done();
	};

	Command.prototype.run = function( done, activity ) {
		done();
	};

	anvil.command = function( instance ) {
		var base = new Command();
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		anvil.extensions.commands[ instance.name ] = extended;
		anvil.emit( "command.loaded", { instance: extended } );
		anvil.log.debug( "loaded command " + instance.name );
		extended.goPostal( this.name );
		return extended;
	};
};

module.exports = commandFactory;