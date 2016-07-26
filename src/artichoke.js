import * as proto from "./protocol";
import { nop, pathcat } from "./utils";

// Cross-browser support:
const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

export class Artichoke {
    constructor(config) {
        this.config = config;
        this.log = config.debug ? (line) => console.log("[DEBUG] " + line) : nop;

        this.log("this.config: " + JSON.stringify(this.config));

        // User config:
        this.sessionId = config.sessionId;
        this.apiKey = config.apiKey;

        // Connection state:
        this.pc = undefined;
        this.socket = undefined;

        this.callbacks = {};

        // NOTE By default do nothing.
        this.onConnectCallback = nop;
        this.onRemoteStreamCallback = nop;
        this.onErrorCallback = this.log;
    }

    // Callbacks:
    onConnect(callback) {
        this.onConnectCallback = callback;
    }

    onMessage(type, callback) {
        this.log("Registered callback for message type: " + type);
        this.callbacks[type] = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }

    onRemoteStream(callback) {
        this.onRemoteStreamCallback = callback;
    }

    // API:
    connect() {
        let url = "ws://" + pathcat(this.config.url, "ws", this.apiKey);

        this.log("Connecting to " + url);
        this.socket = new WebSocket(url);
        this.socket.binaryType = "arraybuffer";

        let _this = this;
        this.socket.onopen = () => {
            _this.log("Connected to " + url);
            _this.onConnectCallback();
        };

        this.socket.onmessage = function(event) {
            _this.log("Received: " + event.data);
            let m = JSON.parse(event.data);

            switch (m.type) {
            case "call":
                let peer = m.sender;
                switch (m.signal) {
                case "answer":
                    _this.pc.setRemoteDescription(new RTCSessionDescription({"type": "answer", "sdp": m.body}));
                    _this.pc.onicecandidate = _this._onICE(_this.sessionId, peer);
                    break;

                case "hangup":
                    _this._reconnectRTC();
                    break;

                case "candidate":
                    _this.pc.addIceCandidate(new RTCIceCandidate({"candidate": m.body, "sdpMid": "", "sdpMLineIndex": 0}));
                    break;

                default: break;
                }
                _this._runCallback(m);
                break;

            case "message":
                if (!m.delivered) {
                    _this._send(proto.ChatDelivered(m.id, Date.now()));
                }
                _this._runCallback(m);
                break;

            case "hello":
                _this._runCallback(m);
                break;

            default:
                _this._runCallback(m);
            }
        };

        this._reconnectRTC();
    }

    // Call API:
    offerCall(peer, stream) {
        this.pc.addStream(stream);

        let _this = this;
        this.pc.createOffer((offer) => {
            _this.pc.setLocalDescription(offer);
            _this._send(proto.Call(_this.sessionId, peer, "offer", offer.sdp));
        }, this.log);
    }

    answerCall(peer, offer, stream) {
        this.pc.setRemoteDescription(new RTCSessionDescription({"type": "offer", "sdp": offer.body}));
        this.pc.onicecandidate = this._onICE(this.sessionId, peer);

        this.pc.addStream(stream);

        let _this = this;
        this.pc.createAnswer((answer) => {
            _this.pc.setLocalDescription(answer);
            _this._send(proto.Call(_this.sessionId, peer, "answer", answer.sdp));
        }, this.log);
    }

    rejectCall(peer) {
        this._send(proto.Call(this.sessionId, peer, "hangup", "rejected"));
    }

    hangupCall(peer, reason) {
        this._reconnectRTC();
        this._send(proto.Call(this.sessionId, peer, "hangup", reason));
    }

    // Chat room API:
    createRoom(name, callback) {
        this._post("http://" + pathcat(this.config.url, "api", "room", "create"), proto.RoomCreate(name), callback);
    }

    createDirectRoom(peer, callback) {
        this._post("http://" + pathcat(this.config.url, "api", "room", "create-direct"), proto.RoomCreateDirect(peer), callback);
    }

    getUsers(room, callback) {
        this._get("http://" + pathcat(this.config.url, "api", "room", room, "users"), callback);
    }

    joinRoom(room) {
        this._post("http://" + pathcat(this.config.url, "api", "room", room, "join"), "", nop);
    }

    leaveRoom(room) {
        this._post("http://" + pathcat(this.config.url, "api", "room", room, "leave"), "", nop);
    }

    inviteToRoom(room, who) {
        this._post("http://" + pathcat(this.config.url, "api", "room", room, "invite", who), "", nop);
    }

    sendMessage(room, body) {
        this._send(proto.ChatRequest(room, body));
    }

    // Roster API:
    getRoster(callback) {
        this._get("http://" + pathcat(this.config.url, "api", "roster", "unread"), callback);
    }

    addToRoster(who) {
        this._post("http://" + pathcat(this.config.url, "api", "roster", "add"), proto.RosterAdd(who), nop);
    }

    removeFromRoster(who) {
        this._post("http://" + pathcat(this.config.url, "api", "roster", "remove"), proto.RosterRemove(who), nop);
    }

    // Utils:
    _reconnectRTC() {
        if (this.pc) {
            this.pc.close();
        }

        this.pc = new RTCPeerConnection(this.config.rtc);

        let _this = this;
        let onstream = (event) => _this.onRemoteStreamCallback(event.stream || event.streams[0]);

        if (this.pc.ontrack === null) {
            this.pc.ontrack = onstream;
        } else {
            this.pc.onaddstream = onstream;
        }
    }

    _runCallback(m) {
        if (m.type in this.callbacks) {
            this.log("Runnig callback for message type: " + m.type);
            return this.callbacks[m.type](m);
        } else {
            this.log("Unhandled message: " + JSON.stringify(m));
            this.onErrorCallback({"type": "unhandled_message", "message": m});
        }
    }

    _onICE(sender, recipient) {
        let _this = this;
        return (event) => {
            if (event.candidate) {
                _this._send(proto.Call(sender, recipient, "candidate", event.candidate.candidate));
            }
        };
    }

    _send(obj) {
        let json = JSON.stringify(obj);
        this.socket.send(json);
        this.log("Sent: " + json);
    }

    _get(url, onresponse) {
        let xhttp = new XMLHttpRequest();
        let _this = this;
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                _this.log("response: " + xhttp.responseText);
                onresponse(JSON.parse(xhttp.responseText));
            }
        };
        xhttp.open("GET", url, true);
        xhttp.setRequestHeader("X-Api-Key", this.apiKey);
        xhttp.send();
    }

    _post(url, obj, onresponse) {
        let json = JSON.stringify(obj);
        let xhttp = new XMLHttpRequest();
        let _this = this;
        xhttp.onreadystatechange = function() {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                _this.log("response: " + xhttp.responseText);
                onresponse(JSON.parse(xhttp.responseText));
            }
        };
        xhttp.open("POST", url, true);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.setRequestHeader("X-Api-Key", this.apiKey);
        xhttp.send(json);
        this.log("POST: " + json);
    }

}
