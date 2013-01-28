var pluginFactory = function( _, anvil ) {
	return anvil.plugin( {
		test: function() {
			return "hello anvil!";
		}
	} );
};

module.exports = pluginFactory;