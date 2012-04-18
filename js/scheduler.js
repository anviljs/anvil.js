// # Scheduler
// Asynchronous abstractions
var SchedulerFactory = function( _ ) {

	function Scheduler() {

	}

	Scheduler.prototype.parallel = function( closures, onComplete ) { 
		var length = 0,
			index = 0,
			results = [],
			callback = function( result, resultIndex ){ 
				results[ resultIndex ] = result;
				if( --length === 0 ) {
					onComplete( results ); 
				}
			},
			call;

		// if the list of closures is empty, then return an empty list.
		if( !closures || ( length = closures.length ) === 0 ) {
			onComplete( [] );
		}

		while( ( call = closures.shift() ) ) {
			call( function( result ) { callback( result, index ); } );
			index++;
		}
	};

	Scheduler.prototype.mapped = function( map, onComplete ) { 
		var remaining = 0,
			results = {},
			callback = function( name, result ){ 
				results[ name ] = result;
				if( --remaining === 0 && firstPassComplete ) {
					onComplete( results );
				}
			},
			firstPassComplete, key;

		for( key in map ){
			if( map.hasOwnProperty( key ) ) {
				remaining++;
				map[ key ]( function( value ){ callback( key, value ); } );
			}
		}
		firstPassComplete = true;

		// if the remaining count is 0, we're done
		if( remaining === 0 ) {
			onComplete( results );
		}
	};

	Scheduler.prototype.pipeline = function( initial, transforms, onComplete ) {
		var current = initial,
			iterate = function iterate() {
				transforms.shift()( current, done );
			},
			done = function done( result ) {
				current = result;
				if( transforms.length === 0 ) {
					onComplete( current );
				} else {
					iterate();
				}
			};		

		if( !transforms || transforms.length === 0 ) {
			onComplete( initial );
		} else {
			iterate( done );
		}
	};

	return Scheduler;
};

module.exports = SchedulerFactory;