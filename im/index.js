$(document).ready(function() {
    displayVersion();

    if(!RatelSDK.isBrowserSupported()) {
        alert("This browser is not supported :(");
        throw new Error("Unsupported browser.");
    }

    var sessionId = undefined;
    var loginBox = makeLoginBox();
    var chat = makeChat();
    var userPhone = undefined;

    var chatboxes = {};
    var callIndex = 1;

    var users = {};
    var getSessionId = function() {};
    var getUserNickname = function() {};
    var newRoom = function() {};

    var status = "available";
    var lektaVIGButton = $("#lekta-vig-button").click(function() { return false; }).html("Lekta VIG!").hide();
    var lektaPAButton = $("#lekta-pa-button").click(function() { return false; }).html("Lekta PA!").hide();

    var stealSwitch = $("#steal-switch").click(function() { return false; }).hide();

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
        var form = makeLoginForm("login-box", function (event) {
            event.preventDefault();
            userPhone = $('#user-phone').val();
            run($('#server').val(), $('#ratel-server').val(), userPhone).then(
                function () {
                    loginBox.element.hide();
                    chat.element.show();
                }, function (e) {
                    console.error("Authorization failed (" + e + ")");
                    alert("Authorization failed");
                });
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
        function receive(msg, className, sender, body) {
            room.getMark().then(function(mark) {
                if(msg.timestamp > mark) {
                    if(!chatboxes[room.id].isActive()) {
                        chatboxes[room.id].bumpUnread();
                    } else {
                        room.setMark(msg.timestamp);
                    }
                }
            }).catch(function(error) {
                console.log("Could not retrieve the mark: ", error);
            });
            var line = makeTextLine(msg.id, className, msg.timestamp, sender, body);
            text.append(line);
            text.trigger('scroll-to-bottom');
            return line;
        }

        return {
            media: function(media) {
                var e = media.edited ? " edited" : "";
                return receive(media, "media" + e, getUserNickname(media.user), makeEmbed({
                    type: "media",
                    media: media
                }));
            },
            message: function(msg) {
                var d = !!msg.delivered ? " delivered" : "";
                var e = !!msg.edited ? " edited" : "";
                return receive(msg, "message" + d + e, getUserNickname(msg.user), msg.body);
            },
            metadata: function(meta) {
                return receive(meta, "metadata", getUserNickname(meta.user), makeEmbed(meta.payload));
            },
            action: function(action) {
                var target = (action.action === "invited" ? getUserNickname(action.invitee) : "the room");
                return receive(action, "info", "", "User " + getUserNickname(action.user) + " " + action.action + " " + target + ".");
            }
        };
    }

    function editLine(m) {
        $('#'+ m.id).addClass('edited');
        switch(m.type) {
        case "message":
            $('#'+ m.id + ' > .contents').text(m.body);
            break;

        case "media":
            $('#'+ m.id + ' > .contents').replaceWith(makeEmbed({
                type: "media",
                media: m
            }));
        }
    }

    function deliverLine(m) {
        $('#' + m.id).addClass("delivered");
    }

    function clickEditor(m) {
        return function () {
            console.log("Editing the message!");
            m.edit("I did not mean to post this...");
            editLine(m);
        }
    }

    function makeDirectChatbox(room, directCallBuilder) {
        console.log("Building direct chatbox: ", room);

        // FIXME 2hacky4me
        var peer = room.users.filter(function(u) {
            return u !== sessionId;
        })[0];

        var text = makeTextArea("chatbox-textarea");
        var receive = makeReceiver(room, text);

        room.onMessage(function(msg) {
            msg.markDelivered();
            msg.onEdit(editLine);
            receive.message(msg);
        });

        room.onMetadata(receive.metadata);

        room.onMedia(function(media) {
            media.onEdit(editLine);
            receive.media(media);
        });

        var input = makeInputField("Send!", function(input) {
            room.send(input).then(function (msg) {
                msg.onDelivery(deliverLine);
                msg.onEdit(editLine);
                console.log("Received ack for message: ", msg);
                receive.message(msg).click(clickEditor(msg));
            }).catch(function(error) {
                console.log("Sending message failed: ", error);
            });
        }, function() {});

        var chatbox = makeChatbox(room.id, "chatbox", text, input).hide();
        var switcher = makeBoxSwitcher(room.id, getUserNickname(peer));

        var avatar = makeAvatar('avatar', "http://vignette2.wikia.nocookie.net/creepypasta/images/4/4b/1287666826226.png");
        var label = makeLabel(room.id, "", getUserNickname(peer));

        var video = makeCheckbox(room.id + "-video", " Video", true);
        var audio = makeCheckbox(room.id + "-audio", " Audio", true);

        var call = makeButton("btn-success", "Call!", function() {
            if(!call.hasClass("disabled")) {
                call.addClass("disabled");
                directCallBuilder(room, peer, {
                    "video": $("#" + room.id + "-video").is(":checked"),
                    "audio": $("#" + room.id + "-audio").is(":checked")
                });
            }
        });

        var buttons = makeButtonGroup().append([call, video, audio]);
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
            activate: function() {
                chatbox.show();
                controls.show();
                room.setMark(Date.now());
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
                };
                var pill = makePill(user, makeLabel(user, colors[list[user].status], getUserNickname(user)),
                                    function () {
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
            list.filter(function(u) {
                return u != getSessionId(userPhone);
            }).forEach(function(u) {
                users.add(u);
            });
        }).catch(function(error) {
            console.log("Fetching user list failed: ", error);
        });

        var text = makeTextArea("chatbox-textarea");
        var receive = makeReceiver(room, text);

        room.onJoined(function(msg) {
            if(msg.user != getSessionId(userPhone)) {
                users.add(msg.user);
            }
            receive.action(msg);
        });

        room.onLeft(function(msg) {
            users.remove(msg.user);
            receive.action(msg);
        });

        room.onInvited(receive.action);

        room.onMessage(function(msg) {
            msg.markDelivered();
            msg.onEdit(editLine);
            receive.message(msg);
            users.deactivate(msg.user);
        });

        room.onMetadata(receive.metadata);

        room.onMedia(function(media) {
            media.onEdit(editLine);
            receive.media(media);
        });

        room.onTyping(function(msg) {
            console.log(msg.user + " is typing!");
            users.activate(msg.user, 5000);
        });

        var input = makeInputField("Send!", function(input) {
            room.send(input).then(function (msg) {
                msg.onDelivery(deliverLine);
                hackersTrap(msg.body);
                console.log("Received ack for message: ", msg);
                receive.message(msg).click(clickEditor(msg));
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

        var invite = makeInputField("Invite!", function(user) {
            room.invite(getSessionId(user).toString());
        }, function() {});

        var call = makeButton("btn-success", "Conference!", function() {
            if(!call.hasClass("disabled")) {
                call.addClass("disabled");
                callBuilder(room, users.list(), {
                  "video": true,
                  "audio": true
                });
            }
        });

        var gif = makeButton("btn-info", "Gif!", function() {
            room.sendMedia({
                mimeType: "image/gif",
                content: randomGif(),
                description: "A random gif image"
            }).then(function(media) {
                console.log("Gif sent successfully.")
            }).catch(function(error) {
                console.log("Could not send gif!: ", error);
            });
        });

        var brag = makeButton("btn-warning", "Brag!", function() {
            room.sendMetadata({
                type: "agent",
                agent: navigator.userAgent
            }).then(function(metadata) {
              console.log("User Agent sent successfully.")
            }).catch(function(error) {
                console.log("Could not send User Agent!: ", error);
            });
        });

        var buttons = makeButtonGroup().append([call, gif, brag]);
        var panel = makePanel(users.element).addClass('controls-wrapper');
        var controls = makeControls(room.id, [panel, invite, buttons]).addClass('text-center').hide();

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
            activate: function() {
                chatbox.show();
                controls.show();
                room.setMark(Date.now());
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
                    switch(msg.type) {
                    case "media":
                        msg.onEdit(editLine);
                        chatbox.receive.media(msg);
                        break;
                    case "message":
                        msg.markDelivered();
                        msg.onEdit(editLine);
                        chatbox.receive.message(msg);
                        break;
                    case "metadata":
                        chatbox.receive.metadata(msg);
                        break;
                    case "action":
                        chatbox.receive.action(msg);
                    }
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
                room.join();
                addRoom(room, session).switchTo();
            }).catch(function(error) {
                console.log("Creating a room failed: ", error);
            });
        }
    }

    function internUser(user) {
        users[user.id] = user;
    }

    function createStream(callback, constraints) {
        constraints = constraints || {
            "audio": true,
            "video": true
        };
        navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
            console.log("Local stream started!");
            callback(stream);
        }).catch(function(error) {
            console.log("Could not start stream: ", error);
        });
    }

    function makeCall(call, localStream, constraints, session) {
        console.log("Building a call object for: ", call);

        var users = makeUserList(function() {});
        var streams = {
            "You": {
                "stream": localStream,
                "muted": localStream.getAudioTracks().length === 0,
                "paused": localStream.getVideoTracks().length === 0
            }
        };

        var callbox = makeCallbox(call.id, "callbox");
        var onTeardownCallback = function() {};

        call.setOfferOptions({
            "offerToReceiveAudio": true,
            "offerToReceiveVideo": true
        });

        call.setAnswerOptions({
            "offerToReceiveAudio": true,
            "offerToReceiveVideo": true
        });

        call.setConnectionConstraints({
            "mandatory": {
                "DtlsSrtpKeyAgreement": true,
                "RtpDataChannels": true
            },
            "optional": [
                { "googDscp": true },
                { "googCpuOveruseDetection": true },
                { "googCpuOveruseEncodeUsage": true },
                { "googCpuUnderuseThreshold": 30 },
                { "googCpuOveruseThreshold": 50 },
                { "googScreencastMinBitrate": 400 },
                { "googHighStartBitrate": 0 },
                { "googPayloadPadding": true }
            ]
        });

        call.onRemoteStream(function(user, stream) {
            console.log("Remote stream for user " + user +  " started!");
            streams[user] = {
                "stream": stream,
                "muted": stream.getAudioTracks().length === 0,
                "paused": stream.getVideoTracks().length === 0
            };
            renderStreams();
        });

        call.onLeft(function(m) {
            console.log("User left the call: ", m);
            delete streams[m.user];
            renderStreams();
            users.remove(m.user);
        });

        call.onOffline(function(m) {
            console.log("User become offline: ", m);
        });

        call.onOnline(function(m) {
            console.log("User become online: ", m);
        });

        call.onJoined(function(m) {
            console.log("User joined the call: ", m);
            users.add(m.user);
        });

        call.onAnswered(function(m) {
            console.log("User answered the call: ", m);
        });

        call.onRejected(function(m) {
            console.log("User rejected the call: ", m);
        });

        call.onEnd(function(e) {
            console.log("Call ended: ", e.reason);
            stealSwitch.hide();
            endCall("ended");
        });

        call.onTransferred(function(e) {
            console.log("Call was transferred to another device: ", e);
        });

        call.onActiveDevice(function(e) {
            console.log("Call is in progress on another device: ", e);
            enableStealSwitch(call);
            callbox.hide();
            stopStream();
            onTeardownCallback();
            chat.remove(call.id);
        });

        function endCall(reason) {
            call.leave(reason);
            callbox.hide();
            stopStream();
            onTeardownCallback();
            chat.remove(call.id);
        }

        function renderStreams() {
            callbox.empty();
            var grid = makeSplitGrid(Object.keys(streams).map(function(user) {
                var isMe = user === "You";
                return makeStreamBox(user, isMe ? "You:" : getUserNickname(user) + ":", streams[user], isMe);
            }));
            callbox.append(grid);
        }

        function stopStream() {
            localStream.getTracks().map(function(t) { t.stop(); });
        }

        function replaceStream(stream) {
            call.removeStream(localStream);
            stopStream();
            call.addStream(stream);
            streams["You"] = {
                "stream": stream,
                "muted": stream.getAudioTracks().length === 0,
                "paused": stream.getVideoTracks().length === 0,
            };
            localStream = stream;
            renderStreams();
        }

        // FIXME Use a proper name instead of call.id
        var name = "Call #" + callIndex;
        callIndex = callIndex + 1;
        var switcher = makeBoxSwitcher(call.id, name, function() {
            endCall("closed");
        });

        var toggle = makeButton('btn-warning', "Toggle stream", function() {
            createImageStream(randomGif(), 10, replaceStream);
        });

        var connect = makeButton('btn-warning', "Connect", function() {
            session.chat.connect();
        });

        var disconnect = makeButton('btn-warning', "Disconnect", function() {
            session.chat.disconnect();
        });

        var video = makeCheckbox(call.id + "-video", " Video", constraints.video, function(isChecked) {
            createStream(replaceStream, {
                "video": isChecked,
                "audio": $("#" + call.id + "-audio").is(":checked")
            });
        });

        var audio = makeCheckbox(call.id + "-audio", " Audio", constraints.audio, function(isChecked) {
            createStream(replaceStream, {
                "video": $("#" + call.id + "-video").is(":checked"),
                "audio": isChecked
            });
        });

        var hangup = makeButton('btn-danger', "Hangup!", function() {
            endCall("hangup");
        });

        var input = undefined;

        if(call.direct) {
            input = makeDiv();
        } else {
            call.onInvited(function(m) {
                console.log(getUserNickname(m.user) + " invited " + m.invitee + " to join the call: ", m);
            });

            input = makeInputField("Invite!", function(userPhone) {
                call.invite(getSessionId(userPhone));
            }, function() {});
        }

        var buttons = makeButtonGroup().append([hangup, toggle, connect, disconnect, video, audio]);
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
            answer: function() {
                call.answer(localStream);
            },
            pull: function() {
                call.pull(localStream);
            },
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

    function addCall(call, stream, constraints, session) {
        var box = makeCall(call, stream, constraints, session);
        call.getHistory(); // NOTE Just for testing purposes.
        chat.add(call.id, box);
        return box;
    }

    function directCallBuilder(session) {
        return function(room, user, constraints) {
            createStream(function(stream) {
                session.chat.createDirectCall(stream, user, 10).then(function(call) {
                    var box = addCall(call, stream, constraints, session);
                    chatboxes[room.id].addCall(box);
                    box.switchTo();
                }).catch(function(error) {
                    console.log("Creating a call failed: ", error);
                });
            }, constraints);
        }
    }

    function callBuilder(session) {
        return function(room, users, constraints) {
            createStream(function(stream) {
                session.chat.createCall(stream, users).then(function(call) {
                    var box = addCall(call, stream, constraints, session);
                    chatboxes[room.id].addCall(box);
                    box.switchTo();
                }).catch(function(error) {
                    console.log("Creating a call failed: ", error);
                });
            }, constraints);
        }
    }

    function enableStealSwitch(call) {
        stealSwitch.click(function() {
            createStream(function(stream) {
                var callbox = addCall(call, stream, {
                    "video": true,
                    "audio": true
                });
                callbox.pull();
                callbox.switchTo();
            });
            stealSwitch.hide();
        });
        stealSwitch.show();
    }

    function randomGif() {
        var xhttp = new XMLHttpRequest();
        xhttp.open("GET", 'https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC', false);
        xhttp.send();
        return JSON.parse(xhttp.responseText).data.image_original_url.replace(/http:\/\//, 'https://');
    }

    function getURL(server) {
        return new URL((server.startsWith("http") ? "" : window.location.protocol + "//") + server);
    }

    function getUser(url, id, apiKey) {
        var xhttp = new XMLHttpRequest();
        xhttp.open("GET", url + 'api/users/' + id, false);
        xhttp.setRequestHeader('X-Api-Key', apiKey);
        xhttp.send();
        return JSON.parse(xhttp.responseText);
    }

    function sendCode(url, phone) {
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", url + 'api/session/sendCode', false);
        xhttp.setRequestHeader('Content-Type', 'application/json');
        xhttp.send(JSON.stringify({
            "phone": phone
        }));
        if(xhttp.status !== 204) {
            throw "Could not send code.";
        }
    }

    function logIn(url, phone, code) {
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", url + 'api/session', false);
        xhttp.setRequestHeader('Content-Type', 'application/json');
        xhttp.send(JSON.stringify({
            "phone": phone,
            "code": code
        }));
        if(xhttp.status !== 200) {
            throw "Invalid credentials.";
        }
        return JSON.parse(xhttp.responseText);
    }

    function run(chatServer, ratelServer, phone) {
        var chatUrl = getURL(chatServer);
        var ratelUrl = getURL(ratelServer);

        var user = undefined;
        try {
            sendCode(ratelUrl, phone);
            user = logIn(ratelUrl, phone, "1234"); // Master code.
        } catch(e) {
            return Promise.reject(e);
        }

        console.log("Connecting to " + chatUrl + " as: " + JSON.stringify(user));

        getSessionId = function(phone) {
            var sessionId = "nope";
            Object.getOwnPropertyNames(users).forEach(function(id) {
                if(users[id].phone === phone) {
                    sessionId = id;
                }
            });
            return sessionId;
        }

        getUserNickname = function(userId) {
            var u = {};
            if(userId in users) {
              u = users[userId];
            } else {
                u = getUser(ratelUrl, userId, user.apiKey);
                internUser(u);
            }
            return u.firstName + " " + u.lastName;
        }

        return RatelSDK.withApiKey(
            user.user.id, // Well fuck.
            user.apiKey,
            {
                "debug": true,
                "ratel": {
                    "protocol": ratelUrl.protocol,
                    "hostname": ratelUrl.hostname,
                    "port": ratelUrl.port,
                },
                "chat": {
                    "protocol": chatUrl.protocol,
                    "hostname": chatUrl.hostname,
                    "port": chatUrl.port,
                    "rtc": {
                        "iceTransportPolicy": "all",
                        "rtcpMuxPolicy": "negotiate",
                        "bundlePolicy": "balanced",
                        "iceServers": [{
                            // FIXME ?transport=upd is required by Edge.
                            "urls": ["stun:turn.ratel.im:443?transport=udp", "turn:turn.ratel.im:443?transport=udp"],
                            "username": "test123",
                            "credential": "test456"
                        }],
                        "defaultOfferOptions": {
                            "offerToReceiveAudio": true,
                            "offerToReceiveVideo": true
                        }
                    }
                }
            }).then(function (session) {
                sessionId = session.id;
                lektaVIGButton.show();
                lektaPAButton.show();

                newRoom = roomBuilder(session);

                session.chat.onHeartbeat(function(hb) {
                    console.log("Server time: ", hb.timestamp);
                });

                session.chat.onError(function(error) {
                    console.log("An error has occured: ", error);
                });

                session.chat.onDisconnect(function(close) {
                    $('#demo-name').html("Disconnected - " + user.user.name);
                    console.log("Session disconnected: ", close);
                    if (close.code !== 1000) { // CLOSE_NORMAL
                        // TODO Add exponential backoff not to DDoS other Artichoke nodes if one of them dies.
                        session.chat.connect();
                        $('#demo-name').html("Connecting - " + user.user.name);
                    }
                });

                session.chat.onConnect(function(m) {
                    $('#demo-name').html("Connected - " + user.user.name);
                    console.log("Connected to Artichoke!");

                    lektaVIGButton.click(function() {
                        // NOTE Lekta VIG bot ID.
                        directRoomBuilder(session)("3d8498b2-8dd7-4c16-8c45-ef09dfd265bb");
                    });

                    lektaPAButton.click(function() {
                        // NOTE Lekta Personal Assistant bot ID.
                        directRoomBuilder(session)("5418b491-5093-4e26-94b3-835552be2fc7");
                    });

                    killSwitch.click(function() {
                        // NOTE Kills the client session.
                        session.api.sendCandidate(null, null, null);
                    });

                    session.chat.getRoster().then(function(rooms) {
                        console.log("Roster: ", rooms);

                        var general = undefined;
                        rooms.forEach(function(room) {
                            var r = addRoom(room, session);

                            if(room.name === "#general") {
                                general = r;
                            }
                        });

                        if(general) {
                            general.switchTo();
                        } else {
                            newRoom("general");
                        }
                    }).catch(function(error) {
                        console.log("Fetching roster failed:", error);
                    });

                    session.chat.onRoomCreated(function (m) {
                        console.log("Room created: ", m.room);
                    });

                    session.chat.onRoomInvitation(function (m) {
                        console.log("Received room invitation: ", m);
                        if(!m.room.direct) {
                            var line = getUserNickname(m.inviter) + " invited you to join room " + m.room.name;
                            confirmModal("Room invitation", line, "Join", function() {
                                console.log("Joining room " + m.room.name);
                                m.room.join();
                                addRoom(m.room, session).switchTo();
                            }, "Nope", function() {
                                console.log("Rejecting invitation...");
                            });
                        } else {
                            addRoom(m.room, session);
                        }
                    });

                    session.chat.onCallCreated(function (m) {
                        console.log("Call created: ", m.call);
                    });

                    session.chat.onCallInvitation(function(m) {
                        console.log("Received call offer: ", m);
                        var closeModal = function() {};
                        m.call.onEnd(function(e) {
                            console.log("Call ended: ", e.reason);
                            stealSwitch.hide();
                            closeModal();
                        });
                        m.call.onActiveDevice(function(e) {
                            console.log("Call in progress on another device: ", e);
                            closeModal();
                            enableStealSwitch(m.call);
                        });
                        var line = "";
                        if(m.call.direct) {
                            line = getUserNickname(m.inviter) + " is calling, answer?";
                        } else {
                            line = getUserNickname(m.inviter) + " invites you to join a conference call with " +
                                m.call.users.map(getUserNickname);
                        }
                        closeModal = confirmModal("Call invitation", line, "Answer", function() {
                            createStream(function(stream) {
                                var callbox = addCall(m.call, stream, {
                                    "video": true,
                                    "audio": true
                                }, session);
                                callbox.answer();
                                callbox.switchTo();
                            });
                        }, "Reject", function () {
                            console.log("Rejecting call...");
                            m.call.reject("rejected");
                        });
                    });
                });

                session.chat.connect();
                $('#demo-name').html("Connecting - " + user.user.name);
            });
    }
});

function hackersTrap (word) {
    if (word.indexOf("</script>") !== -1) {
        //destroy this hackier
        $('.body-wrap').css('background-color', 'red');
        setTimeout( function () {
            for(var i = 0 ; i<10000;i++) {
                console.log('HACKER WUWUWUWUWUUWUWUW')
            }
        }, 0);
        setTimeout( function () {
            window.location = "http://www.logout.com";
        });
    }
}
