import { createCall } from "./call";
import { ApiKey, Config } from "./config";
import { Callback, EventHandler } from "./events";
import { JSONWebSocket } from "./jsonws";
import { Logger } from "./logger";
import { createMessage } from "./message";
import * as proto from "./protocol";
import { createRoom } from "./room";
import { nop, pathcat, wrapPromise } from "./utils";

class ArtichokeREST {
    private log: Logger;
    private apiKey: ApiKey;

    private url: string;
    private callPath: string;
    private chatPath: string;
    private roomPath: string;

    constructor(config: Config, log: Logger) {
        this.log = log;
        this.apiKey = config.apiKey;
        this.url = "//" + pathcat([config.url, "api"]);

        this.callPath = "calls";
        this.chatPath = "chat";
        this.roomPath = "rooms";
    }

    createCall(sessions) {
        return this._post([this.url, this.callPath], proto.createCall(sessions));
    }

    createDirectCall(sessionId) {
        return this._post([this.url, this.callPath], proto.createDirectCall(sessionId));
    }

    getCall(callId) {
        return this._get([this.url, this.callPath, callId]);
    }

    getCalls() {
        return this._get([this.url, this.callPath]);
    }

    joinCall(callId) {
        return this._post([this.url, this.callPath, callId, "join"], "");
    }

    leaveCall(callId, reason) {
        return this._post([this.url, this.callPath, callId, "leave"], proto.leaveReason(reason));
    }

    inviteToCall(callId, sessionId) {
        return this._post([this.url, this.callPath, callId, "invite", sessionId], "");
    }

    // Chat API:
    getChatHistory(roomId) {
        return this._get([this.url, this.chatPath, roomId]);
    }

    // Chat room API:
    createRoom(name) {
        return this._post([this.url, this.roomPath], proto.createRoom(name));
    }

    createDirectRoom(sessionId) {
        return this._post([this.url, this.roomPath], proto.createDirectRoom(sessionId));
    }

    getRoom(roomId) {
        return this._get([this.url, this.roomPath, roomId]);
    }

    getRooms() {
        return this._get([this.url, this.roomPath]);
    }

    getRoster() {
        return this._get([this.url, this.roomPath, "unread"]);
    }

    getUsers(roomId) {
        return this._get([this.url, this.roomPath, roomId, "users"]);
    }

    joinRoom(roomId) {
        return this._post([this.url, this.roomPath, roomId, "join"], "");
    }

    leaveRoom(roomId) {
        return this._post([this.url, this.roomPath, roomId, "leave"], "");
    }

    inviteToRoom(roomId, sessionId) {
        return this._post([this.url, this.roomPath, roomId, "invite", sessionId], "");
    }

    _responseCallback(xhttp, resolve, reject) {
        let _this = this;
        return function() {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                _this.log("OK response: " + xhttp.responseText);
                resolve(JSON.parse(xhttp.responseText));
            } else if (xhttp.readyState === 4 && xhttp.status === 204) {
                _this.log("NoContent response.");
                resolve(undefined);
            } else if (xhttp.readyState === 4) {
                _this.log("Error response: " + xhttp.responseText);
                try {
                    reject(JSON.parse(xhttp.responseText));
                } catch (error) {
                    reject(undefined); // FIXME Make sure that this never happens.
                }
            }
        };
    }

    _get(path: Array<string>): Promise<proto.Event | Array<proto.Event>> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let xhttp = new XMLHttpRequest();
            let url = pathcat(path);
            xhttp.onreadystatechange = _this._responseCallback(xhttp, resolve, reject);
            _this.log("GET " + url);
            xhttp.open("GET", url, true);
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send();
        });
    }

    _post(path: Array<string>, obj): Promise<proto.Event | Array<proto.Event>> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let json = JSON.stringify(obj);
            let xhttp = new XMLHttpRequest();
            let url = pathcat(path);
            xhttp.onreadystatechange = _this._responseCallback(xhttp, resolve, reject);
            _this.log("POST " + url + " " + json);
            xhttp.open("POST", url, true);
            xhttp.setRequestHeader("Content-Type", "application/json");
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send(json);
        });
    }
}

interface PromiseFunctions {
    resolve: Callback<proto.Event>;
    reject: Callback<proto.Error>;
}

class ArtichokeWS extends JSONWebSocket {
    private promises: { [ref: string]: PromiseFunctions };

    constructor(config: Config, log: Logger) {
        super("wss://" + pathcat([config.url, "ws", config.apiKey]), log);
        this.promises = {};
    }

    // Misc API:
    setStatus(sessionId, status, timestamp) {
        this.send(proto.presence(sessionId, status, timestamp));
    }

    // Call API:
    sendDescription(callId, sessionId, description) {
        this.send(proto.rtcDescription(callId, sessionId, description));
    }

    sendCandidate(callId, sessionId, candidate) {
        this.send(proto.rtcCandidate(callId, sessionId, candidate));
    }

