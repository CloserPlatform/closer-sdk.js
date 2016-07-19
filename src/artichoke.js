import * as proto from './protocol';
import { nop, pathcat } from './utils';

export function artichoke(config) {
    let logDebug = config.debug ? (line) => console.log("[DEBUG] " + line)  : nop;

    logDebug("config: " + JSON.stringify(config));

    // Cross-browser support:
    let RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

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
            reject: (peer) => send(proto.Call(userId, peer, "hangup", "rejected")),
            hangup: (peer, reason) => {
                pc = reconnectRTC(pc);
                send(proto.Call(userId, peer, "hangup", reason));
            }
        },

        chat: (peer, body) => send(proto.ChatRequest(peer, body)),

        room: {
            create: (name) => post("http://" + pathcat(config.url, "api", "room", "create"), proto.RoomCreate(name)),
            join: (room) => send(proto.RoomJoin(room)),
            leave: (room) => send(proto.RoomLeave(room)),
            invite: (room, who) => send(proto.RoomInvite(room, who))
        },

        roster: {
            add: (who) => send(proto.RosterAdd(who)),
            remove: (who) => send(proto.RosterRemove(who))
        },

        onConnect: nop, // NOTE By default do nothing.
        onError: (e) => console.log(e),
        onMessage: (type, callback) => {
            logDebug("Registered callback for message type: " + type);
            messageCallbacks[type] = callback;
        },

        onRemoteStream: nop // NOTE By default do nothing.
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
                if(!m.delivered) send(proto.ChatDelivered(m.id, Date.now()));
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
            send(proto.Call(userId, peer, "offer", offer.sdp));
        }, logDebug);
    }

    function answer(peer, offer, stream) {
        pc.setRemoteDescription(new RTCSessionDescription({"type": "offer", "sdp": offer.body}));
        pc.onicecandidate = onICE(userId, peer);

        pc.addStream(stream);

        pc.createAnswer((answer) => {
            pc.setLocalDescription(answer);
            send(proto.Call(userId, peer, "answer", answer.sdp));
        }, logDebug);
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

    function onICE(sender, recipient) {
        return (event) => {
            if (event.candidate) {
                send(proto.Call(sender, recipient, "candidate", event.candidate.candidate));
            }
        };
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
