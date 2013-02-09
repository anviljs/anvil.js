/*
	anvil.js - an extensible build system
	version:	0.9.2
	author:		Alex Robson <alex@sharplearningcurve.com> (http://sharplearningcurve.com)
	copyright:	2011 - 2012
	license:	Dual licensed
				MIT (http://www.opensource.org/licenses/mit-license)
				GPL (http://www.opensource.org/licenses/gpl-license)
*/
var activityManagerFactory = function( _, machina, anvil ) {

	var activityManager = {

		initialState: "waiting",
		activities: {},
		pipelines: {},
		activityIndex: 0,

		handleEvent: function( eventName ) {
			var self = this;
			anvil.on( eventName, function( args ) {
				self.handle( eventName, args );
			} );
		},

		addPluginToActivity: function( plugin, activity ) {
			var plugins;
			if( !this.activities[ activity ] ) {
				plugins = [];
				this.activities[ activity ] = plugins;
			} else {
				plugins = this.activities[ activity ];
			}
			plugins.push( plugin );
		},

		onBuildStop: function( reason ) {
			anvil.log.error( "The build has stopped because: \n" + reason );
			this.transition( "interrupted" );
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
				var steps = _.clone( this.pipelines[ activity ] );
				anvil.scheduler.pipeline( undefined, steps, done );
			} catch ( err ) {
				anvil.log.error( " error running activity " + anvil.config.activityOrder[ this.activityIndex ] + " : " + err + "\n" + err.stack );
			}
		},

		states: {
			"waiting": {
				_onEnter: function() {
					this.handleEvent( "plugins.configured" );
					this.handleEvent( "plugin.loaded" );
					this.handleEvent( "command.activated" );
					this.handleEvent( "rebuild" );
					this.handleEvent( "config" );
					this.handleEvent( "build.stop" );
				},
				"command.activated": function( args ) {
					action = args.callback;
					this.commandAction = action;
					this.transition( "commandMode" );
				},
				"plugin.loaded": function( args ) {
					var self = this,
						plugin = args.instance;
					if( plugin.activities ) {
						_.each( plugin.activities, function( activity ) {
							self.addPluginToActivity( plugin, activity );
						} );
					} else {
						this.addPluginToActivity( plugin, plugin.activity );
					}
				},
				"plugins.configured": function() {
					var self = this;
					_.each( self.activities, function( plugins, activity ) {
						var sorted = anvil.utility.dependencySort( plugins, "ascending", function( plugin, dependency ) {
							return dependency === plugin.name;
						} );
						self.pipelines[ activity ] = _.map( sorted, function( plugin ) {
							if( plugin.run ) {
								return function( done ) {
									anvil.log.event( "plugin: '" + plugin.name + "'" );
									plugin.run.apply( plugin, [ done, activity ] );
								};
							}
						} );
						
						self.states[ activity ] = {
							_onEnter: self.runActivity,
							"build.stop": self.onBuildStop
						};
					} );
					this.transition( _.first( anvil.config.activityOrder ) );
				}
			},
			"finished": {
				_onEnter: function() {
					anvil.log.complete( "build completed" );
					anvil.emit( "build.done" );
				},
				"rebuild": function( args ) {
					var startingWith = args.step;
					this.activityIndex = _.indexOf( anvil.config.activityOrder, startingWith );
					anvil.log.step( this.activityIndex === 0 ? "rebuilding project" : "starting incremental build" );
					this.transition( startingWith );
				}
			},
			"interrupted": {
				"rebuild": function() {
					var start = anvil.config.activityOrder[ 0 ];
					anvil.log.step( "restarting previously failed build" );
					this.transition( start );
				}
			},
			"commandMode": {
				_onEnter: function() {
					anvil.log.debug( "Entering command mode, no build will run" );
				},
				"plugins.configured": function() {
					this.commandAction();
				}
			}
		}

	};

	var machine = new machina.Fsm( activityManager );
	return machine;
};

module.exports = activityManagerFactory;