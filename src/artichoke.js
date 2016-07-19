function artichoke(config) {
    logDebug("config: " + JSON.stringify(config));

    // Cross-browser support:
    let RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

    // Messages:
    function Call(from, to, signal, payload) {
        return {
            "type": "call",
            "sender": from,
            "recipient": to,
            "signal": signal.toLowerCase(),
            "body": payload
        };
    };

    function ChatRequest(room, body) {
        return {
            "type": "msg_request",
            "room": room,
            "body": body
        };
    };

    function ChatDelivered(id, timestamp) {
        return {
            "type": "msg_delivered",
            "id": id,
            "timestamp": timestamp
        };
    };

    function RoomCreate(name) {
        return {
            "type": "room_create",
            "name": name
        };
    }

    function RoomJoin(room) {
        return {
            "type": "room_join",
            "room": room
        };
    };

    function RoomLeave(room) {
        return {
            "type": "room_leave",
            "room": room
        };
    };

    function RoomInvite(room, user) {
        return {
            "type": "room_invite",
            "room": room,
            "user": user
        };
    };

    function RosterAdd(user) {
        return {
            "type": "roster_add",
            "user": user
        };
    };

    function RosterRemove(user) {
        return {
            "type": "roster_remove",
            "user": user
        };
    };

    // Connection state:
    let userId = config.apiKey; // FIXME Actually get it.
    let pc = undefined;
    let s = undefined;

    let messageCallbacks = {};

    // API:
    let self = {
        connect: connect,

        call: {
            offer: offer,
            answer: answer,
            reject: (peer) => send(Call(userId, peer, "hangup", "rejected")),
            hangup: (peer, reason) => {
                pc = reconnectRTC(pc);
                send(Call(userId, peer, "hangup", reason));
            }
        },

        chat: (peer, body) => send(ChatRequest(peer, body)),

        room: {
            create: (name) => post("http://" + pathcat(config.url, "api", "room", "create"), RoomCreate(name)),
            join: (room) => send(RoomJoin(room)),
            leave: (room) => send(RoomLeave(room)),
            invite: (room, who) => send(RoomInvite(room, who))
        },

        roster: {
            add: (who) => send(RosterAdd(who)),
            remove: (who) => send(RosterRemove(who))
        },

        onConnect: function() {}, // NOTE By default do nothing.
        onError: (e) => console.log(e),
        onMessage: (type, callback) => {
            logDebug("Registered callback for message type: " + type);
            messageCallbacks[type] = callback;
        },

        onRemoteStream: function() {} // NOTE By default do nothing.
    };

    function connect() {
        let url = "ws://" + pathcat(config.url, "ws", config.apiKey);

        console.log("Connecting to " + url);
        s = new WebSocket(url);
        s.binaryType = "arraybuffer";

        s.onopen = () => {
            logDebug("Connected to " + url);
            self.onConnect();
        };

        s.onmessage = function(event) {
            logDebug("Received: " + event.data);
            let m = JSON.parse(event.data);

            switch(m.type) {
            case "call":
                let peer = m.sender;
                switch(m.signal) {
                case "answer":
                    pc.setRemoteDescription(new RTCSessionDescription({"type": "answer", "sdp": m.body}));
                    pc.onicecandidate = onICE(userId, peer);
                    break;

                case "hangup":
                    pc = reconnectRTC(pc);
                    break;

                case "candidate":
                    pc.addIceCandidate(new RTCIceCandidate({"candidate": m.body, "sdpMid": "", "sdpMLineIndex": 0}));
                    break;

                default: break;
                }
                runCallback(m);
                break;

            case "message":
                if(!m.delivered) send(ChatDelivered(m.id, Date.now()));
                runCallback(m);
                break;

            case "hello":
                runCallback(m);
                break;

            default:
                runCallback(m);
            }
        };

        pc = reconnectRTC();
    }

    function offer(peer, stream) {
        pc.addStream(stream);

        pc.createOffer((offer) => {
            pc.setLocalDescription(offer);
            send(Call(userId, peer, "offer", offer.sdp));
        }, logError);
    }

    function answer(peer, offer, stream) {
        pc.setRemoteDescription(new RTCSessionDescription({"type": "offer", "sdp": offer.body}));
        pc.onicecandidate = onICE(userId, peer);

        pc.addStream(stream);

        pc.createAnswer((answer) => {
            pc.setLocalDescription(answer);
            send(Call(userId, peer, "answer", answer.sdp));
        }, logError);
    }

    // Utils:
    function reconnectRTC(old_pc) {
        if(old_pc) old_pc.close();

        let pc = new RTCPeerConnection(config.rtc);

        let onstream = (event) => self.onRemoteStream(event.stream || event.streams[0]);

        if(pc.ontrack === null) pc.ontrack = onstream;
        else pc.onaddstream = onstream;

        return pc;
    }

    function runCallback(m) {
        if(m.type in messageCallbacks) {
            logDebug("Runnig callback for message type: " + m.type);
            return messageCallbacks[m.type](m)
        }
        else {
            logDebug("Unhandled message: " + JSON.stringify(m));
            self.onError({"type": "unhandled_message", "message": m});
        }
    }

    function logError(error) {
        console.log(error);
    }

    function logDebug(log) {
        if(config.debug) console.log("DEBUG: " + log);
    }

    function onICE(sender, recipient) {
        return (event) => {
            if (event.candidate) {
                send(Call(sender, recipient, "candidate", event.candidate.candidate));
            }
        };
    }

    function pathcat() {
        let output = [];
        for(let i in arguments) output.push(arguments[i]);
        return output.join("/");
    }

    function send(obj) {
        let json = JSON.stringify(obj);
        s.send(json);
        logDebug("Sent: " + json);
    }

    function post(url, obj) {
        let json = JSON.stringify(obj);
        let xhttp = new XMLHttpRequest();
        xhttp.open("POST", url, false);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.setRequestHeader("X-Api-Key", config.apiKey);
        xhttp.send(json);
        logDebug("POST: " + json);
        return JSON.parse(xhttp.responseText);
    }

    return self;
};
