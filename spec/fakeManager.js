var fakeManagerFactory = function( _ ) {
	
	var fakeManager = {
		plugins: [],
		getPlugins: function() {
			return this.plugins;
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

		configure: function( config, command, done ) {
			this.config = command.pa;
			config.activtyOrder = [ "test1" ];
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

		run: function( done ) {
			this.ran = true;
			done();
		}
	};

	var pluginC = {
		name: "pluginC",
		activity: "test1",
		prerequisites: [ "pluginB" ],

		run: function( done ) {
			this.ran = true;
			done();
		}
	};

	fakeManager.plugins = [
		{ name: "pluginA", instance: pluginA },
		{ name: "pluginB", instance: pluginB },
		{ name: "pluginC", instance: pluginC }
	];

	return fakeManager;
};

module.exports = fakeManagerFactory;