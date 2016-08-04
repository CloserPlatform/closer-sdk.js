import * as proto from "./protocol";
import { nop, pathcat } from "./utils";
import { JSONWebSocket } from "./jsonws";
import { RTCConnection } from "./rtc";

class ArtichokeREST {
    constructor(config) {
        this.log = config.log;
        this.apiKey = config.apiKey;
        this.url = "//" + pathcat(config.url, "api");
    }

    // Chat API:
    getChatHistory(roomId) {
        return this._get(pathcat(this.url, "chat", roomId));
    }

    // Chat room API:
    createRoom(name) {
        return this._post(pathcat(this.url, "room", "create"), proto.RoomCreate(name));
    }

    createDirectRoom(sessionId) {
        return this._post(pathcat(this.url, "room", "create-direct"), proto.RoomCreateDirect(sessionId));
    }

    getRooms() {
        return this._get(pathcat(this.url, "room", "unread"));
    }

    getUsers(roomId) {
        return this._get(pathcat(this.url, "room", roomId, "users"));
    }

    joinRoom(roomId) {
        return this._post(pathcat(this.url, "room", roomId, "join"), "");
    }

    leaveRoom(roomId) {
        return this._post(pathcat(this.url, "room", roomId, "leave"), "");
    }

    inviteToRoom(roomId, sessionId) {
        return this._post(pathcat(this.url, "room", roomId, "invite", sessionId), "");
    }

    _responseCallback(xhttp, resolve, reject) {
        let _this = this;
        return function() {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                _this.log("OK response: " + xhttp.responseText);
                resolve(JSON.parse(xhttp.responseText));
            } else if (xhttp.readyState === 4 && xhttp.status === 204) {
                _this.log("NoContent response.");
                resolve(null);
            } else if (xhttp.readyState === 4) {
                _this.log("Error response: " + xhttp.responseText);
                try {
                    reject(JSON.parse(xhttp.responseText));
                } catch (error) {
                    reject(null); // FIXME Make sure that this never happens.
                }
            }
        };
    }

    _get(url) {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = _this._responseCallback(xhttp, resolve, reject);
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
            xhttp.onreadystatechange = _this._responseCallback(xhttp, resolve, reject);
            _this.log("POST " + url + " " + json);
            xhttp.open("POST", url, true);
            xhttp.setRequestHeader("Content-Type", "application/json");
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send(json);
        });
    }
}

class ArtichokeWS extends JSONWebSocket {
    constructor(config) {
        super("wss://" + pathcat(config.url, "ws", config.apiKey), config);
    }

    // Call API:
    offerCall(sessionId, sdp) {
        this.send(proto.CallOffer(sessionId, sdp));
    }

    answerCall(sessionId, sdp) {
        this.send(proto.CallAnswer(sessionId, sdp));
    }

    hangupCall(sessionId, reason) {
        this.send(proto.CallHangup(sessionId, reason));
    }

    sendCandidate(sessionId, candidate) {
        this.send(proto.CallCandidate(sessionId, candidate));
    }

    // Chat API:
    setDelivered(messageId) {
        this.send(proto.ChatDelivered(messageId, Date.now()));
    }

    // Room API:
    sendMessage(roomId, body) {
        this.send(proto.ChatRequest(roomId, body));
    }
}

export class Artichoke {
    constructor(config) {
        this.config = config;
        this.log = config.log;

        this.log("this.config: " + JSON.stringify(this.config));

        this.rest = new ArtichokeREST(config);

        // User config:
        this.sessionId = config.sessionId;
        this.apiKey = config.apiKey;

        // Connection state:
        this.rtc = undefined;
        this.socket = undefined;

        this.callbacks = {};

        // NOTE By default do nothing.
        this.onConnectCallback = nop;
        this.onErrorCallback = nop;
    }

    // Callbacks:
    onConnect(callback) {
        this.onConnectCallback = callback;
    }

    onMessage(type, callback) {
        this.log("Registered callback for message type: " + type);
        if (!(type in this.callbacks)) {
            this.callbacks[type] = [];
        }
        this.callbacks[type].push(callback);
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }

    onRemoteStream(callback) {
        this.rtc.onRemoteStream(callback);
    }

    // API:
    connect() {
        this.rtc = new RTCConnection(this.config);
        this.socket = new ArtichokeWS(this.config);
        this.socket.onConnect(this.onConnectCallback);

        let _this = this;
        this.socket.onMessage(function(m) {
            switch (m.type) {
            case "call_answer":
                _this.rtc.setRemoteDescription("answer", m.sdp, function(candidate) {
                    _this.socket.sendCandidate(m.user, candidate);
                });
                break;

            case "call_hangup":
                _this.rtc.reconnect();
                break;

            case "call_candidate":
                _this.rtc.addICECandidate(m.candidate);
                break;

            case "error":
                _this.onErrorCallback(m);
                return;

            case "message":
                if (!m.delivered) {
                    _this.socket.setDelivered(m.id);
                }
                break;

            default: break;
            }
            _this._runCallbacks(m);
        });
    }

    // Call API:
    offerCall(peer, stream) {
        this.rtc.addStream(stream);

        let _this = this;
        this.rtc.createOffer()
            .then((offer) => _this.socket.offerCall(peer, offer))
            .catch((error) => _this.onErrorCallback({"reason": "Offer creation failed.", "error": error}));
    }

    answerCall(offer, stream) {
        this.rtc.addStream(stream);

        let _this = this;
        this.rtc.setRemoteDescription("offer", offer.sdp, function(candidate) {
            _this.socket.sendCandidate(offer.user, candidate);
        });

        this.rtc.createAnswer()
            .then((answer) => _this.socket.answerCall(offer.user, answer))
            .catch((error) => _this.onErrorCallback({"reason": "Answer creation failed.", "error": error}));
    }

    rejectCall(offer) {
        this.socket.hangupCall(offer.user, "rejected");
    }

    hangupCall(peer, reason) {
        this.rtc.reconnect();
        this.socket.hangupCall(peer, reason);
    }

    // Chat room API:
    createRoom(name) {
        return this.rest.createRoom(name);
    }

    createDirectRoom(peer) {
        return this.rest.createDirectRoom(peer);
    }

    getRooms() {
        return this.rest.getRooms();
    }

    getUsers(room) {
        return this.rest.getUsers(room);
    }

    getChatHistory(room) {
        return this.rest.getChatHistory(room);
    }

    joinRoom(room) {
        return this.rest.joinRoom(room);
    }

    leaveRoom(room) {
        return this.rest.leaveRoom(room);
    }

    inviteToRoom(room, who) {
        return this.rest.inviteToRoom(room, who);
    }

    sendMessage(room, body) {
        this.socket.sendMessage(room, body);
    }

    // Utils:
    _runCallbacks(m) {
        if (m.type in this.callbacks) {
            this.log("Runnig callbacks for message type: " + m.type);
            return this.callbacks[m.type].forEach((cb) => cb(m));
        } else {
            this.log("Unhandled message: " + JSON.stringify(m));
            this.onErrorCallback({"reason": "Unhandled message.", "message": m});
        }
    }
}
