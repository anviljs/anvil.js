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

		handleEvent: function( eventName ) {
			var self = this;
			anvil.events.on( eventName, function() {
				var args = Array.prototype.slice.call( arguments );
				args.unshift( eventName );
				self.handle.apply( self, args );
			} );
		},

		runActivity: function() {
			try {
				var self = this,
					order = anvil.config.activityOrder,
					activity = order[ this.activityIndex ],
					totalActivities = anvil.config.activityOrder.length,
					done = function() {
						var nextActivity = order[ ++self.activityIndex ];
						while( !self.states[ nextActivity ] && self.activityIndex < totalActivities ) {
							nextActivity = order[ ++self.activityIndex ];
						}
						if( self.activityIndex >= totalActivities ) {
							self.transition( "finished" );
						} else {
							self.transition( nextActivity );
						}
					};
				anvil.log.step( "starting activity, " + activity );
				anvil.scheduler.pipeline( undefined, this.pipelines[ activity ], done );
			} catch ( err ) {
				anvil.log.error( " error running activity " + anvil.config.activityOrder[ this.activityIndex ] + " : " + err );
			}
		},

		states: {
			"waiting": {
				_onEnter: function() {
					this.handleEvent( "plugins.configured" );
					this.handleEvent( "plugin.loaded" );
					this.handleEvent( "rebuild" );
					this.handleEvent( "config" );
				},
				"plugin.loaded": function( plugin ) {
					var plugins;
					if( !this.activities[ plugin.activity ] ) {
						plugins = [];
						this.activities[ plugin.activity ] = plugins;
					} else {
						plugins = this.activities[ plugin.activity ];
					}
					if( plugins ) {
						plugins.push( plugin );
					}
				},
				"plugins.configured": function() {
					var self = this;
					_.each( self.activities, function( plugins, activity ) {
						var sorted = sort( plugins );
						self.pipelines[ activity ] = _.map( sorted, function( plugin ) {
							if( plugin.run ) {
								return function( done ) {
									anvil.log.event( "running plugin: '" + plugin.name + "'" );
									plugin.run.apply( plugin, [ done ] );
								};
							} else {
								return function( done ) { done(); };
							}
						} );
						self.states[ activity ] = {
							_onEnter: self.runActivity
						};
					} );
					this.transition( _.first( anvil.config.activityOrder ) );
				}
			},
			"finished": {
				_onEnter: function() {
					anvil.log.complete( "build completed" );
					anvil.events.raise( "build.done" );
				},
				"rebuild": function() {
					this.activityIndex = 0;
					this.transition( _.first( anvil.config.activityOrder ) );
				}
			}
		}

	};

	var machine = new machina.Fsm( activityManager );
	//_.bindAll( machine );
	return machine;
};

module.exports = activityManagerFactory;