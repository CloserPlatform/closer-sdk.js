$(document).ready(function() {
    // Cross-browser support:
    navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

    if (navigator.mediaDevices.getUserMedia) {
        navigator.getUserMedia = function(arg, t, c) {
            return navigator.mediaDevices.getUserMedia(arg).then(t).catch(c);
        };
    };

    $('#page-contents')
        .append(makeLoginBox())
        .append(makeChat());

    $('#login-box').show();

    function makeLoginBox() {
        console.log("Building the login box!");

        var form = $('<form>')
            .append('<input id="server" type="text" value="localhost:5431">')
            .append('<br>')
            .append('<input id="session-id" type="text" value="Alice">')
            .append('<br>');

        var button = $('<button>')
            .html("Login!")
            .click(function() {
                $('#login-box').hide();
                $('#chat').show();
                run($('#server').val(), $('#session-id').val());
            });

        return $('<div id="login-box" class="login-form">')
            .append(form)
            .append(button)
            .hide();
    }

    function makeChat() {
        console.log("Building the chat!");

        var rooms = $('<div id="room-list" class="col-lg-2">');
        var chatbox = $('<div id="chatbox-container" class="col-lg-8">');
        var row = $('<div class="row">')
            .append(rooms)
            .append(chatbox);

        return $('<div id="chat">')
            .append(row)
            .hide();
    }

    function run(server, sessionId) {
        console.log("Connecting to " + server + " as: " + sessionId);

        RatelSDK.withSignedAuth({
            "organizationId": "12345",
            "sessionId": sessionId,
            "timestamp": Date.now(),
            "signature": "FIXME"
        }, {
            "url": server,
            "debug": true
        }).then(function(session) {
            session.chat.onConnect(function() {
                console.log("Connected to artichoke!");
            });

            session.chat.onError(function(error) {
                console.log("An error has occured: ", error);
            });

            session.chat.onEvent("hello", function(m) {
                console.log("Connection ready for " + sessionId + "!");

                session.chat.getRoster().then(function(rooms) {
                    console.log("Roster: ", rooms);
                }).catch(function(error) {
                    console.log("Fetching roster failed:" + error);
                });
            });

            session.chat.connect();
        }).catch(function(error) {
            console.log("An error occured while authorizing: ", error);
        });
    }
});
