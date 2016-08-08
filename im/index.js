$(document).ready(function() {
    // Cross-browser support:
    navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

    if (navigator.mediaDevices.getUserMedia) {
        navigator.getUserMedia = function(arg, t, c) {
            return navigator.mediaDevices.getUserMedia(arg).then(t).catch(c);
        };
    };

    var loginBox = makeLoginBox();
    var chat = makeChat();
    var switchers = {};

    $('#page-contents')
        .append(loginBox.element)
        .append(chat.element);

    loginBox.element.show();

    function makeLoginBox() {
        console.log("Building the login box!");
        var form = makeLoginForm("login-box", function() {
            loginBox.element.hide();
            chat.element.show();
            run($('#server').val(), $('#session-id').val());
        });
        return {
            element: form
        };
    }

    function makeChat() {
        console.log("Building the chat!");
        var chat = makeChatContainer("chat");
        return {
            element: chat
        };
    }

    function makeRoomSwitcher(room) {
        console.log("Building room switcher for room: ", room);

        var unread = makeBadge();

        var switcher = makeSwitcher(room.id, [room.name, " ", unread], function() {
            console.log("Switching to room: " + room.name);

            Object.keys(switchers).forEach(function(id) {
                switchers[id].deactivate();
            });
            var switcher = switchers[room.id];
            switcher.activate();
            switcher.markRoom();

            $('#chatbox-container .chatbox').hide();
            $('#chatbox-container #' + room.id).show();
        }, function() {
            $('#chatbox-container #' + room.id).remove();
            switchers[room.id].remove();
        });

        return {
            element: switcher,
            activate: function() {
                switcher.addClass("active");
            },
            deactivate: function() {
                switcher.removeClass("active");
            },
            markRoom: function() {
                room.mark(Date.now());
                unread.html("");
            },
            remove: function() {
                switcher.remove();
                room.leave();
            }
        };
    }

    function receive(room, msg) {
        if(msg.timestamp > (room.currMark || 0)) {
            if(!$('#room-list #' + room.id).hasClass("active")) {
                var unread = $('#room-list #' + room.id + " .badge");
                unread.html(1 + (parseInt(unread.html() || "0")));
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

        var userList = {};
        var users = $('<ul class="nav nav-pills chatbox-users">');
        var panel = $('<div class="panel">').append(users);

        function renderUsers(list) {
            users.html("");
            Object.keys(list).forEach(function(user) {
                var pill = $('<li class="' + user +'">').append($('<a href="#">').html(user));
                users.append(pill);
            });
        }

        function addUser(user) {
            userList[user] = user;
        }

        function removeUser(user) {
            delete userList[user];
        }

        room.getUsers().then(function(list) {
            list.users.forEach(addUser);
            renderUsers(userList);
        }).catch(function(error) {
            console.log("Fetching user list failed: ", error);
        });

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

        room.onAction(function(action) {
            switch(action.action) {
            case "joined": addUser(action.originator); break;
            case "left": removeUser(action.originator); break;
            }
            renderUsers(userList);
            receiveAction(action);
        });
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
            .append(panel)
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

                    var switcher = makeRoomSwitcher(room);
                    switchers[room.id] = switcher;
                    $("#room-list").append(switcher.element);
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

                    // FIXME Add room management buttons instead of this.
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
                        session.chat.getRoom(msg.room).then(addRoom).catch(function(error) {
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
