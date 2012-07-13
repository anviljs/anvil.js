var machina = require( "machina" );

var fileLoaderFactory = function( _, anvil ) {
	
	var loader = {
		name: "fileLoader",
		activity: "identify",
		commander: [],
		prerequisites: [],
		config: {

		},
		states = {
			"waiting": {
				_onEnter: function() {
					_.bindAll( this );
				}
			},

			"scanning": {

			},

			"watching": {
				
			}
		}
	};

	return new machina.Fsm( loader );
};

module.exports = fileFactory;