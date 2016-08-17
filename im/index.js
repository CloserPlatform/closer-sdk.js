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
    var sessionId = undefined; // FIXME Get rid of it.
    var roster = {};
    var switchers = {};
    var chatboxes = {};
    var calls = {};

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
        var chat = makeChatContainer("chat", "room-list", "chatbox-container", function(room) {
            newRoom(room);
        });
        return {
            element: chat,
            add: function(room, switcher, chatbox) {
                roster[room.id] = room;
                switchers[room.id] = switcher;
                $("#room-list").append(switcher.element);
                chatboxes[room.id] = chatbox;
                $("#chatbox-container").append(chatbox.element);
            },
            remove: function(room) {
                room.leave();
                switchers[room.id].remove();
                delete switchers[room.id];
                chatboxes[room.id].remove();
                delete chatboxes[room.id];
            }
        };
    }

    function makeRoomSwitcher(room) {
        console.log("Building room switcher for room: ", room);

        var unread = makeBadge();
        var name = undefined;
        var onClose = undefined;

        if (room.direct) {
            name = room.name.slice(3).split("-").filter(function(e) { return e !== sessionId; })[0];
        } else {
            name = room.name;
            onClose = function() {
                chat.remove(room);
            }
        }

        var switcher = makeSwitcher(room.id, [name, " ", unread], switchTo, onClose);

        function switchTo() {
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
            markRoom: function() {
                room.mark(Date.now());
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
                if(!switchers[room.id].isActive()) {
                    switchers[room.id].bumpUnread();
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

        room.getUsers().then(function(list) {
            var peer = list.users.filter(function(u) {
                return u != sessionId;
            })[0];

            call = makeButton("btn-success", "Call!", function() {
                // FIXME Actually check this.
                // if(Object.keys(calls).length > 0) {
                //     alert("You are already calling someone!");
                // } else {
                if(!call.hasClass("disabled")) {
                    call.addClass("disabled");
                    hangup.removeClass("disabled");

                    onAddCall = function(c) {
                        c.offer();
                    }

                    callBuilder(room, peer);
                }
                // }
            });

            hangup = makeButton("btn-danger disabled", "Hangup!", function() {
                if(!hangup.hasClass("disabled")) {
                    calls[peer].hangup("hangup");
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
        room.onMessage(function(msg) {
            msg["delivered"] = Date.now(); // FIXME Do it properly...
            receive(msg);
        });

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
            addCall: function(c) {
                call.addClass("disabled");
                hangup.removeClass("disabled");
                callBox.append(c.element);

                onAddCall(c);
            },
            removeCall: function() {
                call.removeClass("disabled");
                hangup.addClass("disabled");
                callBox.html("");

                onAddCall = function() {};
            },
            remove: function() {
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
            deactivateUser(msg.originator);
            renderUsers(userList);
            receiveAction(msg);
        });

        var receive = makeReceiver(room, text);
        room.onMessage(function(msg) {
            msg["delivered"] = Date.now(); // FIXME Do it properly...
            receive(msg);
            deactivateUser(msg.sender);
        });

        room.onTyping(function(msg) {
            console.log(msg.user + " is typing!");
            activateUser(msg.user, 5000);
        });

        var input = makeInputField("Send!", function(input) {
            room.send(input).then(function (ack) {
                console.log("Received ack for message: ", ack);
                receive(ack.message);
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

        return {
            element: chatbox,
            receive: receive,
            remove: function() {
                chatbox.remove();
            }
        }
    }

    function addRoom(room, session) {
        if(!(room.id in chatboxes)) {
            console.log("Adding room to the chat: ", room);

            var chatbox = undefined;

            if(room.direct) {
                chatbox = makeDirectChatbox(room, callBuilder(session));
            } else {
                chatbox = makeRoomChatbox(room, directRoomBuilder(session));
            }
            chat.add(room, makeRoomSwitcher(room), chatbox);

            room.getHistory().then(function(msgs) {
                msgs.forEach(function(msg) {
                    // FIXME Do this in the SDK.
                    if(msg.sender != sessionId && !msg.delivered) {
                        room.artichoke.socket.setDelivered(msg.id);
                        msg.delivered = Date.now();
                    }
                    chatbox.receive(msg);
                });
            }).catch(function(error) {
                console.log("Fetching room history failed: ", error);
            });
        }
    }

    function directRoomBuilder(session) {
        return function(user) {
            session.chat.createDirectRoom(user).then(function(room) {
                addRoom(room, session);
                switchers[room.id].switchTo();
            }).catch(function(error) {
                console.log("Creating a direct room failed: ", error);
            });
        }
    }

    function roomBuilder(session) {
        return function(name) {
            session.chat.createRoom("#" + name).then(function(room) {
                addRoom(room, session);
                room.join();
                switchers[room.id].switchTo();
            }).catch(function(error) {
                console.log("Creating a room failed: ", error);
            });
        }
    }

    function makeCall(call, peer, onTeardown) {
        console.log("Building a call object for: ", call);

        var localStream = undefined;

        var localBox = makeStreamBox("local-stream").prop("muted", true);
        var remoteBox = makeStreamBox("remote-stream");
        var streams = makeSplitGrid([localBox, remoteBox]).hide();

        function createLocalStream(callback) {
            navigator.getUserMedia({
                "video": true,
                "audio": true
            }, function(stream) {
                console.log("Local stream started!");
                localStream = stream;
                localBox.prop('src', window.URL.createObjectURL(stream));
                streams.show();

                callback(stream);
            }, function(error) {
                console.log("Could not start stream: " + error);
            });
        }

        call.onRemoteStream(function(stream) {
            console.log("Remote stream started!");
            remoteBox.prop('src', window.URL.createObjectURL(stream));
            streams.show();
        });

        call.onHangup(function(m) {
            console.log("Received call hangup: ", m);
            alert("Call ended, reason: " + m.reason);
            stopStreams();
        });

        call.onAnswer(function(m) {
            console.log("Received call answer: ", m);
        });

        call.onOffer(function(m) {
            console.log("Received call offer: ", m);
            if(confirm(peer + " is calling, answer?")) {
                createLocalStream(function(stream) {
                    call.answer(m, stream);
                });
            } else {
                console.log("Rejecting call...");
                call.reject(m);
                stopStreams();
            }
        });

        function stopStreams() {
            streams.hide();
            if(localStream) {
                if(localStream.stop) localStream.stop();
                else localStream.getTracks().map(function(t) { t.stop(); });
                localStream = undefined;
            };
            onTeardown();
        }

        return {
            element: streams,
            offer: function() {
                createLocalStream(function(stream) {
                    call.offer(stream);
                });
            },
            hangup: function(reason) {
                call.hangup(reason);
                stopStreams();
            },
        }
    }

    function addCall(user, room, call) {
        var box = makeCall(call, user, function() {
            chatboxes[room.id].removeCall();
            delete calls[user];
        });
        calls[user] = box;
        chatboxes[room.id].addCall(box);
    }

    function callBuilder(session) {
        return function(room, user) {
            session.chat.createCall(user).then(function(call) {
                addCall(user, room, call);
                switchers[room.id].switchTo();
            }).catch(function(error) {
                console.log("Creating a call failed: ", error);
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

            session.chat.onConnect(function() {
                console.log("Connected to artichoke!");
            });

            session.chat.onError(function(error) {
                console.log("An error has occured: ", error);
            });

            session.chat.onEvent("hello", function(m) {
                killSwitch.click(function() {
                    // NOTE Kills the client session.
                    session.chat.socket.hangupCall(null, null);
                });

                console.log("Connection ready for " + sessionId + "!");

                session.chat.getRoster().then(function(rooms) {
                    console.log("Roster: ", rooms);
                    rooms.forEach(function(room) {
                        addRoom(room, session);
                    });

                    newRoom("general");
                }).catch(function(error) {
                    console.log("Fetching roster failed:", error);
                });

                session.chat.onEvent("message", function (msg) {
                    if(!(msg.room in roster)) {
                        session.chat.getRoom(msg.room).then(function(room) {
                            addRoom(room, session);
                        }).catch(function(error) {
                            console.log("Fetching room failed: ", error);
                        });
                    }
                });

                session.chat.onCall(function(m) {
                    session.chat.createDirectRoom(m.creator).then(function(room) {
                        addRoom(room, session);
                        addCall(m.creator, room, m.call);
                        switchers[room.id].switchTo();
                    }).catch(function(error) {
                        console.log("Creating direct room failed: ", error);
                    });
                });

                session.chat.onEvent("msg_delivered", function(m) {
                    $('#' + m.id).addClass("delivered"); // FIXME Do it properly.
                });
            });

            session.chat.connect();
        }).catch(function(error) {
            console.log("An error occured while authorizing: ", error);
        });
    }
});
