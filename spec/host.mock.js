module.exports = function( _, anvil ) {

	var Host = function() {
		this.clients = [];
		_.bindAll( this );
		anvil.http = {
			init: function() {},
			registerPath: function() {}
		};
	};

	return new Host();
};