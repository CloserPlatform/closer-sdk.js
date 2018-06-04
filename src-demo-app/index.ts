import * as RatelSDK from '../src/main';
import { CallReason } from '../src/main';
import { roomEvents } from '../src/main';
import { displayVersion } from './version';
import * as View from './view';

$(function () {
    displayVersion();

    if (!RatelSDK.isBrowserSupported()) {
        alert("This browser is not supported :(");
        throw new Error("Unsupported browser.");
    }

    const loginBox = makeLoginBox();
    const chat = makeChat();

    let sessionId = undefined;
    let userPhone = undefined;

    let chatboxes = {};
    let callIndex = 1;

    const users = {};
    let getSessionId = function (arg: string) {
        return undefined;
    };
    let getUserNickname = function (arg: string) {
        return undefined;
    };
    let newRoom = function (arg) {
        return undefined;
    };

    let status = "available";
    let lektaVIGButton = $("#lekta-vig-button").click(function () {
        return false;
    }).html("Lekta VIG!").hide();
    let lektaPAButton = $("#lekta-pa-button").click(function () {
        return false;
    }).html("Lekta PA!").hide();
    let lektaMMButton = $("#lekta-mm-button").click(function () {
        return false;
    }).html("Lekta MM!").hide();

    let stealSwitch = $("#steal-switch").click(function () {
        return false;
    }).hide();

    let killSwitch = $("#kill-switch").click(function () {
        return false;
    }).hide();
    $("#demo-name").click(function () {
        killSwitch.show();
    });

    $("#page-contents")
        .append(loginBox.element)
        .append(chat.element);

    loginBox.element.show();

    function makeLoginBox() {
        console.log("Building the login box!");
        let form = View.makeLoginForm("login-box", function (event) {
            event.preventDefault();
            userPhone = $("#user-phone").val();
            run($("#server").val(), $("#ratel-server").val(), userPhone).then(
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
        let chatContainer =
            View.makeChatContainer("chat", "room-list", "chatbox-container", "controls-container", function (name) {
            newRoom(name);
        }).hide();
        return {
            element: chatContainer,
            add(id, chatbox) {
                chatboxes[id] = chatbox;
                $("#room-list").append(chatbox.switcher.element);
                $("#controls-container").append(chatbox.controls);
                $("#chatbox-container").append(chatbox.element);
            },
            remove(id) {
                chatboxes[id].remove();
                delete chatboxes[id];
            }
        };
    }

    function switchTo(id) {
        return function () {
            console.log("Switching to: " + id);

            Object.keys(chatboxes).forEach(function (_id) {
                chatboxes[_id].deactivate();
            });

            chatboxes[id].activate();
        };
    }

    function makeBoxSwitcher(id, name, onClose?: any) {
        console.log("Building a switcher for: ", name);

        let unread = View.makeBadge();
        let switcher = View.makeSwitcher(id, [name, " ", unread], switchTo(id), onClose);

        return {
            element: switcher,
            isActive() {
                return switcher.hasClass("active");
            },
            activate() {
                switcher.addClass("active");
            },
            deactivate() {
                switcher.removeClass("active");
            },
            resetUnread() {
                unread.html("");
            },
            bumpUnread() {
                unread.html(String(1 + (parseInt(unread.html() || "0"))));
            },
            remove() {
                switcher.remove();
            }
        };
    }

    function makeReceiver(room, text) {
        function receive(msg, className, sender, body) {
            room.getMark().then(function (mark) {
                if (msg.p > mark) {
                    if (!chatboxes[room.id].isActive()) {
                        chatboxes[room.id].bumpUnread();
                    } else {
                        room.setMark(msg.timestamp);
                    }
                }
            }).catch(function (error) {
                console.log("Could not retrieve the mark: ", error);
            });
            let line = View.makeTextLine(msg.id, className, msg.timestamp, sender, body);
            text.append(line);
            text.trigger("scroll-to-bottom");
            return line;
        }

        return {
            line() {
                let line = $("<p>").append("-----");
                text.append(line);
                text.trigger("scroll-to-bottom");
                return line;
            },
            media(media) {
                let e = media.edited ? " edited" : "";
                return receive(media, "media" + e, getUserNickname(media.user), View.makeEmbed(media));
            },
            message(msg) {
                let d = !!msg.delivered ? " delivered" : "";
                let e = !!msg.edited ? " edited" : "";
                return receive(msg, "message" + d + e, getUserNickname(msg.user), msg.message);
            },
            metadata(meta) {
                return receive(meta, "metadata", getUserNickname(meta.user), View.makeEmbed(meta));
            },
            action(action) {
                const target = (action.tag === roomEvents.Invited.tag ?
                  getUserNickname(action.context.invitee) : "the room");

              const tags = {
                    [roomEvents.Joined.tag]: "joined",
                    [roomEvents.Left.tag]: "left",
                    [roomEvents.Invited.tag]: "invited",
                };
                return receive(action, "info", "", "User " + getUserNickname(action.user) + " " + tags[action.tag] +
                    " " + target + ".");
            },
            unknown(msg) {
                return receive(msg, "message", getUserNickname(msg.user), "UNKNOWN MESSAGE: " + msg.tag + " - " +
                    msg.body + " - " + JSON.stringify(msg));
            }
        };
    }

    function editLine(m) {
        $("#" + m.id).addClass("edited");
        switch (m.type) {
            case "message":
                $("#" + m.id + " > .contents").text(m.body);
                break;

            case "media":
                $("#" + m.id + " > .contents").replaceWith(View.makeEmbed({
                    type: "media",
                    media: m
                }));
                break;
            default:
                console.warn("Unrecognized type");
        }
    }

    function deliverLine(m) {
        $("#" + m.id).addClass("delivered");
    }

    function clickEditor(m) {
        return function () {
            console.log("Editing the message!");
            m.edit("I did not mean to post this...");
            editLine(m);
        };
    }

    function makeDirectChatbox(room, directCallBuilderFn) {
        console.log("Building direct chatbox: ", room);

        // FIXME 2hacky4me
        let peer = room.users.filter(function (u) {
            return u !== sessionId;
        })[0];

        let text = View.makeTextArea("chatbox-textarea");
        let receive = makeReceiver(room, text);

        room.onCustom("MEDIA", receive.media);
        room.onCustom("AGENT", receive.metadata);

        room.onMessage(function (msg) {
            // msg.markDelivered();
            // msg.onEdit(editLine);
            receive.message(msg);
        });

        let input = View.makeInputField("Send!", function (_input) {
            room.send(_input).then(function (msg) {
                msg.onDelivery(deliverLine);
                // msg.onEdit(editLine);
                console.log("Received ack for message: ", msg);
            }).catch(function (error) {
                console.log("Sending message failed: ", error);
            });
        }, function () {
            return undefined;
        });

        let chatbox = View.makeChatbox(room.id, "chatbox", text, input).hide();
        let switcher = makeBoxSwitcher(room.id, getUserNickname(peer));

        let avatar = View.makeAvatar("avatar",
            "http://vignette2.wikia.nocookie.net/creepypasta/images/4/4b/1287666826226.png");
        let label = View.makeLabel(room.id, "", getUserNickname(peer));

        let video = View.makeCheckbox(room.id + "-video", " Video", true);
        let audio = View.makeCheckbox(room.id + "-audio", " Audio", true);

        let call = View.makeButton("btn-success", "Call!", function () {
            if (!call.hasClass("disabled")) {
                call.addClass("disabled");
                directCallBuilderFn(room, peer, {
                    "video": $("#" + room.id + "-video").is(":checked"),
                    "audio": $("#" + room.id + "-audio").is(":checked")
                });
            }
        });

        let buttons = View.makeButtonGroup().append([call, video, audio]);
        let panel = View.makePanel([avatar, View.makeLineBreak(), label])
            .addClass("controls-wrapper");
        let controls = View.makeControls(room.id, [panel, buttons]).addClass("text-center").hide();

        return {
            element: chatbox,
            switcher, // FIXME Remove this.
            controls,
            switchTo: switchTo(room.id),
            isActive() {
                return switcher.isActive();
            },
            bumpUnread() {
                switcher.bumpUnread();
            },
            activate() {
                chatbox.show();
                controls.show();
                room.setMark(Date.now());
                switcher.resetUnread();
                switcher.activate();
            },
            deactivate() {
                chatbox.hide();
                controls.hide();
                switcher.deactivate();
            },
            receive,
            addCall(callbox) {
                call.addClass("disabled");
                callbox.onTeardown(function () {
                    call.removeClass("disabled");
                    switchTo(room.id)();
                });
            },
            remove() {
                switcher.remove();
                chatbox.remove();
                controls.remove();
            }
        };
    }

    function makeUserList(onClick) {
        let list = {};
        let usersEl = View.makePills("nav-stacked user-list");

        function render() {
            usersEl.html("");
            Object.keys(list).forEach(function (user) {
                let colors = {
                    "available": "label label-success",
                    "unavailable": "label label-default",
                    "away": "label label-info"
                };
                let pill = View.makePill(user, View.makeLabel(user, colors[list[user].status], getUserNickname(user)),
                    function () {
                        onClick(user);
                    });
                if (list[user].isTyping) {
                    pill.addClass("active");
                }
                usersEl.append(pill);
            });
        }

        function deactivate(user) {
            list[user].isTyping = false;
            render();
            if (list[user].timer) {
                window.clearTimeout(list[user].timer);
            }
        }

        return {
            element: users,
            list() {
                return Object.keys(list);
            },
            add(user) {
                list[user] = {
                    status: "available", // FIXME Actually check this somehow.
                    isTyping: false,
                    timer: undefined
                };
                render();
            },
            remove(user) {
                delete list[user];
                render();
            },
            deactivate,
            activate(user, time) {
                list[user].isTyping = true;
                render();
                if (list[user].timer) {
                    window.clearTimeout(list[user].timer);
                }
                list[user].timer = window.setTimeout(function () {
                    deactivate(user);
                }, time);
            },
            setStatus(user, _status) {
                list[user].status = _status;
                render();
            }
        };
    }

    function makeGroupChatbox(room, directRoomBuilderFn, callBuilderFn) {
        console.log("Building group chatbox for room: ", room);

        let _users = makeUserList(function (user) {
            directRoomBuilderFn(user);
        });

        room.getUsers().then(function (list) {
            list.filter(function (u) {
                return u !== getSessionId(userPhone);
            }).forEach(function (u) {
                _users.add(u);
            });
        }).catch(function (error) {
            console.log("Fetching user list failed: ", error);
        });

        let text = View.makeTextArea("chatbox-textarea");
        let receive = makeReceiver(room, text);

        room.onJoined(function (msg) {
            if (msg.user !== getSessionId(userPhone)) {
                _users.add(msg.user);
            }
            receive.action(msg);
        });

        room.onLeft(function (msg) {
            _users.remove(msg.user);
            receive.action(msg);
        });

        room.onInvited(receive.action);

        room.onMessage(function (msg) {
            // msg.markDelivered();
            // msg.onEdit(editLine);
            receive.message(msg);
            _users.deactivate(msg.user);
        });

        room.onCustom("MEDIA", receive.media);
        room.onCustom("AGENT", receive.metadata);

        room.onTyping(function (msg) {
            console.log(msg.user + " is typing!");
            _users.activate(msg.user, 5000);
        });

        let input = View.makeInputField("Send!", function (_input) {
            room.send(_input).then(function (msg) {
                msg.onDelivery(deliverLine);
                hackersTrap(msg.body);
                console.log("Received ack for message: ", msg);
            }).catch(function (error) {
                console.log("Sending message failed: ", error);
            });
        }, function (_input) {
            if ([3, 8, 27, 64, 125, 216, 343].includes(_input.length)) {
                console.log("Indicating that user is typing.");
                room.indicateTyping();
            }
        });

        let chatbox = View.makeChatbox(room.id, "chatbox", text, input).hide();
        let switcher = makeBoxSwitcher(room.id, room.name, function () {
            room.leave();
            chat.remove(room.id);
        });

        let invite = View.makeInputField("Invite!", function (user) {
            room.invite(getSessionId(user).toString());
        }, function () {
            return undefined;
        });

        let call = View.makeButton("btn-success", "Conference!", function () {
            if (!call.hasClass("disabled")) {
                call.addClass("disabled");
                callBuilderFn(room, _users.list(), {
                    "video": true,
                    "audio": true
                });
            }
        });

        let gif = View.makeButton("btn-info", "Gif!", function () {
            room.sendCustom("", "MEDIA", {
                mimeType: "image/gif",
                content: randomGif(),
                description: "A random gif image"
            }).then(function (media) {
                console.log("Gif sent successfully.");
            }).catch(function (error) {
                console.log("Could not send gif!: ", error);
            });
        });

        let brag = View.makeButton("btn-warning", "Brag!", function () {
            room.sendCustom("", "AGENT", {
                agent: navigator.userAgent
            }).then(function (metadata) {
                console.log("User Agent sent successfully.");
            }).catch(function (error) {
                console.log("Could not send User Agent!: ", error);
            });
        });

        let buttons = View.makeButtonGroup().append([call, gif, brag]);
        let panel = View.makePanel(_users.element).addClass("controls-wrapper");
        let controls = View.makeControls(room.id, [panel, invite, buttons]).addClass("text-center").hide();

        return {
            element: chatbox,
            switcher, // FIXME Remove this.
            controls,
            switchTo: switchTo(room.id),
            isActive() {
                return switcher.isActive();
            },
            bumpUnread() {
                switcher.bumpUnread();
            },
            activate() {
                chatbox.show();
                controls.show();
                room.setMark(Date.now());
                switcher.resetUnread();
                switcher.activate();
            },
            deactivate() {
                chatbox.hide();
                controls.hide();
                switcher.deactivate();
            },
            addCall(callbox) {
                call.addClass("disabled");
                callbox.onTeardown(function () {
                    call.removeClass("disabled");
                    switchTo(room.id)();
                });
            },
            receive,
            remove() {
                switcher.remove();
                chatbox.remove();
                controls.remove();
            }
        };
    }

    function addRoom(room, session) {
        function doReceive(msg, chatbox) {
            switch (msg.tag) {
                case roomEvents.MessageSent.tag:
                    room.setMark(msg.timestamp);
                    // msg.onEdit(editLine);
                    chatbox.receive.message(msg);
                    break;
                case "MEDIA":
                    chatbox.receive.media(msg);
                    break;
                case roomEvents.CustomMessageSent.tag:
                    chatbox.receive.metadata(msg);
                    break;
                case roomEvents.Joined.tag:
                case roomEvents.Left.tag:
                case roomEvents.Invited.tag:
                    chatbox.receive.action(msg);
                    break;
                default:
                    chatbox.receive.unknown(msg);
            }
        }
        if (room.id in chatboxes) {
            return chatboxes[room.id];
        } else {
            console.log("Adding room to the chat: ", room);

            let chatbox = undefined;

            if (room.direct) {
                chatbox = makeDirectChatbox(room, directCallBuilder(session));
            } else {
                chatbox = makeGroupChatbox(room, directRoomBuilder(session), callBuilder(session));
            }
            room.getMessages(0, 5).then(function (initial) {
                room.getLatestMessages(50).then(function (msgs) {
                    initial.items.forEach((it) => doReceive(it, chatbox));
                    chatbox.receive.line();
                    msgs.items.forEach((it) => doReceive(it, chatbox));
                }).catch(function (error) {
                    console.log("Fetching room history failed: ", error);
                });
            }).catch(function (error) {
                console.log("Fetching initial room history failed: ", error);
            });

            chat.add(room.id, chatbox);
            return chatbox;
        }
    }

    function directRoomBuilder(session) {
        return function (user) {
            session.chat.createDirectRoom(user).then(function (room) {
                addRoom(room, session).switchTo();
            }).catch(function (error) {
                console.log("Creating a direct room failed: ", error);
            });
        };
    }

    function roomBuilder(session: RatelSDK.Session) {
        return function (name) {
            session.chat.createRoom("#" + name).then(function (room) {
                room.join();
                addRoom(room, session).switchTo();
            }).catch(function (error) {
                console.log("Creating a room failed: ", error);
            });
        };
    }

    function internUser(user) {
        users[user.id] = user;
    }

    function createStream(callback: (stream: MediaStream) => void, constraints?: MediaStreamConstraints) {
        constraints = constraints || {
            "audio": true,
            "video": true
        };
        navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
            console.log("Local stream started!");
            callback(stream);
        }).catch(function (error) {
            console.error("Could not start stream: ", error);
        });
    }

    function makeCall(call: RatelSDK.DirectCall, localStream: MediaStream, constraints: MediaStreamConstraints,
                      session?: RatelSDK.Session) {
        console.log("Building a call object for: ", call);

        let usersEl = makeUserList(function () {
            return undefined;
        });
        let streams = {
            "You": {
                "stream": localStream,
                "muted": localStream.getAudioTracks().length === 0,
                "paused": localStream.getVideoTracks().length === 0
            }
        };

        let callbox = View.makeCallbox(call.id, "callbox", []);
        let onTeardownCallback = function () {
            return undefined;
        };

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
                {"googDscp": true},
                {"googCpuOveruseDetection": true},
                {"googCpuOveruseEncodeUsage": true},
                {"googCpuUnderuseThreshold": 30},
                {"googCpuOveruseThreshold": 50},
                {"googScreencastMinBitrate": 400},
                {"googHighStartBitrate": 0},
                {"googPayloadPadding": true}
            ]
        });

        call.onRemoteStream(function (user, stream) {
            console.log("Remote stream for user " + user + " started!");
            streams[user] = {
                "stream": stream,
                "muted": stream.getAudioTracks().length === 0,
                "paused": stream.getVideoTracks().length === 0
            };
            renderStreams();
        });

        call.onLeft(function (m) {
            console.log("User left the call: ", m);
            delete streams[m.authorId];
            renderStreams();
            usersEl.remove(m.authorId);
        });

        call.onOffline(function (m) {
            console.log("User become offline: ", m);
        });

        call.onOnline(function (m) {
            console.log("User become online: ", m);
        });

        call.onJoined(function (m) {
            console.log("User joined the call: ", m);
            usersEl.add(m.authorId);
        });

        call.onAnswered(function (m) {
            console.log("User answered the call: ", m);
        });

        call.onRejected(function (m) {
            console.log("User rejected the call: ", m);
        });

        call.onEnd(function (e) {
            console.log("Call ended: ", e.reason);
            stealSwitch.hide();
            endCall("ended");
        });

        call.onActiveDevice(function (e) {
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
            let grid = View.makeSplitGrid(Object.keys(streams).map(function (user) {
                let isMe = user === "You";
                return View.makeStreamBox(user, isMe ? "You:" : getUserNickname(user) + ":", streams[user], isMe);
            }));
            callbox.append(grid);
        }

        function stopStream() {
            localStream.getTracks().map(function (t) {
                t.stop();
            });
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
        let name = "Call #" + callIndex;
        callIndex = callIndex + 1;
        let switcher = makeBoxSwitcher(call.id, name, function () {
            endCall("closed");
        });

        let toggle = View.makeButton("btn-warning", "Toggle stream", function () {
            View.createImageStream(randomGif(), 10, replaceStream);
        });

        let connect = View.makeButton("btn-warning", "Connect", function () {
            session.chat.connect();
        });

        let disconnect = View.makeButton("btn-warning", "Disconnect", function () {
            session.chat.disconnect();
        });

        let video = View.makeCheckbox(call.id + "-video", " Video", constraints.video, function (isChecked) {
            createStream(replaceStream, {
                "video": isChecked,
                "audio": $("#" + call.id + "-audio").is(":checked")
            });
        });

        let audio = View.makeCheckbox(call.id + "-audio", " Audio", constraints.audio, function (isChecked) {
            createStream(replaceStream, {
                "video": $("#" + call.id + "-video").is(":checked"),
                "audio": isChecked
            });
        });

        let hangup = View.makeButton("btn-danger", "Hangup!", function () {
            endCall("hangup");
        });

        let input = undefined;

        if (call.direct) {
            input = View.makeDiv();
        } else {
            (call as RatelSDK.BusinessCall).onInvited(function (m) {
                console.log(getUserNickname(m.authorId) + " invited someone to join the call: ", m);
            });

            input = View.makeInputField("Invite!", function (_userPhone) {
                (call as RatelSDK.BusinessCall).invite(getSessionId(_userPhone));
            }, function () {
                return undefined;
            });
        }

        let buttons = View.makeButtonGroup().append([hangup, toggle, connect, disconnect, video, audio]);
        let panel = View.makePanel(usersEl.element).addClass("controls-wrapper");
        let controls = View.makeControls(call.id, [panel, input, buttons]).addClass("text-center").hide();
        renderStreams();

        return {
            element: callbox,
            switcher, // FIXME Remove this.
            controls,
            switchTo: switchTo(call.id),
            isActive() {
                return switcher.isActive();
            },
            activate() {
                callbox.show();
                controls.show();
                switcher.activate();
            },
            deactivate() {
                callbox.hide();
                controls.hide();
                switcher.deactivate();
            },
            answer() {
                call.answer(localStream);
            },
            pull() {
                call.pull(localStream);
            },
            onTeardown(callback) {
                onTeardownCallback = callback;
            },
            remove() {
                callbox.remove();
                controls.remove();
                switcher.remove();
            }
        };
    }

    function addCall(call: RatelSDK.DirectCall, stream, constraints?: MediaStreamConstraints,
                     session?: RatelSDK.Session) {
        let box = makeCall(call, stream, constraints, session);
        call.getMessages(); // NOTE Just for testing purposes.
        chat.add(call.id, box);
        return box;
    }

    function directCallBuilder(session) {
        return function (room, user, constraints) {
            createStream(function (stream) {
                session.chat.createDirectCall(stream, user, 10)
                    .then(function (call: RatelSDK.DirectCall) {
                    let box = addCall(call, stream, constraints, session);
                    chatboxes[room.id].addCall(box);
                    box.switchTo();
                }).catch(function (error) {
                    console.log("Creating a call failed: ", error);
                });
            }, constraints);
        };
    }

    function callBuilder(session) {
        return function (room, _users, constraints) {
            createStream(function (stream) {
                session.chat.createCall(stream, _users).then(function (call) {
                    let box = addCall(call, stream, constraints, session);
                    chatboxes[room.id].addCall(box);
                    box.switchTo();
                }).catch(function (error) {
                    console.log("Creating a call failed: ", error);
                });
            }, constraints);
        };
    }

    function enableStealSwitch(call) {
        stealSwitch.click(function () {
            createStream(function (stream) {
                let callbox = addCall(call, stream, {
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
        let xhttp = new XMLHttpRequest();
        xhttp.open("GET", "https://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC", false);
        xhttp.send();
        return JSON.parse(xhttp.responseText).data.image_original_url.replace(/http:\/\//, "https://");
    }

    function getURL(server) {
        return new URL((server.startsWith("http") ? "" : window.location.protocol + "//") + server);
    }

    function getUser(url, id, apiKey) {
        try {
            let xhttp = new XMLHttpRequest();
            xhttp.open("GET", url + "api/users/" + id, false);
            xhttp.setRequestHeader("X-Api-Key", apiKey);
            xhttp.overrideMimeType("text/plain");
            xhttp.send();
            return JSON.parse(xhttp.responseText);
        } catch (e) {
            return {
                id,
                firstName: "Unknown",
                lastName: "User",
                gender: "unknown",
                email: "unknown@user.hehe",
                phone: "+48123123123"
            };
        }
    }

    function sendCode(url, phone) {
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST", url + "api/session/sendCode", false);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(JSON.stringify({
            "phone": phone
        }));
        if (xhttp.status !== 204) {
            throw "Could not send code.";
        }
    }

    function logIn(url, phone, code) {
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST", url + "api/session", false);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(JSON.stringify({
            "phone": phone,
            "code": code
        }));
        if (xhttp.status !== 200) {
            throw "Invalid credentials.";
        }
        return JSON.parse(xhttp.responseText);
    }

    function run(chatServer, ratelServer, phone) {
        let chatUrl = getURL(chatServer);
        let ratelUrl = getURL(ratelServer);

        let user = undefined;
        try {
            // sendCode(ratelUrl, phone);
            user = logIn(ratelUrl, phone, "1234"); // Master code.
        } catch (e) {
            return Promise.reject(e);
        }

        console.log("Connecting to " + chatUrl + " as: " + JSON.stringify(user));

        getSessionId = function (_phone: string) {
            let _sessionId = "nope";
            Object.getOwnPropertyNames(users).forEach(function (id) {
                if (users[id].phone === _phone) {
                    _sessionId = id;
                }
            });
            return _sessionId;
        };

        getUserNickname = function (userId: string) {
            let u: any = {};
            if (userId in users) {
                u = users[userId];
            } else {
                u = getUser(ratelUrl, userId, user.apiKey);
                internUser(u);
            }
            return u.firstName + " " + u.lastName;
        };

        return RatelSDK.withApiKey(
            user.user.id, // Well fuck.
            user.apiKey,
            {
                "logLevel": 0, // FIXME "DEBUG",
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
            }).then(function (session: RatelSDK.Session) {
            sessionId = session.id;
            lektaVIGButton.show();
            lektaPAButton.show();
            lektaMMButton.show();

            newRoom = roomBuilder(session);

            session.chat.onHeartbeat(function (hb) {
                console.log("Server time: ", hb.timestamp);
            });

            session.chat.onError(function (error) {
                console.log("An error has occured: ", error);
            });

            session.chat.onDisconnect(function (close) {
                $("#demo-name").html("Disconnected - " + user.user.name);
                console.log("Session disconnected: ", close);
                if (close.code !== 1000) { // CLOSE_NORMAL
                    // TODO Add exponential backoff not to DDoS other Artichoke nodes if one of them dies.
                    session.chat.connect();
                    $("#demo-name").html("Connecting - " + user.user.name);
                }
            });

            session.chat.onServerUnreachable(function () {
                console.log("Server unreachable");
            });

            session.chat.onConnect(function (m) {
                $("#demo-name").html("Connected - " + user.user.name);
                console.log("Connected to Artichoke!");

                lektaVIGButton.click(function () {
                    // NOTE Lekta VIG bot ID.
                    directRoomBuilder(session)("3d8498b2-8dd7-4c16-8c45-ef09dfd265bb");
                });

                lektaPAButton.click(function () {
                    // NOTE Lekta Personal Assistant bot ID.
                    directRoomBuilder(session)("5418b491-5093-4e26-94b3-835552be2fc7");
                });

                lektaMMButton.click(function () {
                    // NOTE Lekta MeetMe bot ID.
                    directRoomBuilder(session)("16b5dd33-0516-4754-a217-495945b57f61");
                });

                killSwitch.click(function () {
                    // NOTE Kills the client session.
                    alert("Sorry, not implemented");
                });

                session.chat.getRoster().then(function (rooms) {
                    console.log("Roster: ", rooms);

                    let general = undefined;
                    rooms.forEach(function (room) {
                        let r = addRoom(room, session);

                        if (room.name === "#general") {
                            general = r;
                        }
                    });

                    if (general) {
                        general.switchTo();
                    } else {
                        newRoom("general");
                    }
                }).catch(function (error) {
                    console.log("Fetching roster failed:", error);
                });

                session.chat.onRoomCreated(function (_m) {
                    console.log("Room created: ", _m.roomId);
                });

                session.chat.onRoomInvitation(function (invitation) {
                    console.log("Received room invitation: ", invitation);
                    const line = getUserNickname(invitation.authorId) + " invited you to join room ";
                    View.confirmModal("Room invitation", line, "Join", function () {
                        console.log("Joining room ");
                        session.chat.getRoom(invitation.roomId).then((r: RatelSDK.BusinessRoom) => {
                          r.join();
                          addRoom(r, session).switchTo();
                        });
                    }, "Nope", function () {
                        console.log("Rejecting invitation...");
                    });
                });

                session.chat.onCallCreated(function (_m) {
                    console.log("Call created: ", _m.callId);
                });

                session.chat.onCallInvitation(function (callInvitation) {
                    console.log("Received call offer: ", callInvitation);
                    let closeModal = function () {
                        return undefined;
                    };
                    session.chat.getCall(callInvitation.callId)
                      .then((call) => {
                        call.onEnd(function (e) {
                          console.log("Call ended: ", e.reason);
                          stealSwitch.hide();
                          closeModal();
                        });
                        call.onActiveDevice(function (e) {
                          console.log("Call in progress on another device: ", e);
                          closeModal();
                          enableStealSwitch(call);
                        });

                        const line = getUserNickname(callInvitation.authorId) + " " +
                          "invites you to join a conference call with " +
                          call.users.map(getUserNickname);
                        closeModal = View.confirmModal("Call invitation", line, "Answer", function () {
                          createStream(function (stream) {
                            let callbox = addCall(call, stream, {
                              "video": true,
                              "audio": true
                            }, session);
                            callbox.answer();
                            callbox.switchTo();
                          });
                        }, "Reject", function () {
                          console.log("Rejecting call...");
                          call.reject(CallReason.CallRejected);
                        });
                      });
                });
            });

            session.chat.connect();
            $("#demo-name").html("Connecting - " + user.user.name);
        });
    }
});

function hackersTrap(word) {
    if (word.indexOf("</script>") !== -1) {
        // destroy this hackier
        $(".body-wrap").css("background-color", "red");
        setTimeout(function () {
            for (let i = 0; i < 10000; i++) {
                console.log("HACKER WUWUWUWUWUUWUWUW");
            }
        }, 0);
        setTimeout(function () {
            (window as any).location = "http://www.logout.com";
        });
    }
}
