var should = require( "should" );

var pluginFactory = function( _, anvil, scheduler, fs, log ) {

	var TestPlugin = function() {
		
	};

	TestPlugin.prototype.test = function() {
		return "hello anvil!";
	};

	return new TestPlugin();
};

module.exports = pluginFactory;