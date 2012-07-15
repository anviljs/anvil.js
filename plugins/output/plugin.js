var outputFactory = function( _, anvil ) {

	var Output = function() {
		_.bindAll( this );
		this.activity = "push";
		this.name = "";
		this.commander = [];
		this.config = {};
		this.dependencies = [];
	};

	Output.prototype.run( done ) {

	};

	return new Output();
};

module.exports = outputFactory;