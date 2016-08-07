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

        var list = $('<ul id="room-list" class="nav nav-pills nav-stacked">');
        var rooms = $('<div class="col-lg-2">').append(list);
        var chatbox = $('<div id="chatbox-container" class="col-lg-8">');
        var row = $('<div class="row">')
            .append(rooms)
            .append(chatbox);

        return $('<div id="chat">')
            .append(row)
            .hide();
    }

    function makeRoomSwitcher(room) {
        console.log("Building room switcher for room: ", room);

        var unread = $('<span class="badge">').html(room.unread);
        var name = $('<a href="#">')
            .append(room.name)
            .append(" ")
            .append(unread)
            .click(function() {
                console.log("Switching to room: " + room.name);

                $('#room-list .switcher').removeClass("active");
                $('#room-list #' + room.id).addClass("active");

                unread.html("");
                room.currMark = Date.now(); // FIXME Move this to the Room class.
                room.mark(room.currMark);

                $('#chatbox-container .chatbox').hide();
                $('#chatbox-container #' + room.id).show();
            })
            .dblclick(function() {
                room.leave();
                $('#chatbox-container #' + room.id).remove();
                $('#room-list #' + room.id).remove();
            });

        return $('<li class="switcher" id="' + room.id + '"><br>')
            .append(name);
    }

    function receive(room, msg) {
        if(msg.timestamp > room.currMark) {
            if(!$('#room-list #' + room.id).hasClass("active")) {
                var unread = $('#room-list #' + room.id + " .badge");
                unread.html(1 + parseInt(unread.html() || "0"));
            } else {
                room.mark(msg.timestamp);
            }
        }

        var line = $('<p id="' + msg.id + '">')
            .append(time(msg.timestamp))
            .append(" " + msg.sender + ": ")
            .append(msg.body);

        var text = $('#chatbox-container #' + room.id + ' .chatbox-textarea');
        text.append(line);
        var area = text.get()[0];
        text.scrollTop(area.scrollHeight - area.clientHeight);
    }

    function time(timestamp) {
        var date = new Date(timestamp);
        var minutes = "0" + date.getMinutes();
        var seconds = "0" + date.getSeconds();
        return date.getHours() + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    }

    function makeChatbox(room) {
        console.log("Building chatbox for room: ", room);

        var users = $('<ul class="nav nav-pills">');
        var text = $('<div class="chatbox-textarea">');

        function receiveAction(action) {
            var s = action.subject || "the room";
            var line = $('<p class="info">')
                .append(time(action.timestamp))
                .append(" User " + action.originator + " " + action.action + " " + s + ".");

            text.append(line);
            var area = text.get()[0];
            text.scrollTop(area.scrollHeight - area.clientHeight);
        }

        room.onAction(receiveAction);
        room.onMessage(function(msg) {
            receive(room, msg);
        });

        var field = $('<input type="text">');
        var send = $('<button>')
            .html("Send!")
            .click(function() {
                room.send(field.val()).then(function (ack) {
                    console.log("Received ack for message: ", ack);
                    receive(room, ack.message);
                    field.val("");
                }).catch(function(error) {
                    console.log("Sending message failed: ", error);
                });
            });

        var input = $('<div>')
            .append(field)
            .append(send);

        return $('<div class="chatbox" id="' + room.id + '">')
            .append(users)
            .append(text)
            .append(input)
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

                var roster = {};

                function addRoom(room) {
                    console.log("Adding room to the roster: ", room);

                    roster[room.id] = room;
                    room.currMark = 0; // FIXME Move this to the Room class.

                    $("#room-list").append(makeRoomSwitcher(room));
                    $("#chatbox-container").append(makeChatbox(room));

                    room.getHistory().then(function(msgs) {
                        msgs.forEach(function(msg) {
                            receive(room, msg);
                        });
                    }).catch(function(error) {
                        console.log("Fetching room history failed: ", error);
                    });
                }

                session.chat.getRoster().then(function(rooms) {
                    console.log("Roster: ", rooms);
                    rooms.forEach(addRoom);

                    session.chat.createRoom("#artichoke").then(function(room) {
                        room.join();
                        if(!(room.id in roster)) {
                            addRoom(room);
                        }
                    }).catch(function(error) {
                        console.log("Joining #artichoke failed: ", error);
                    });
                }).catch(function(error) {
                    console.log("Fetching roster failed:", error);
                });

                session.chat.onEvent("message", function (msg) {
                    if(!(msg.room in roster)) {
                        session.chat.getRoom(msg.room).then(function(room) {
                            addRoom(room);
                            receive(room, msg);
                        }).catch(function(error) {
                            console.log("Fetching room failed: ", error);
                        });
                    }
                });
            });

            session.chat.connect();
        }).catch(function(error) {
            console.log("An error occured while authorizing: ", error);
        });
    }
});
