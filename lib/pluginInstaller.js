var child_process = require( "child_process" );

var pluginInstallerFactory = function( _, anvil ) {
	
	var PluginInstaller = function() {
		this.name = "pluginInstaller";
		this.commander = [
			[
				[ "disable [value]", "Disable plugin" ],
				[ "enable [value]", "Enable plugin" ],
				[ "install [value]", "Install a plugin from npm" ],
				[ "list", "List available plugins" ],
				[ "uninstall [value]", "Uninstall plugin" ]
			]
		];
		this.commands = [ "disable", "enable", "install", "list", "uninstall" ];
	};

	PluginInstaller.prototype.configure = function( config, commander, done ) {
		var self = this,
			command = _.first( this.commands, function( c ) {
				var arg = commander[ c ];
				if( arg ) {
					return { command: c, value: arg };
				} else {
					return false;
				}
			} );
		this.checkDependencies( config.dependencies );
	};

	PluginInstaller.prototype.install = function( pluginName, done ) {
		var child = child_process.spawn( "npm", [ "install", pluginName ], { cwd: process.cwd() + "/plugins" } );
		child.on( "exit", function( code ) {
			if( code === 0 ) {
				anvil.log.complete( "Installation of " + pluginName + " completed successfully." );
				done();
			} else {
				anvil.log.error( "Installation of " + pluginName + " has failed" );
				done( { plugin: pluginName, code: code } );
			}
		} );
	};
};

module.exports = pluginInstallerFactory;