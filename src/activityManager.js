var activityManagerFactory = function( _, machina, anvil ) {

	var isADependency = function( plugin, dependencies ) {
		return _.any( dependencies, function( dependency ) {
			return dependency === plugin.name;
		} );
	};

	var sort = function( plugins ) {
		var newList = [];
		_.each( plugins, function( plugin ) { visit( plugins, plugin, newList ); } );
		return newList;
	};
			
	var visit = function( plugins, plugin, list ) {
		if( !plugin.visited ) {
			plugin.visited = true;
			_.each( plugins, function( neighbor ) {
				var dependsOn = isADependency( plugin, neighbor.dependencies );
				if( dependsOn ) {
					visit( plugins, neighbor, list );
				}
			} );
			list.unshift( plugin );
		}
	};

	var activityManager = {

		initialState: "waiting",
		activities: {},
		pipelines: {},
		activityIndex: 0,

		runActivity: function() {
			var self = this,
				activity = anvil.config.activityOrder[ this.activityIndex ],
				done = function() {
					self.activityIndex++;
					if( self.activityIndex >= activities.length ) {
						self.transition( "finished" );
					} else {
						self.transition( anvil.config.activityOrder[ self.activityIndex ] );
					}
				};
			anvil.scheduler.pipeline( {}, this.pipelines[ activity ], done );
		},

		states: {
			"waiting": {
				_onEnter: function() {
					var self = this;
					_.each( anvil.config.activityOrder, function( activity ) {
						self.activities[ activity ] = [];
					} );
					anvil.events.on( "plugins.configured", this.handle );
					anvil.events.on( "plugin.loaded", this.handle );
					anvil.events.on( "rebuild", this.handle );
				},
				"plugin.loaded": function( plugin ) {
					var plugins = this.activities[ plugin.activity ];
					if( plugins ) {
						plugins.push( plugin );
					}
				},
				"plugins.configured": function() {
					var self = this;
					_.each( self.activities, function( activity ) {
						var sorted = sort( self.activities[ activity ] );
						self.activities[ activity ] = sorted;
						self.pipelines[ activity ] = _.pluck( sorted, "run" );
						self.states[ activity ] = {
							_onEnter: self.runActivity
						};
					} );
					this.transition( _.first( anvil.config.activityOrder ) );
				}
			},
			"finished": {
				_onEnter: function() {
					anvil.events.raise( "build.done" );
				},
				"rebuild": function() {
					this.activityIndex = 0;
					this.transition( _.first( anvil.config.activityOrder ) );
				}
			}
		}

	};

	//_.bindAll( activityManager );
	var machine = machina.Fsm( activityManager );
	return machine;
};

module.exports = activityManagerFactory;