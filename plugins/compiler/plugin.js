var compilerFactory = function( _, anvil ) {

	var Compiler = function() {
		this.name = "compiler";
		this.activity = "compile";
		this.command = [];
		this.dependencies = [];

		this.config = {
			compilers: {}
		};

		anvil.addCompiler = function( ext, instance ) {
			anvil.config.compiler.compilers[ ext ] = instance;
		};
	};

	Compiler.prototype.compile = function( file, done ) {
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
	};

	Compiler.prototype.run = function( done ) {
		anvil.scheduler.parallel( anvil.project.files, this.compile, function() { done(); } );
	};

	return new Compiler();
};

module.exports = compilerFactory;