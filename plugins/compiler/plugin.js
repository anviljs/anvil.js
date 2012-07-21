var compilerFactory = function( _, anvil ) {

	anvil.addCompiler = function( ext, instance ) {
		anvil.config.compiler.compilers[ ext ] = instance;
	};

	return anvil.plugin( {
		name: "compiler",
		activity: "compile",
		config: { compilers: {} },
		compile: function( file, done ) {
			var self = this,
				ext = file.extension(),
				compiler = anvil.config.compiler.compilers[ ext ];

			if( compiler ) {
				var rename = compiler.rename ? compiler.rename( file.name ) : file.name;
				anvil.fs.transform(
					[ file.workingPath, file.name ],
					compiler.compile,
					[ file.workingPath, rename ],
					function( err ) {
						if( err ) {
							anvil.log.error( "Error compiling '" + file.fullPath + "/" + file.name + "' : " + err );
							anvil.events.raise( "build.stop" );
						} else {
							file.name = rename;
							done();
						}
					} );
			} else {
				done();
			}
		},

		run: function( done ) {
			anvil.scheduler.parallel( anvil.project.files, this.compile, function() { done(); } );
		}
	} );
};

module.exports = compilerFactory;