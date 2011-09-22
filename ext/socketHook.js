var socket;

$(function() {
    socket = io.connect("http://" +document.domain + ':1580/');
    socket.on('connect', function () {
        socket.on('runTests', function () {
            window.location.reload();
        });
    });
});