var path = require( "path" );

var widgetFactory = function( _, anvil ) {

	var Widget = function() {
		_.bindAll( this );
		this.name = "";
		this.category = "build";
		this.config = {};
		this.events = {};
	};

	anvil.addEvents( Widget );

	Widget.prototype.configure = function( config, command, done ) {
		done();
	};

	Widget.prototype.run = function( done, activity ) {
		done();
	};

	anvil.widget = function( instance, baseline, relative ) {
		var base = new Widget();
		base.resourcePath = anvil.fs.buildPath( [ path.resolve( baseline, relative ), instance.name ] );
		var extended = _.extend( base, instance );
		_.bindAll( extended );
		anvil.extensions.widgets[ instance.name ] = extended;
		anvil.emit( "widget.loaded", { instance: extended } );
		anvil.log.debug( "loaded widget " + instance.name );
		extended.goPostal( instance.name );
		return extended;
	};
};

module.exports = widgetFactory;