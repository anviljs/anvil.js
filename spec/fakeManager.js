var fakeManagerFactory = function( _, anvil ) {
	var plugins = [];
	var fakeManager = {
		checkDependencies: function( dependencies, done ) {
			done();
		},
		getExtensions: function( done ) {
			_.each( plugins, function( plugin ) {
				anvil.plugin( plugin );
			} );
			done();
		},
		getLocalExtensions: function( done ) {
			done();
		}
	};

	var pluginA = {
		name: "pluginA",
		activity: "test1",
		commander: [
			[ "-a --pa [value]", "a's description", "a" ]
		],
		prerequisites: [ "pluginC" ],
		config: {},
		ran: false,

		configure: function( config, command, done ) {
			this.config.commandLine = command.pa;
			anvil.config.activityOrder = [ "test1" ];
			done();
		},

		run: function( done ) {
			this.ran = true;
			done();
		}
	};

	var pluginB = {
		name: "pluginB",
		activity: "test1",
		prerequisites: [  ],
		ran: false,

		run: function( done ) {
			this.ran = true;
			done();
		}
	};

	var pluginC = {
		name: "pluginC",
		activity: "test1",
		prerequisites: [ "pluginB" ],
		ran: false,

		run: function( done ) {
			this.ran = true;
			done();
		}
	};

	_.bindAll( fakeManager );

	plugins = [ pluginA, pluginB, pluginC ];

	return fakeManager;
};

module.exports = fakeManagerFactory;