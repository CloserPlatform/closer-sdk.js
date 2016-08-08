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
    var chatboxes = {};

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

            Object.keys(chatboxes).forEach(function(id) {
                chatboxes[id].element.hide();
            });
            chatboxes[room.id].element.show();
        }, function() {
            chatboxes[room.id].remove();
            switchers[room.id].remove();
        });

        return {
            element: switcher,
            isActive: function() {
                return switcher.hasClass("active");
            },
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
            bumpUnread: function() {
                unread.html(1 + (parseInt(unread.html() || "0")));
            },
            remove: function() {
                switcher.remove();
                room.leave();
            }
        };
    }

    function makeRoomChatbox(room) {
        console.log("Building chatbox for room: ", room);

        var userList = {};
        var users = makePills("chatbox-users");
        var panel = makePanel().append(users);

        function renderUsers(list) {
            users.html("");
            Object.keys(list).forEach(function(user) {
                var pill = makePill(user, user);
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

        var text = makeTextArea("chatbox-textarea");

        function receiveAction(action) {
            var s = action.subject || "the room";
            var line = " User " + action.originator + " " + action.action + " " + s + ".";
            text.append(makeTextLine("", "info", action.timestamp, line));
            text.trigger('scroll-to-bottom');
        }

        function receive(msg) {
            if(msg.timestamp > (room.currMark || 0)) {
                if(!switchers[room.id].isActive()) {
                    switchers[room.id].bumpUnread();
                } else {
                    room.mark(msg.timestamp);
                }
            }

            var line = makeTextLine(msg.id, "", msg.timestamp, " " + msg.sender + ": " + msg.body);
            text.append(line);
            text.trigger('scroll-to-bottom');
        }

        room.onAction(function(action) {
            switch(action.action) {
            case "joined": addUser(action.originator); break;
            case "left": removeUser(action.originator); break;
            }
            renderUsers(userList);
            receiveAction(action);
        });
        room.onMessage(receive);

        var input = makeInputField("Send!", function(input) {
            room.send(input).then(function (ack) {
                console.log("Received ack for message: ", ack);
                receive(ack.message);
            }).catch(function(error) {
                console.log("Sending message failed: ", error);
            });
        });

        var chatbox = makeChatbox(room.id, "chatbox", panel, text, input).hide();

        return {
            element: chatbox,
            receive: receive,
            remove: function() {
                chatbox.remove();
            }
        }
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

                    var chatbox = makeRoomChatbox(room);
                    chatboxes[room.id] = chatbox;
                    $("#chatbox-container").append(chatbox.element);

                    room.getHistory().then(function(msgs) {
                        msgs.forEach(function(msg) {
                            chatbox.receive(msg);
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
