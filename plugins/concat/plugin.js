var yaml = require( "js-yaml" );

var concatFactory = function( _, anvil ) {

	var Concat = function() {
		this.name = "concat";
		this.activities = [ "combine", "pre-process" ];
		this.commander = [
			[ "--concat [value]", "uses a specific yaml file to drive concatenation", "./concat.yaml" ]
		];
		this.dependencies = [];
		this.list = {};
		this.translated = false;
	};

	Concat.prototype.configure = function( config, command, done ) {
		var self = this;
		anvil.fs.read( command.concat, function( content, error ) {
			if( !error ) {
				content = content.replace( /\t/g, "   " );
				self.list = yaml.load( content );
			}
			done();
		} );
	};

	Concat.prototype.run = function( done, activity ) {
		if( activity == "combine" ) {
			this.process( done );
		} else {
			this.cleanup( done );
		}
	};

	Concat.prototype.cleanup = function( done ) {
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
	};

	Concat.prototype.createFiles = function( list, done ) {
		var	keys = _.keys( list ),
			files = _.map( keys, function( parent ) {
			var children = list[ parent ];
			return {
				path: parent + ".yaml",
				includes: children
			};
		} );
		anvil.scheduler.parallel( files, this.createFile, done );
	};

	Concat.prototype.createFile = function( file, done ) {
		var content = _.map( file.includes, function( child ) {
							return "- import: '" + child + "'";
						} ).join( "\n" );
		var originSpec = anvil.fs.buildPath( [ anvil.config.source, file.path ] );
		var workingSpec = anvil.fs.buildPath( [ anvil.config.working, file.path ] );
		var data = anvil.fs.buildFileData( anvil.config.source, anvil.config.working, originSpec );
		anvil.project.files.push( data );
		anvil.fs.write( workingSpec, content, done );
	};

	Concat.prototype.process = function( done ) {
		var self = this;
		this.createFiles( this.list, function() {
			self.transformFiles( function() { done(); } );
		} );
	};

	Concat.prototype.transformFiles = function( done ) {
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
	};

	return new Concat();
};

module.exports = concatFactory;