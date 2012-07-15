var logFactory = function( anvil ) {

	var log = {

		debugLog: [],
		infoLog: [],
		eventLog: [],
		completeLog: [],
		warningLog: [],
		errorLog: [],

		debug: function( text ) {
			this.debugLog.push( text );
		},

		info: function( text ) {
			this.infoLog.push( text );
		},

		event: function( text ) {
			this.eventLog.push( text );
		},

		complete: function( text ) {
			this.completeLog.push( text );
		},

		warn: function( text ) {
			this.warnLog.push( text );
		},

		error: function( text ) {
			this.errorLog.push( text );
		}
	};

	anvil.log = log;
	return log;
};

module.exports = logFactory;