    // Chat API:
    setDelivered(messageId, timestamp) {
        this.send(proto.messageDelivered(messageId, timestamp));
    }

    // Room API:
    sendMessage(roomId, body) {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let ref = "ref" + Date.now(); // FIXME Use UUID instead.
            _this.promises[ref] = {
                resolve, // FIXME This should createMessage().
                reject
            };
            _this.send(proto.messageRequest(roomId, body, ref));
        });
    }

    sendTyping(roomId) {
        this.send(proto.typing(roomId));
    }

    onMessage(callback) {
        let _this = this;
        super.onMessage(function(msg) {
            if (msg.type === "error" && msg.ref) {
                _this._reject(msg.ref, msg);
            } else if (msg.type === "msg_received" && msg.ref) {
                _this._resolve(msg.ref, msg.message); // FIXME Don't rely on this.
            } else if (msg.ref) {
                _this._resolve(msg.ref, msg);
            }
            callback(msg);
        });
    }

    _resolve(ref, value) {
        if (ref in this.promises) {
            this.promises[ref].resolve(value);
            delete this.promises[ref];
        }
    }

    _reject(ref, error) {
        if (ref in this.promises) {
            this.promises[ref].reject(error);
            delete this.promises[ref];
        }
    }

    setMark(roomId, timestamp) {
        this.send(proto.mark(roomId, timestamp));
    }
}

export class Artichoke {
    private config: Config;
    private events: EventHandler;

    // FIXME Make these private.
    public log: Logger;
    public rest;
    public socket;

    // FIXME Move these away from here.
    public sessionId;
    public apiKey;

    constructor(config: Config, log: Logger, eh: EventHandler) {
        this.config = config;
        this.log = log;
        this.events = eh;

        this.log("this.config: " + JSON.stringify(this.config));

        this.rest = new ArtichokeREST(config, log);

        // User config:
        this.sessionId = config.sessionId;
        this.apiKey = config.apiKey;

        // Connection state:
        this.socket = undefined;

        // NOTE By default do nothing.
        this.events.onEvent("error", nop);
        this.events.onEvent("msg_received", nop);
        this.events.onEvent("msg_delivered", nop);
    }

    // Callbacks:
    // FIXME Remove this.
    onEvent(type: string, callback: Callback<proto.Event>) {
        this.events.onEvent(type, callback);
    }

    onConnect(callback: Callback<proto.Event>) {
        this.events.onEvent("hello", callback);
    }

    onError(callback: Callback<proto.Error>) {
        this.events.onError(callback);
    }

    // API:
    connect() {
        this.socket = new ArtichokeWS(this.config, this.log);

        let _this = this;
        this.socket.onMessage(function(m) {
            // FIXME Adjust format on the backend.
            switch (m.type) {
            case "call_invitation":
                _this.events.notify({
                    type: m.type,
                    sender: m.user,
                    call: createCall(m.call, _this)
                } as proto.Event);
                break;

            case "room_created": // FIXME Rename to room_invitation.
                _this.events.notify({
                    type: m.type,
                    room: createRoom(m.room, _this)
                } as proto.Event);
                break;

            case "message":
                _this.events.notify(createMessage(m, _this));
                break;

            case "presence":
                _this.events.notify({
                    type: m.type,
                    user: m.sender,
                    status: m.status,
                    timestamp: m.timestamp
                } as proto.Event);
                break;

            default:
                _this.events.notify(m as proto.Event);
            }
        });
    }

    // Misc API:
    onStatusChange(callback) {
        this.onEvent("presence", callback);
    }

    setStatus(status) {
        this.socket.setStatus(this.sessionId, status, Date.now());
    }

    // Call API:
    onCall(callback) {
        this.onEvent("call_invitation", callback);
    }

    createDirectCall(peer) {
        return this._wrapCall(this.rest.createDirectCall(peer));
    }

    createCall(users) {
        return this._wrapCall(this.rest.createCall(users));
    }

    getCall(call) {
        return this._wrapCall(this.rest.getCall(call));
    }

    getCalls() {
        return this._wrapCall(this.rest.getCalls());
    }

    // Chat room API:
    onRoom(callback) {
        this.onEvent("room_created", callback);
    }

    createRoom(name) {
        return this._wrapRoom(this.rest.createRoom(name));
    }

    createDirectRoom(peer) {
        return this._wrapRoom(this.rest.createDirectRoom(peer));
    }

    getRoom(room) {
        return this._wrapRoom(this.rest.getRoom(room));
    }

    getRooms() {
        return this._wrapRoom(this.rest.getRooms());
    }

    getRoster() {
        return this._wrapRoom(this.rest.getRoster());
    }

    // Utils:
    _wrapCall(promise) {
        return wrapPromise(promise, createCall, [this]);
    }

    _wrapRoom(promise) {
        return wrapPromise(promise, createRoom, [this]);
    }

    _error(reason: string, error) {
        error = error || {};
        error.type = "error";
        error.reason = reason;
        this.events.notify(error);
    }
}
