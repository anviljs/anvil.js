var should = require( "should" );

var pluginFactory = function( _, anvil ) {

	var TestPlugin = function() {
		
	};

	TestPlugin.prototype.onConfig = function( config, commander, done ) {
		
	};

	TestPlugin.prototype.test = function() {
		return "hello anvil!";
	};

	return new TestPlugin();
};

module.exports = pluginFactory;