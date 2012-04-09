var socket, port;

$(function() {
	port = window.location.port
	socket = io.connect( "http://" + document.domain + ':' + port + '/' );
	socket.on('connect', function () {
		socket.on( 'refresh', function () {
			window.location.reload();
		} );
		socket.on( 'reconnecting', function() {
			alert( 'Lost connection to anvil, attempting to reconnect', 'warning' );
		} );
		socket.on( 'reconnect', function() {
			alert( 'Reconnection to anvil succeeded' );
		} );
		socket.on( 'reconnect_failed', function() {
			alert( 'Reconnected to anvil failed', 'error' );
		} );
		socket.on( 'connect_failed', function() {
			alert( 'Could not connect to anvil', 'error' );
		} );
		socket.on( 'disconnect', function() {
			alert( 'Anvil server has disconnected', 'error' );
		} );
	} );
} );