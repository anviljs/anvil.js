var path = require( "path" );

var combinerFactory = function( _, anvil ) {

	var isADependency = function( file, dependencies ) {
		return _.any( dependencies, function( dependency ) {
			return dependency.fullPath === file.fullPath;
		} );
	};

	var sort = function( files ) {
		var newList = [];
		_.each( files, function( file ) { file.visited = false; } );
		_.each( files, function( file ) { visit( files, file, newList ); } );
		return newList;
	};
			
	var visit = function( files, file, list ) {
		if( !file.visited ) {
			file.visited = true;
			_.each( files, function( other ) {
				var dependsOn = isADependency( file, other.dependencies );
				if( dependsOn ) {
					if( file.state != "done" ) {
						other.state = "inProcess";
					}
					visit( files, other, list );
				}
			} );
			list.push( file );
		}
	};

	return anvil.plugin( {
		name: "combiner",
		activity: "combine",
		dependencies: [ "concat" ],
		config: {
			patterns: [
				{
					extensions: [ ".html" ],
					find: /[<][!][-]{2}.?import[(]?.?[\"'].*[\"'].?[)]?.?[-]{2}[>]/g,
					replace: /([ \t]*)[<][!][-]{2}.?import[(]?.?[\"']replace[\"'].?[)] ?.?[-]{2}[>]/g
				},
				{
					extensions: [ ".js", ".coffee" ],
					find: /([\/]{2}|[\#]{3}).?import.?[(]?.?[\"'].*[\"'].?[)]?[;]?.?([\#]{0,3})/g,
					replace: /([ \t]*)([\/]{2}|[\#]{3}).?import.?[(]?.?[\"']replace[\"'].?[)]?[;]?.?[\#]{0,3}/g
				},
				{
					extensions: [ ".css", ".less", ".styl" ],
					find: /([\/]{2}|[\/][*]).?import[(]?.?[\"'].*[\"'].?[)]?([*][\/])?/g,
					replace: /([ \t]*)([\/]{2}|[\/][*]).?import[(]?.?[\"']replace[\"'].?[)]?([*][\/])?/g
				},
				{
					extensions: [ ".yaml", ".yml" ],
					find: /([ \t]*)[-][ ]?import[:][ ]*[\"'].*[\"']/g,
					replace: /([ \t]*)[-][ ]?import[:][ ]*[\"']replace[\"']/g
				}
			]
		},
		getPattern: function( extension ) {
			return _.find( anvil.config.combiner.patterns, function( pattern ) {
				return _.any( pattern.extensions, function( ext ) { return extension == ext; } );
			} ) || {};
		},

		run: function( done ) {
			_.bindAll( self );
			var self = this,
				list = anvil.project.files,
				findImports = _.bind( function( file, done ) {
					self.findImports( file, list, done );
				}, this );

			anvil.scheduler.parallel( list, findImports, function() {
				_.each( list, function( file ) {
					self.findDependents( file, list );
				} );
				var sorted = _.map( sort( list ), function( file ) {
					return function( done ) {
						self.combine( file, done );
					};
				} );
				
				anvil.scheduler.pipeline( undefined, sorted, done );
			} );
		},

		combine: function( file, done ) {
			var self = this;
			try {
				if( file.imports.length > 0 ) {
					var steps = _.map( file.imports, function( imported ) {
						return self.getStep( file, imported );
					} );
					var fileSpec = [ file.workingPath, file.name ];
					anvil.fs.read( fileSpec, function( main ) {
						anvil.scheduler.pipeline( main, steps, function( result ) {
							if( result ) {
								anvil.fs.write( fileSpec, result, function() { done(); } );
							} else {
								done();
							}
						} );
					} );
				} else {
					done();
				}
			} catch ( err ) {
				anvil.log.error( "Error combining imports for '" + file.fullPath + "/" + file.name + "'" );
			}
		},

		findDependents: function( file, list ) {
			var imported = function( importFile ) {
				return file.fullPath === importFile.fullPath;
			};
			_.each( list, function( item ) {
				if( _.any( item.imports, imported ) ) {
					file.dependents++;
				}
			} );
		},

		findImports: function( file, list, done ) {
			var self = this,
				imports = [],
				ext = file.extension(),
				pattern = this.getPattern( ext );
			
			if( file.state != "done" )
			{
				anvil.fs.read( [ file.workingPath, file.name ], function( content, err ) {
					imports = imports.concat( content.match( pattern.find ) );
					imports = _.filter( imports, function( x ) { return x; } );
					_.each( imports, function( imported ) {
						importName = imported.match( /[\"'].*[\"']/ )[ 0 ].replace( /[\"']/g, "" );
						importName = importName.match( /^[.]{1,2}[\/]/ ) ?
										importName : "./" + importName;
						importedFile = _.find( list,
							function( i ) {
								var relativeImportPath = path.relative(
										path.dirname( file.fullPath ),
										path.dirname( i.fullPath ) ),
									relativeImport = anvil.fs.buildPath( [ relativeImportPath, i.name ] );
								relativeImport = relativeImport.match( /^[.]{1,2}[\/]/ ) ?
									relativeImport : "./" + relativeImport;
								return relativeImport === importName;
							} );
						if( importedFile ) {
							file.imports.push( importedFile );
						}
					} );
					done();
				} );
			} else {
				done();
			}
		},

		getStep: function( file, imported ) {
			var self = this;
			return function( text, done ) {
				if( file.state != "done" || imported != "done" ) {
					anvil.log.debug( "combining '" + imported.fullPath + "' into '" + imported.fullPath + "'");
					self.replace( text, file, imported, done );
				} else {
					done();
				}
			};
			
		},

		replace: function( content, file, imported, done ) {
			var ext = file.extension(),
				pattern = this.getPattern( ext ).replace,
				source = imported.name,
				working = imported.workingPath,
				importAlias = anvil.fs.buildPath( [ path.relative(
								path.dirname( file.fullPath ),
								path.dirname( imported.fullPath )
							), imported.name ] ),
				relativeImport = anvil.fs.buildPath( [ imported.workingPath, imported.name ] );

			try {
				anvil.fs.read( [ working, source ], function( newContent ) {
					var stringified = pattern.toString().replace( /replace/, "([.][\/])?" + importAlias ),
						trimmed = stringified.substring( 1, stringified.length - 2 ),
						fullPattern = new RegExp( trimmed, "g" ),
						capture = fullPattern.exec( content ),
						sanitized = newContent.replace( "$", "dollarh" ),
						whiteSpace, replaced;

					if( capture && capture.length > 1 ) {
						whiteSpace = capture[1];
						sanitized = whiteSpace + sanitized.replace( /\n/g, ( "\n" + whiteSpace ) );
					}

					replaced = content.replace( fullPattern, sanitized ).replace( "dollarh", "$" );
					done( replaced );
				} );
			} catch ( err ) {
				anvil.log.error( "Error replacing import statements for '" + file.fullPath + "/" + file.name + "'" );
				done();
			}
		}
	} );
};

module.exports = combinerFactory;