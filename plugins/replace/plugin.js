var yaml = require( "js-yaml" );

var replaceFactory = function( _, anvil ) {

	var Replace = function() {
		_.bindAll( this );
		this.name = "replace";
		this.activity = "pre-process";
		this.commander = [
			[ "--values [value]", "a key / value JSON or YAML file to use with token replacement" ]
		];
		this.config = {
			tokens: [
				{
					find: /[{]{3}([^}]*)[}]{3}/g,
					replace: /[{]{3}replace[}]{3}/g
				}
			]
		};
	};

	Replace.prototype.configure = function( config, command, done ) {
		var self = this;
		this.loadPackage( function() {
			var valuesPath = command.values || self.config.values;
			if( valuesPath ) {
				self.loadValues( valuesPath, done );
			} else {
				self.config.sourceData = self.config.packageData;
				done();
			}
		} );
	};

	Replace.prototype.loadPackage = function( done ) {
		var self = this;
		anvil.fs.read( "./package.json", function( content, error ) {
			if( !error ) {
				self.config.packageData = JSON.parse( content );
			}
			done();
		} );
	};

	Replace.prototype.loadValues = function( path, done ) {
		var self = this;
		var parse = path.indexOf( "yaml" ) > 0 ?
			function( data ) { return yaml.load( data ); } :
			function( data ) { return JSON.parse( data ); };

		anvil.fs.read( path, function( content, error ) {
			if( !error ) {
				var values = parse( content );
				self.config.sourceData = _.extend( self.config.packageData, values );
			} else {
				self.config.sourceData = self.config.packageData;
			}
			done();
		} );
	};

	Replace.prototype.run = function( done ) {
		anvil.scheduler.parallel( anvil.project.files, this.replaceTokens, function() { done(); } );
	};

	Replace.prototype.replaceTokens = function( file, done ) {
		var self = this;
		anvil.fs.read( [ file.workingPath, file.name ], function( content, error ) {
			if( !error ) {
				_.each( self.config.tokens, function( token ) {
					if( token.find.reset ) {
						token.find.reset();
					}
					var tokens = [],
						match, tokenName;
					while( ( match = token.find.exec( content ) ) ) {
						tokenName = match[1];
						tokens.push( tokenName );
					}
					if( tokens.length > 0 ) {
						var hadReplacement = false;
						_.each( tokens, function( tokenName ) {
							var replacement = self.config.sourceData[ tokenName ],
								stringified, trimmed, replacer;
							if( replacement ) {
								hadReplacement = true;
								stringified = ( token.replace ).toString().replace( /replace/, tokenName );
								trimmed = stringified.substring( 1, stringified.length -2 ),
								replacer = new RegExp( trimmed, "g" );
								content = content.replace( replacer, replacement );
							}
						} );
						if( hadReplacement ) {
							anvil.fs.write( [ file.workingPath, file.name ], content, done );
						} else {
							done();
						}
					} else {
						done();
					}
				} );
			} else {
				done();
			}
		} );
	};

	return new Replace();
};

module.exports = replaceFactory;