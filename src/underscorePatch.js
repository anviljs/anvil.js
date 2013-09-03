// Really?
// Really?
// I have to write this crap back into underscore
// because it was pulled out without backwards compat?
// Really?
// Because typing all my functions in as strings is better?
// Really?
// Fine :|
// P.S. Thanks to Jim Cowart (@ifandelse) for the suggestion :)

module.exports = function ( _ ) {
	var lameBindAll = _.bindAll;
	_.bindAll = function( target ) {
		var args = Array.prototype.slice.call(arguments, 0);
		if( args.length === 1 ) {
			args = _.methods( target );
			args.unshift( target );
		}
		if( args.length > 1 ) {
			lameBindAll.apply( null, args );
		}
	};
};