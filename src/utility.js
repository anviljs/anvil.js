var utlityFactory = function( _, anvil ) {

	var visit = function( nodes, node, list, order, match ) {
		if( !node.visited ) {
			node.visited = true;
			var property = order === "ascending" ? "dependencies" : "dependents";
			_.each( nodes, function( neighbor ) {
				var dependsOn = _.any( neighbor[ property ], function( other ) {
					return match( node, other );
				} );
				if( dependsOn ) {
					visit( nodes, neighbor, list, order, match );
				}
			} );
			if( order === "ascending" ) {
				list.unshift( node ); 
			} else {
				list.push( node );
			}

		}
	};

	// Thanks to Jim Cowart for help with this approach
	// adapted from -> http://jsfiddle.net/ifandelse/TDwZy/
	var slice = Array.prototype.slice;
	if ( !_.deepExtend ) {
		var behavior = {
			"*": function( target, property, value ) {
				target[ property ] = value;
			},
			"object": function(target, property, value ) {
				if( _.isObject( target[ property ] ) ) {
					target[ property ] = deepExtend( target[ property ] || {}, value );
				} else {
					target[ property ] = value;
				}
			},
			"array": function( target, property, value ) {
				target[ property ] = _.filter(
										_.union( target[ property ], value ),
										function( x ) {
											return x;
										} );
			}
		},
		getType = function( value ) {
			if( _.isArray( value ) ) {
				return "array";
			} else if ( _.isRegExp( value ) ) {
				return "regex";
			} else if ( _.isDate( value ) ) {
				return "date";
			} else {
				return typeof value;
			}
		},
		getHandlerName = function( value ) {
			var type = getType( value );
			return behavior[ type ] ? type : "*";
		},
		deepExtend = function( target ) {
			_.each( slice.call( arguments, 1 ), function( source ) {
				_.each( source, function( value, property ) {
					behavior[ getHandlerName( value ) ]( target, property, value );
				});
			});
			return target;
		};
		_.mixin( {
			deepExtend: deepExtend
		} );
	}

	JSON.safeParse = function() {
		var fullArgs = Array.prototype.slice.call( arguments ),
			args = fullArgs.slice( 1 ),
			originalJson = fullArgs[ 0 ],
			newJson = originalJson.replace( /[\\]/g, "\\\\" );
		args.unshift( newJson );
		return JSON.parse.apply( undefined, args );
	};

	anvil.utility = {

		dependencySort: function( nodes, order, match ) {
			var newList = [];
			_.each( nodes, function( node ) { node.visited = false; } );
			_.each( nodes, function( node ) { visit( nodes, node, newList, order, match ); } );
			return newList;
		},

		parseRegex: function( regex ) {
			return regex.match( /\/g$/ ) ?
				new RegExp( regex.replace(/\/g$/, "").substring( 1 ), "g" ) :
				new RegExp( regex.substring( 1, regex.length-1 ) );
		}

	};

};

module.exports = utlityFactory;