var child_process = require( "child_process" );


var pluginInstallerFactory = function( pluginManager, log ) {
	
	return function( pluginName, onComplete ) {
		var child = child_process.spawn( "npm", [ "install", pluginName ], { cwd: process.cwd() + "/plugins" } );
		child.on( "exit", function( code ) {
			if( code === 0 ) {
				anvil.log.complete( "Installation of " + pluginName + " completed successfully." );
				onComplete();
			} else {
				anvil.log.error( "Installation of " + pluginName + " has failed" );
				onComplete( { plugin: pluginName, code: code } );
			}
		} );
	};
};

module.exports = pluginInstallerFactory;