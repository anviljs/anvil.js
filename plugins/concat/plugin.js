var yaml = require( "js-yaml" );

var concatFactory = function( _, anvil ) {

	return anvil.plugin( {
		name: "concat",
		activities: [ "combine", "pre-process" ],
		commander: [
			[ "--concat [value]", "uses a specific yaml or json file to drive concatenation" ]
		],
		list: [],
		translated: false,

		configure: function( config, command, done ) {
			if( command.concat ) {
				this.parseFile( command.concat, done );
			} else {
				done();
			}
		},

		cleanup: function( done ) {
			var files =	_.filter( anvil.project.files, function( file ) {
					var ext = file.extension();
					return ext === ".yml" || ext === ".yaml";
				} );
			anvil.scheduler.parallel( files, function( file, done ) {
				var newName = file.name.replace( ".yml", "" ).replace( ".yaml", "" );
				anvil.fs.rename(
					[ file.workingPath, file.name ],
					[ file.workingPath, newName ],
					function( err ) {
						if( !err ) {
							file.name = newName;
						}
						done();
					} );
			}, function() { done(); } );
		},

		run: function( done, activity ) {
			if( activity == "combine" ) {
				this.process( done );
			} else {
				this.cleanup( done );
			}
		},

		createFiles: function( list, done ) {
			var	keys = _.keys( list ),
				files = _.map( keys, function( parent ) {
				var children = list[ parent ];
				return {
					path: parent + ".yaml",
					includes: children
				};
			} );
			anvil.scheduler.parallel( files, this.createFile, done );
		},

		createFile: function( file, done ) {
			var content = _.map( file.includes, function( child ) {
								return "- import: '" + child + "'";
							} ).join( "\n" );
			var originSpec = anvil.fs.buildPath( [ anvil.config.source, file.path ] );
			var workingSpec = anvil.fs.buildPath( [ anvil.config.working, file.path ] );
			var data = anvil.fs.buildFileData( anvil.config.source, anvil.config.working, originSpec );
			anvil.project.files.push( data );
			anvil.fs.write( workingSpec, content, done );
		},

		parseFile: function( file, done ) {
			var self = this;
			if( file.match( /[.]yaml$/ ) ) {
				anvil.fs.read( file, function( content, error ) {
					if( !error ) {
						content = content.replace( /\t/g, "   " );
						self.list = yaml.load( content );
					}
					done();
				} );
			} else {
				anvil.fs.read( file, function( content, error ) {
					if( !error ) {
						self.list = JSON.parse( content );
					}
					done();
				} );
			}
		},

		process: function( done ) {
			var self = this;
			this.createFiles( this.list, function() {
				self.transformFiles( function() { done(); } );
			} );
		},

		transformFiles: function( done ) {
			var files = _.filter( anvil.project.files, function( file ) {
					var ext = file.extension();
					return ext === ".yml" || ext === ".yaml";
				} );
			anvil.scheduler.parallel( files, function( file, done) {
				anvil.fs.read( [ file.workingPath, file.name ], function( content, error ) {
					if( !error ) {
						content = content.replace( /\t/g, "   " );
						var list = yaml.load( content );
						if( _.isArray( list ) && !list[ 0 ][ "import" ] ) {
							content = _.map( list, function( child ) {
								return !child.match( /import/ ) ? "- import: '" + child + "'" : child;
							} ).join( "\n" );
							anvil.fs.write( [ file.workingPath, file.name ], content, done );
						}
					}
					done();
				} );
			}, done );
		}
	} );
};

module.exports = concatFactory;