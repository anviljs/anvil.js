var log = {

	debugLog: [],
	infoLog: [],
	eventLog: [],
	warningLog: [],
	errorLog: [],

	debug: function( text ) {
		debugLog.push( text );
	},

	info: function( text ) {
		infoLog.push( text );
	},

	event: function( text, color ) {
		eventLog.push( text );
	},

	warn: function( text ) {
		warnLog.push( text );
	},

	error: function( text ) {
		errorLog.push( text );
	}
};

module.exports = log;