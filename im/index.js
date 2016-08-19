$(document).ready(function() {
    // Cross-browser support:
    navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

    if (navigator.mediaDevices.getUserMedia) {
        navigator.getUserMedia = function(arg, t, c) {
            return navigator.mediaDevices.getUserMedia(arg).then(t).catch(c);
        };
    }

    var loginBox = makeLoginBox();
    var chat = makeChat();
    var sessionId = undefined; // FIXME Get rid of it.
    var chatboxes = {};

    var newRoom = function() {};

    var killSwitch = $("#kill-switch").submit(function() { return false; }).hide();
    $('#demo-name').click(function() {
        killSwitch.show();
    });

    $('#page-contents')
        .append(loginBox.element)
        .append(chat.element);

    loginBox.element.show();

    function makeLoginBox() {
        console.log("Building the login box!");
        var form = makeLoginForm("login-box", function() {
            loginBox.element.hide();
            chat.element.show();
            sessionId = $('#session-id').val();
            run($('#server').val(), sessionId);
        });
        return {
            element: form
        };
    }

    function makeChat() {
        console.log("Building the chat!");
        var chat = makeChatContainer("chat", "room-list", "chatbox-container", function(name) {
            newRoom(name);
        });
        return {
            element: chat,
            add: function(id, chatbox) {
                chatboxes[id] = chatbox;
                $("#room-list").append(chatbox.switcher.element);
                $("#chatbox-container").append(chatbox.element);
            },
            remove: function(id) {
                chatboxes[id].remove();
                delete chatboxes[id];
            }
        };
    }

    function makeBoxSwitcher(id, name, onClose) {
        console.log("Building a switcher for: ", name);

        var unread = makeBadge();
        var switcher = makeSwitcher(id, [name, " ", unread], switchTo, onClose);

        function switchTo() {
            console.log("Switching to: " + name);

            Object.keys(chatboxes).forEach(function(id) {
                chatboxes[id].switcher.deactivate();
                chatboxes[id].element.hide();
            });

            chatboxes[id].switcher.activate();
            chatboxes[id].mark();
            chatboxes[id].element.show();
        }

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
            resetUnread: function() {
                unread.html("");
            },
            bumpUnread: function() {
                unread.html(1 + (parseInt(unread.html() || "0")));
            },
            remove: function() {
                switcher.remove();
            },
            switchTo: switchTo
        };
    }

    function makeReceiver(room, text) {
        return function(msg) {
            if(msg.timestamp > (room.currMark || 0)) {
                if(!chatboxes[room.id].switcher.isActive()) {
                    chatboxes[room.id].switcher.bumpUnread();
                } else {
                    room.mark(msg.timestamp);
                }
            }

            var className = msg.delivered ? "delivered" : "";
            var line = makeTextLine(msg.id, className, msg.timestamp, " " + msg.sender + ": " + msg.body);
            text.append(line);
            text.trigger('scroll-to-bottom');
        }
    }

    function makeDirectChatbox(room, callBuilder) {
        console.log("Building direct chatbox: ", room);

        var call = undefined;
        var hangup = undefined;

        var callBox = makeDiv();
        var panel = makePanel().append(callBox);

        var onAddCall = function() {};
        var onHangup = function () {};

        room.getUsers().then(function(list) {
            var peer = list.users.filter(function(u) {
                return u != sessionId;
            })[0];

            call = makeButton("btn-success", "Call!", function() {
                if(!call.hasClass("disabled")) {
                    call.addClass("disabled");
                    hangup.removeClass("disabled");

                    onAddCall = function(c) {
                        c.join();
                    }

                    callBuilder(room, peer);
                }
            });

            hangup = makeButton("btn-danger disabled", "Hangup!", function() {
                if(!hangup.hasClass("disabled")) {
                    onHangup();
                }
            });

            var row = makeButtonGroup()
                .append(call)
                .append(hangup);

            panel.append(row);
        }).catch(function(error) {
            console.log("Fetching user list failed: ", error);
        });

        var text = makeTextArea("chatbox-textarea");
        var receive = makeReceiver(room, text);
        room.onMessage(receive);

        var input = makeInputField("Send!", function(input) {
            room.send(input).then(function (msg) {
                msg.onDelivery(function(m) {
                    $('#' + m.id).addClass("delivered");
                });

                console.log("Received ack for message: ", msg);
                receive(msg);
            }).catch(function(error) {
                console.log("Sending message failed: ", error);
            });
        }, function() {});

        var chatbox = makeChatbox(room.id, "chatbox", panel, text, input).hide();

        var name = room.name.slice(3).split("-").filter(function(e) { return e !== sessionId; })[0]; // FIXME Don't use sessionId.
        var switcher = makeBoxSwitcher(room.id, name);

        return {
            switcher: switcher,
            element: chatbox,
            receive: receive,
            mark: function() {
                room.mark(Date.now());
                switcher.resetUnread();
            },
            addCall: function(c) {
                call.addClass("disabled");
                hangup.removeClass("disabled");

                c.onTeardown(function() {
                    call.removeClass("disabled");
                    hangup.addClass("disabled");
                    callBox.html("");

                    onAddCall = function() {};
                    onHangup = function() {};
                });

                onHangup = function() {
                    c.leave("hangup");
                }

                callBox.append(c.element);
                onAddCall(c);
            },
            remove: function() {
                switcher.remove();
                chatbox.remove();
            }
        }
    }

    function makeRoomChatbox(room, directRoomBuilder) {
        console.log("Building chatbox for room: ", room);

        var userList = {};
        var users = makePills("chatbox-users");
        var panel = makePanel().append(users);

        function renderUsers(list) {
            users.html("");
            Object.keys(list).forEach(function(user) {
                var pill = makePill(user, user, function() {
                    directRoomBuilder(user);
                });
                if(list[user].isTyping) {
                    pill.addClass("active");
                }
                users.append(pill);
            });
        }

        function addUser(user) {
            userList[user] = {
                isTyping: false,
                timer: null
            };
        }

        function removeUser(user) {
            delete userList[user];
        }

        function deactivateUser(user) {
            userList[user].isTyping = false;
            renderUsers(userList);
            if(userList[user].timer) {
                window.clearTimeout(userList[user].timer);
            }
        }

        function activateUser(user, time) {
            userList[user].isTyping = true;
            renderUsers(userList);
            if(userList[user].timer) {
                window.clearTimeout(userList[user].timer);
            }
            userList[user].timer = window.setTimeout(function() {
                deactivateUser(user);
            }, time);
        }

        room.getUsers().then(function(list) {
            list.users.filter(function(u) {
                return u != sessionId; // FIXME Don't use sessionId.
            }).forEach(addUser);
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

        room.onAction(function(msg) {
            switch(msg.action) {
            case "joined":
                if(msg.originator != sessionId) { // FIXME Don't use sessionId.
                    addUser(msg.originator);
                }
                break;
            case "left": removeUser(msg.originator); break;
            }
            renderUsers(userList);
            receiveAction(msg);
        });

        var receive = makeReceiver(room, text);
        room.onMessage(function(msg) {
            receive(msg);
            deactivateUser(msg.sender);
        });

        room.onTyping(function(msg) {
            console.log(msg.user + " is typing!");
            activateUser(msg.user, 5000);
        });

        var input = makeInputField("Send!", function(input) {
            room.send(input).then(function (msg) {
                msg.onDelivery(function(m) {
                    $('#' + m.id).addClass("delivered");
                });

                console.log("Received ack for message: ", msg);
                receive(msg);
            }).catch(function(error) {
                console.log("Sending message failed: ", error);
            });
        }, function(input) {
            if([3, 8, 27, 64, 125, 216, 343].includes(input.length)) {
                console.log("Indicating that user is typing.");
                room.indicateTyping();
            }
        });

        var chatbox = makeChatbox(room.id, "chatbox", panel, text, input).hide();
        var switcher = makeBoxSwitcher(room.id, room.name, function() {
            chat.remove(room.id);
        });

        return {
            switcher: switcher,
            element: chatbox,
            receive: receive,
            mark: function() {
                room.mark(Date.now());
                switcher.resetUnread();
            },
            remove: function() {
                room.leave();
                switcher.remove();
                chatbox.remove();
            }
        }
    }

    function addRoom(room, session) {
        if(room.id in chatboxes) {
            return chatboxes[room.id];
        } else {
            console.log("Adding room to the chat: ", room);

            var chatbox = undefined;

            if(room.direct) {
                chatbox = makeDirectChatbox(room, callBuilder(session));
            } else {
                chatbox = makeRoomChatbox(room, directRoomBuilder(session));
            }

            room.getHistory().then(function(msgs) {
                msgs.forEach(function(msg) {
                    chatbox.receive(msg);
                });
            }).catch(function(error) {
                console.log("Fetching room history failed: ", error);
            });

            chat.add(room.id, chatbox);
            return chatbox;
        }
    }

    function directRoomBuilder(session) {
        return function(user) {
            session.chat.createDirectRoom(user).then(function(room) {
                addRoom(room, session).switcher.switchTo();
            }).catch(function(error) {
                console.log("Creating a direct room failed: ", error);
            });
        }
    }

    function roomBuilder(session) {
        return function(name) {
            session.chat.createRoom("#" + name).then(function(room) {
                addRoom(room, session).switcher.switchTo();
                room.join();
            }).catch(function(error) {
                console.log("Creating a room failed: ", error);
            });
        }
    }

    function createStream(callback) {
        navigator.getUserMedia({
            "video": true,
            "audio": true
        }, function(stream) {
            console.log("Local stream started!");
            callback(stream);
        }, function(error) {
            console.log("Could not start stream: ", error);
        });
    }

    function makeCall(call, localStream) {
        console.log("Building a call object for: ", call);

        var onTeardownCallback = function() {};
        var localBox = makeStreamBox("local-stream")
            .prop("muted", true)
            .prop('src', window.URL.createObjectURL(localStream));
        var remoteBox = makeStreamBox("remote-stream");
        var streams = makeSplitGrid([localBox, remoteBox]);

        call.addLocalStream(localStream);

        call.onRemoteStream(function(user, stream) {
            console.log("Remote stream for user " + user +  " started!");
            remoteBox.prop('src', window.URL.createObjectURL(stream));
            streams.show();
        });

        call.onLeft(function(m) {
            console.log("User left the call: ", m);
            alert("Call ended, reason: " + m.reason);
            stopStreams();
            call.leave("ended");
        });

        call.onJoined(function(m) {
            console.log("User joined the call: ", m);
        });

        function stopStreams() {
            streams.hide();
            if(localStream) {
                if(localStream.stop) localStream.stop();
                else localStream.getTracks().map(function(t) { t.stop(); });
                localStream = undefined;
            };
            onTeardownCallback();
        }

        return {
            element: streams,
            join: function() {
                call.join(localStream);
            },
            leave: function(reason) {
                call.leave(reason);
                stopStreams();
            },
            onTeardown: function(callback) {
                onTeardownCallback = callback;
            }
        }
    }

    function addCall(call, stream) {
        return makeCall(call, stream);
    }

    function callBuilder(session) {
        return function(room, user) {
            createStream(function(stream) {
                session.chat.createCall([user]).then(function(call) {
                    var chatbox = chatboxes[room.id];
                    chatbox.addCall(addCall(call, stream));
                    chatbox.switcher.switchTo();
                }).catch(function(error) {
                    console.log("Creating a call failed: ", error);
                });
            });
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
            $('#demo-name').html(sessionId);

            newRoom = roomBuilder(session);

            session.chat.onError(function(error) {
                console.log("An error has occured: ", error);
            });

            session.chat.onConnect(function(m) {
                console.log("Connected to Artichoke!");

                killSwitch.click(function() {
                    // NOTE Kills the client session.
                    session.chat.socket.hangupCall(null, null);
                });

                session.chat.getRoster().then(function(rooms) {
                    console.log("Roster: ", rooms);
                    rooms.forEach(function(room) {
                        addRoom(room, session);
                    });

                    newRoom("general");
                }).catch(function(error) {
                    console.log("Fetching roster failed:", error);
                });

                session.chat.onRoom(function (msg) {
                    addRoom(msg.room, session);
                });

                session.chat.onCall(function(m) {
                    console.log("Received call offer: ", m);

                    if(confirm(m.user + " is calling, answer?")) {
                        createStream(function(stream) {
                            session.chat.createDirectRoom(m.user).then(function(room) {
                                var chatbox = addRoom(room, session);
                                var callbox = makeCall(m.call, stream);
                                callbox.join();
                                chatbox.addCall(callbox);
                                chatbox.switcher.switchTo();
                            }).catch(function(error) {
                                console.log("Creating direct room failed: ", error);
                            });
                        });
                    } else {
                        console.log("Rejecting call...");
                        m.call.reject(m);
                    }
                });
            });

            session.chat.connect();
        }).catch(function(error) {
            console.log("An error occured while authorizing: ", error);
        });
    }
});
