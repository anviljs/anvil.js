var child_process = require( "child_process" );


var pluginInstallerFactory = function( pluginManager, log ) {
	
	return function( pluginName, onComplete ) {
		var child = child_process.spawn( "npm", [ "install", pluginName ], { cwd: process.cwd() + "/plugins" } );
		child.on( "exit", function( code ) {
			if( code === 0 ) {
				console.log( "Installation of " + pluginName + " completed successfully." );
				onComplete();
			} else {
				console.log( "Installation of " + pluginName + " has failed" );
				onComplete( { plugin: pluginName, code: code } );
			}
		} );
	};
};

module.exports = pluginInstallerFactory;