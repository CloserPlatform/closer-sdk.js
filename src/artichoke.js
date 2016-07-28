import * as proto from "./protocol";
import { nop, pathcat } from "./utils";

// Cross-browser support:
const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

function fixCall(m) {
    // FIXME Do this on the backend
    if (m.type === "call") {
        let fixed = {
            "type": "call_" + m.signal,
            "sender": m.sender
        };
        switch (m.signal) {
        case "answer": fixed.sdp = m.body; break;
        case "offer": fixed.sdp = m.body; break;
        case "candidate": fixed.candidate = m.body; break;
        case "hangup": fixed.reason = m.body; break;
        default: break;
        }
        return fixed;
    } else {
        return m;
    }
}

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
        this.onErrorCallback = nop;
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
            let m = fixCall(JSON.parse(event.data)); // FIXME Don't fix anything.

            switch (m.type) {
            case "call_answer":
                _this.pc.setRemoteDescription(new RTCSessionDescription({"type": "answer", "sdp": m.sdp}));
                _this.pc.onicecandidate = _this._onICE(_this.sessionId, m.sender);
                break;

            case "call_hangup":
                _this._reconnectRTC();
                break;

            case "call_candidate":
                _this.pc.addIceCandidate(new RTCIceCandidate({"candidate": m.candidate, "sdpMid": "", "sdpMLineIndex": 0}));
                break;

            case "message":
                if (!m.delivered) {
                    _this._send(proto.ChatDelivered(m.id, Date.now()));
                }
                break;

            default: break;
            }
            _this._runCallback(m);
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
        }, (error) => {
            _this.onErrorCallback({"reason": "Offer creation failed.", "error": error});
        });
    }

    answerCall(offer, stream) {
        this.pc.setRemoteDescription(new RTCSessionDescription({"type": "offer", "sdp": offer.sdp}));
        this.pc.onicecandidate = this._onICE(this.sessionId, offer.sender);

        this.pc.addStream(stream);

        let _this = this;
        this.pc.createAnswer((answer) => {
            _this.pc.setLocalDescription(answer);
            _this._send(proto.Call(_this.sessionId, offer.sender, "answer", answer.sdp));
        }, (error) => {
            _this.onErrorCallback({"reason": "Answer creation failed.", "error": error});
        });
    }

    rejectCall(offer) {
        this._send(proto.Call(this.sessionId, offer.sender, "hangup", "rejected"));
    }

    hangupCall(peer, reason) {
        this._reconnectRTC();
        this._send(proto.Call(this.sessionId, peer, "hangup", reason));
    }

    // Chat room API:
    createRoom(name) {
        return this._post("http://" + pathcat(this.config.url, "api", "room", "create"), proto.RoomCreate(name));
    }

    createDirectRoom(peer) {
        return this._post("http://" + pathcat(this.config.url, "api", "room", "create-direct"), proto.RoomCreateDirect(peer));
    }

    getUsers(room) {
        return this._get("http://" + pathcat(this.config.url, "api", "room", room, "users"));
    }

    getChatHistory(room) {
        return this._get("http://" + pathcat(this.config.url, "api", "chat", room));
    }

    joinRoom(room) {
        return this._post("http://" + pathcat(this.config.url, "api", "room", room, "join"), "");
    }

    leaveRoom(room) {
        return this._post("http://" + pathcat(this.config.url, "api", "room", room, "leave"), "");
    }

    inviteToRoom(room, who) {
        return this._post("http://" + pathcat(this.config.url, "api", "room", room, "invite", who), "");
    }

    sendMessage(room, body) {
        this._send(proto.ChatRequest(room, body));
    }

    // Roster API:
    getRoster() {
        return this._get("http://" + pathcat(this.config.url, "api", "roster", "unread"));
    }

    addToRoster(who) {
        return this._post("http://" + pathcat(this.config.url, "api", "roster", "add"), proto.RosterAdd(who));
    }

    removeFromRoster(who) {
        return this._post("http://" + pathcat(this.config.url, "api", "roster", "remove"), proto.RosterRemove(who));
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
            this.onErrorCallback({"reason": "Unhandled message.", "message": m});
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
        this.log("WS: " + json);
    }

    _get(url) {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState === 4 && xhttp.status === 200) {
                    _this.log("OK response: " + xhttp.responseText);
                    resolve(JSON.parse(xhttp.responseText));
                } else if (xhttp.readyState === 4 && xhttp.status === 204) {
                    _this.log("NoContent response.");
                    resolve(null);
                } else if (xhttp.readyState === 4) {
                    _this.log("Error response: " + xhttp.responseText);
                    reject(parse(xhttp.responseText, null));
                }
            };
            _this.log("GET " + url);
            xhttp.open("GET", url, true);
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send();
        });
    }

    _post(url, obj) {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let json = JSON.stringify(obj);
            let xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (xhttp.readyState === 4 && xhttp.status === 200) {
                    _this.log("OK response: " + xhttp.responseText);
                    resolve(JSON.parse(xhttp.responseText));
                } else if (xhttp.readyState === 4 && xhttp.status === 204) {
                    _this.log("NoContent response.");
                    resolve(null);
                } else if (xhttp.readyState === 4) {
                    _this.log("Error response: " + xhttp.responseText);
                    reject(parseOrElse(xhttp.responseText, null));
                }
            };
            _this.log("POST " + url + " " + json);
            xhttp.open("POST", url, true);
            xhttp.setRequestHeader("Content-Type", "application/json");
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send(json);
        });
    }
}

function parseOrElse(json, els) {
    try {
        return JSON.parse(json);
    } catch (error) {
        return els;
    }
}
