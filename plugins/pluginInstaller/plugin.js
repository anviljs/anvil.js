var path = require( "path" );

var pluginInstallerFactory = function( _, anvil ) {
	return anvil.plugin( {
		name: "pluginInstaller",
		commander: [
			[ "disable [value]", "Disable plugin" ],
			[ "enable [value]", "Enable plugin" ],
			[ "install [value]", "Install a plugin from npm" ],
			[ "list", "List available plugins" ],
			[ "uninstall [value]", "Uninstall plugin" ]
		],
		commands: [ "disable", "enable", "install", "list", "uninstall" ],

		configure: function( config, commander, done ) {
			var self = this,
				commands = _.chain( this.commands )
							.filter( function( arg ) { return commander[ arg ]; } )
							.map( function( arg ) {
								var value = commander[ arg ];
								return { command: arg, value: value };
							} )
							.value(),
				command = commands.length === 0 ? undefined : commands[ 0 ];
			if( command ) {
				anvil.pluginManager[ command.command ]( command.value, function() {
					anvil.events.raise( "all.stop", 0 );
				} );
			} else {
				done();
			}
		}
	} );
};

module.exports = pluginInstallerFactory;