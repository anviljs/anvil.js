var commandFactory = function( _, anvil ) {

	var Command = function() {
		_.bindAll( this );
		this.name = "";
		this.commander = [];
		this.config = {};
		this.events = {};
	};

	Command.prototype.configure = function( config, command, done ) {
		done();
	};

	Command.prototype.on = function( eventName, handler ) {
		anvil.events.on( this.name + "." + eventName, handler );
	};

	Command.prototype.run = function( done, activity ) {
		done();
	};

	Command.prototype.publish = function( topic, message ) {
		var e = this.events[ topic ];
		if( e ) {
			var args = _.flatten( _.pick( message, e ) );
			args.unshift( this.name + "." + topic );
			anvil.events.raise.apply( undefined, args );
		}
		anvil.bus.publish( this.name, topic, message );
	};

	Command.prototype.raise = function( eventName ) {
		var e = this.events[ eventName ],
			fullArgs = Array.prototype.slice.call( arguments ),
			args = fullArgs.slice( 1 );
		if( args.length > 0 && e ) {
			var msg = _[ "object" ]( e, args );
			anvil.bus.publish( this.name, eventName, msg );
		}
		args.unshift( this.name + "." + eventName );
		anvil.events.raise.apply( undefined, args );
	};

	Command.prototype.subscribe = function( eventName, handler ) {
		anvil.bus.subscribe( this.name, eventName, handler );
	};

	anvil.command = function( instance ) {
		var base = new Command();
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		return extended;
	};
};

module.exports = commandFactory;