$(document).ready(function() {
    displayVersion();
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

    var callIndex = 1;

    var newRoom = function() {};

    var status = "available";
    var statusSwitch = $("#status-switch").click(function() { return false; }).html("Status: " + status).hide();

    var killSwitch = $("#kill-switch").click(function() { return false; }).hide();
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
        var chat = makeChatContainer("chat", "room-list", "chatbox-container", "controls-container", function(name) {
            newRoom(name);
        }).hide();
        return {
            element: chat,
            add: function(id, chatbox) {
                chatboxes[id] = chatbox;
                $("#room-list").append(chatbox.switcher.element);
                $("#controls-container").append(chatbox.controls);
                $("#chatbox-container").append(chatbox.element);
            },
            remove: function(id) {
                chatboxes[id].remove();
                delete chatboxes[id];
            }
        };
    }

    function switchTo(id) {
        return function() {
            console.log("Switching to: " + id);

            Object.keys(chatboxes).forEach(function(id) {
                chatboxes[id].deactivate();
            });

            chatboxes[id].activate();
        };
    }

    function makeBoxSwitcher(id, name, onClose) {
        console.log("Building a switcher for: ", name);

        var unread = makeBadge();
        var switcher = makeSwitcher(id, [name, " ", unread], switchTo(id), onClose);

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
            }
        };
    }

    function makeReceiver(room, text) {
        return function(msg) {
            room.getMark().then(function(mark) {
                if(msg.timestamp > mark) {
                    if(!chatboxes[room.id].isActive()) {
                        chatboxes[room.id].bumpUnread();
                    } else {
                        room.mark(msg.timestamp);
                    }
                }
            }).catch(function(error) {
                console.log("Could not retrieve the mark: ", error);
            });

            var className = msg.delivered ? "delivered" : "";
            var line = makeTextLine(msg.id, className, msg.timestamp, " " + msg.sender + ": " + msg.body);
            text.append(line);
            text.trigger('scroll-to-bottom');
        }
    }

    function makeDirectChatbox(room, directCallBuilder) {
        console.log("Building direct chatbox: ", room);

        // FIXME 2hacky4me
        var peer = room.name.slice(3).split("-").filter(function(e) { return e !== sessionId; })[0]; // FIXME Don't use sessionId.
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

        var chatbox = makeChatbox(room.id, "chatbox", text, input).hide();
        var switcher = makeBoxSwitcher(room.id, peer);

        var avatar = makeAvatar('avatar', "http://vignette2.wikia.nocookie.net/creepypasta/images/4/4b/1287666826226.png");
        var label = makeLabel(room.id, "", peer);

        var call = makeButton("btn-success", "Call!", function() {
            if(!call.hasClass("disabled")) {
                call.addClass("disabled");
                directCallBuilder(room, peer);
            }
        });

        var buttons = makeButtonGroup().append(call);
        var panel = makePanel([avatar, makeLineBreak(), label]).addClass('controls-wrapper');
        var controls = makeControls(room.id, [panel, buttons]).addClass('text-center').hide();

        return {
            element: chatbox,
            switcher: switcher, // FIXME Remove this.
            controls: controls,
            switchTo: switchTo(room.id),
            isActive: function() {
                return switcher.isActive();
            },
            bumpUnread: function() {
                switcher.bumpUnread();
            },
            onStatus: function(user, status) {
                if(user === peer) {
                    switch(status) {
                    case "available":
                        call.removeClass("disabled");
                        break;
                    case "away":
                    case "unavailable":
                        call.addClass("disabled");
                    }
                }
            },
            activate: function() {
                chatbox.show();
                controls.show();
                room.mark(Date.now());
                switcher.resetUnread();
                switcher.activate();
            },
            deactivate: function() {
                chatbox.hide();
                controls.hide();
                switcher.deactivate();
            },
            receive: receive,
            addCall: function(callbox) {
                call.addClass("disabled");
                callbox.onTeardown(function() {
                    call.removeClass("disabled");
                    switchTo(room.id)();
                });
            },
            remove: function() {
                switcher.remove();
                chatbox.remove();
                controls.remove();
            }
        }
    }

    function makeUserList(onClick) {
        var list = {};
        var users = makePills("nav-stacked user-list");

        function render() {
            users.html("");
            Object.keys(list).forEach(function(user) {
                var colors = {
                    "available": "label label-success",
                    "unavailable": 'label label-default',
                    "away": 'label label-info'
                }
                var pill = makePill(user, makeLabel(user, colors[list[user].status], user), function() {
                    onClick(user);
                });
                if(list[user].isTyping) {
                    pill.addClass("active");
                }
                users.append(pill);
            });
        }

        function deactivate(user) {
            list[user].isTyping = false;
            render();
            if(list[user].timer) {
                window.clearTimeout(list[user].timer);
            }
        }

        return {
            element: users,
            list: function() {
                return Object.keys(list);
            },
            add: function(user) {
                list[user] = {
                    status: "available", // FIXME Actually check this somehow.
                    isTyping: false,
                    timer: null
                };
                render();
            },
            remove: function(user) {
                delete list[user];
                render();
            },
            deactivate: deactivate,
            activate: function(user, time) {
                list[user].isTyping = true;
                render();
                if(list[user].timer) {
                    window.clearTimeout(list[user].timer);
                }
                list[user].timer = window.setTimeout(function() {
                    deactivate(user);
                }, time);
            },
            setStatus: function(user, status) {
                list[user].status = status;
                render();
            }
        }
    }

    function makeGroupChatbox(room, directRoomBuilder, callBuilder) {
        console.log("Building group chatbox for room: ", room);

        var users = makeUserList(function(user) {
            directRoomBuilder(user);
        });

        room.getUsers().then(function(list) {
            list.users.filter(function(u) {
                return u != sessionId; // FIXME Don't use sessionId.
            }).forEach(function(u) {
                users.add(u);
            });
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
                    users.add(msg.originator);
                }
                break;
            case "left": users.remove(msg.originator); break;
            }
            receiveAction(msg);
        });

        var receive = makeReceiver(room, text);
        room.onMessage(function(msg) {
            receive(msg);
            users.deactivate(msg.sender);
        });

        room.onTyping(function(msg) {
            console.log(msg.user + " is typing!");
            users.activate(msg.user, 5000);
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

        var chatbox = makeChatbox(room.id, "chatbox", text, input).hide();
        var switcher = makeBoxSwitcher(room.id, room.name, function() {
            room.leave();
            chat.remove(room.id);
        });

        var call = makeButton("btn-success", "Conference!", function() {
            if(!call.hasClass("disabled")) {
                call.addClass("disabled");
                callBuilder(room, users.list());
            }
        });

        var buttons = makeButtonGroup().append(call);
        var panel = makePanel(users.element).addClass('controls-wrapper');
        var controls = makeControls(room.id, [panel, buttons]).addClass('text-center').hide();

        return {
            element: chatbox,
            switcher: switcher, // FIXME Remove this.
            controls: controls,
            switchTo: switchTo(room.id),
            isActive: function() {
                return switcher.isActive();
            },
            onStatus: function(user, status) {
                if(users.list().includes(user)) {
                    users.setStatus(user, status);
                }
            },
            bumpUnread: function() {
                switcher.bumpUnread();
            },
            activate: function() {
                chatbox.show();
                controls.show();
                room.mark(Date.now());
                switcher.resetUnread();
                switcher.activate();
            },
            deactivate: function() {
                chatbox.hide();
                controls.hide();
                switcher.deactivate();
            },
            addCall: function(callbox) {
                call.addClass("disabled");
                callbox.onTeardown(function() {
                    call.removeClass("disabled");
                    switchTo(room.id)();
                });
            },
            receive: receive,
            remove: function() {
                switcher.remove();
                chatbox.remove();
                controls.remove();
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
                chatbox = makeDirectChatbox(room, directCallBuilder(session));
            } else {
                chatbox = makeGroupChatbox(room, directRoomBuilder(session), callBuilder(session));
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
                addRoom(room, session).switchTo();
            }).catch(function(error) {
                console.log("Creating a direct room failed: ", error);
            });
        }
    }

    function roomBuilder(session) {
        return function(name) {
            session.chat.createRoom("#" + name).then(function(room) {
                addRoom(room, session).switchTo();
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

        var users = makeUserList(function() {});
        var streams = {
            "You": localStream
        };

        var callbox = makeCallbox(call.id, "callbox");
        var onTeardownCallback = function() {};

        call.addLocalStream(localStream);

        call.onRemoteStream(function(user, stream) {
            console.log("Remote stream for user " + user +  " started!");
            streams[user] = stream;
            renderStreams();
            users.add(user);
        });

        call.onLeft(function(m) {
            console.log("User left the call: ", m);
            delete streams[m.user];
            renderStreams();
            users.remove(m.user);

            if(call.direct && users.list().length === 0) {
                endCall("ended");
            }
        });

        call.onJoined(function(m) {
            console.log("User joined the call: ", m);
        });

        function endCall(reason) {
            call.leave(reason);
            stopStreams();
            onTeardownCallback();
            chat.remove(call.id);
        }

        function renderStreams() {
            callbox.empty();
            var grid = makeSplitGrid(Object.keys(streams).map(function(user) {
                return makeStreamBox(user, user + ":", streams[user], user === "You");
            }));
            callbox.append(grid);
        }

        function stopStreams() {
            callbox.hide();
            if(localStream.stop) localStream.stop();
            else localStream.getTracks().map(function(t) { t.stop(); });
        }

        // FIXME Use a proper name instead of call.id
        var name = "Call #" + callIndex;
        callIndex = callIndex + 1;
        var switcher = makeBoxSwitcher(call.id, name, function() {
            endCall("closed");
        });

        var hangup = makeButton('btn-danger', "Hangup!", function() {
            endCall("hangup");
        });

        var input = undefined;

        if(call.direct) {
            input = makeDiv();
        } else {
            call.onInvited(function(m) {
                console.log(m.sender + " invited " + m.user + " to join the call: ", m);
            });

            input = makeInputField("Invite!", function(user) {
                call.invite(user);
            }, function() {});
        }

        var buttons = makeButtonGroup().append(hangup);
        var panel = makePanel(users.element).addClass('controls-wrapper');
        var controls = makeControls(call.id, [panel, input, buttons]).addClass('text-center').hide();
        renderStreams();

        return {
            element: callbox,
            switcher: switcher, // FIXME Remove this.
            controls: controls,
            switchTo: switchTo(call.id),
            isActive: function() {
                return switcher.isActive();
            },
            onStatus: function(user, status) {
                if(users.list().includes(user)) {
                    users.setStatus(user, status);
                }
            },
            activate: function() {
                callbox.show();
                controls.show();
                switcher.activate();
            },
            deactivate: function() {
                callbox.hide();
                controls.hide();
                switcher.deactivate();
            },
            join: function() {
                call.join(localStream);
            },
            leave: endCall,
            onTeardown: function(callback) {
                onTeardownCallback = callback;
            },
            remove: function() {
                callbox.remove();
                controls.remove();
                switcher.remove();
            }
        }
    }

    function addCall(call, stream) {
        var box = makeCall(call, stream);
        chat.add(call.id, box);
        return box;
    }

    function directCallBuilder(session) {
        return function(room, user) {
            createStream(function(stream) {
                session.chat.createDirectCall(user).then(function(call) {
                    var box = addCall(call, stream);
                    chatboxes[room.id].addCall(box);
                    box.switchTo();
                }).catch(function(error) {
                    console.log("Creating a call failed: ", error);
                });
            });
        }
    }

    function callBuilder(session) {
        return function(room, users) {
            createStream(function(stream) {
                session.chat.createCall(users).then(function(call) {
                    var box = addCall(call, stream);
                    chatboxes[room.id].addCall(box);
                    box.switchTo();
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
            "rtc": {
                "iceTransportPolicy": "relay",
                "iceServers": [{
                    "urls": ["stun:turn.ratel.im:5349", "turn:turn.ratel.im:5349"],
                    "username": "test123",
                    "credential": "test456"
                }]
            },
            "url": server,
            "debug": true
        }).then(function(session) {
            $('#demo-name').html("Ratel IM - " + sessionId);
            statusSwitch.show();

            newRoom = roomBuilder(session);

            session.chat.onError(function(error) {
                console.log("An error has occured: ", error.reason);
                alert("Session disconnected!");
            });

            session.chat.onConnect(function(m) {
                console.log("Connected to Artichoke!");

                killSwitch.click(function() {
                    // NOTE Kills the client session.
                    session.chat.socket.leaveCall(null, null);
                });

                statusSwitch.click(function() {
                    statusSwitch.toggleClass(status === "available" ? "btn-success" : "btn-info");
                    status = status === "available" ? "away" : "available";
                    statusSwitch.toggleClass(status === "available" ? "btn-success" : "btn-info");
                    statusSwitch.html("Status: " + status);
                    session.chat.setStatus(status);
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

                session.chat.onStatusChange(function(m) {
                    console.log("User " + m.user + " is " + m.status + "!");
                    Object.keys(chatboxes).forEach(function(k) {
                        chatboxes[k].onStatus(m.user, m.status);
                    });
                });

                session.chat.onRoom(function (msg) {
                    addRoom(msg.room, session);
                });

                session.chat.onCall(function(m) {
                    console.log("Received call offer: ", m);
                    var line = "";
                    if(m.call.direct) {
                        line = m.sender + " is calling, answer?";
                    } else {
                        line = m.sender + " invites you to join a conference call with " + m.call.users.toString();
                    }
                    if(confirm(line)) {
                        createStream(function(stream) {
                            var callbox = addCall(m.call, stream);
                            callbox.join();
                            callbox.switchTo();
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
