var logFactory = function( anvil ) {

	var log = {

		debugLog: [],
		stepLog: [],
		eventLog: [],
		completeLog: [],
		warningLog: [],
		errorLog: [],

		debug: function( text ) {
			this.debugLog.push( text );
		},

		step: function( text ) {
			this.stepLog.push( text );
		},

		event: function( text ) {
			this.eventLog.push( text );
		},

		complete: function( text ) {
			this.completeLog.push( text );
		},

		warning: function( text ) {
			this.warnLog.push( text );
		},

		error: function( text ) {
			this.errorLog.push( text );
			console.log( "mock log error: " + text );
		}
	};

	anvil.log = log;
	return log;
};

module.exports = logFactory;