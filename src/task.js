var taskFactory = function( _, anvil ) {

	var checkArg = function( task, arg ) {
		if( _.isArray( arg ) ) {
			task.dependencies = arg;
		} else if( _.isFunction( arg ) ) {
			task.call = arg;
		}
	};

	var Task = function( name, description, opt1, opt2 ) {
		_.bindAll( this );
		this.name = name;
		this.description = description || "";
		this.dependencies = [];
		this.config = {};
		this.events = {};
		checkArg( this, opt1 );
		checkArg( this, opt2 );
	};

	Task.prototype.configure = function( config, command, done ) {
		done();
	};

	Task.prototype.on = function( eventName, handler ) {
		anvil.events.on( this.name + "." + eventName, handler );
	};

	Task.prototype.getTask = function( taskName ) {
         return anvil.extensions.tasks[ taskName ];
    },

    Task.prototype.getList = function( taskName, list, missing ) {
        var self = this;
        if( list[ taskName ] ) {
            return;
        } else {
            var task = this.getTask( taskName );
            if( task ) {
                if( task.dependencies.length ) {
                    _.each( task.dependencies, function( dependency ) {
                        self.getList( dependency, list, missing );
                    } );
                }
                list[ taskName ] = task;
            } else {
                missing.push( taskName );
            }
        }
    },

    Task.prototype.run = function( options, done ) {
        var tasks = {},
            missing = [];
        this.getList( this.name, tasks, missing );
        if( missing.length ) {
            anvil.log.error( "The following tasks could not be found: " );
                _.each( missing, function( dependency ) {
                    anvil.log.error( "   " + dependency );
                } );
        } else {
            var sorted = anvil.utility.dependencySort( tasks, "ascending", function( a, b ) {
                return a.name === b.name;
            } );
            var calls = _.pluck( tasks, "call" );
            anvil.scheduler.pipeline( undefined, calls, done );
        }
    },

    Task.prototype.call = function( done ) {
		done();
    };

	Task.prototype.publish = function( topic, message ) {
		var e = this.events[ topic ];
		if( e ) {
			var args = _.flatten( _.pick( message, e ) );
			args.unshift( this.name + "." + topic );
			anvil.events.raise.apply( undefined, args );
		}
		anvil.bus.publish( this.name, topic, message );
	};

	Task.prototype.raise = function( eventName ) {
		var e = this.events[ eventName ],
			fullArgs = Array.prototype.slice.call( arguments ),
			args = fullArgs.slice( 1 );
		if( args.length > 0 && e ) {
			var msg = _[ "object" ]( e, args );
			anvil.bus.publish( this.name, eventName, msg );
		}
		args.unshift( this.name + "." + eventName );
		anvil.events.raise.apply( undefined, args );
	};

	Task.prototype.subscribe = function( eventName, handler ) {
		anvil.bus.subscribe( this.name, eventName, handler );
	};

	anvil.task = function( name, description, opt1, opt2 ) {
		var instance = new Task( name, description, opt1, opt2 );
		_.bindAll( instance );
		anvil.extensions.tasks[ instance.name ] = instance;
		anvil.raise( "task.loaded", instance );
		anvil.log.debug( "loaded task " + instance.name );
		return instance;
	};
};

module.exports = taskFactory;