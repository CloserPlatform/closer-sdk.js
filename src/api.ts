import { ApiKey, Config } from "./config";
import { Callback } from "./events";
import { JSONWebSocket } from "./jsonws";
import { Logger } from "./logger";
import * as proto from "./protocol";
import { pathcat } from "./utils";

interface PromiseFunctions {
    resolve: Callback<proto.Event>;
    reject: Callback<proto.Error>;
}

export class API {
    private log: Logger;

    private sessionId: proto.ID;
    private apiKey: ApiKey;

    private url: string;
    private callPath = "calls";
    private chatPath = "chat";
    private roomPath = "rooms";

    private socket: JSONWebSocket;
    private promises: { [ref: string]: PromiseFunctions };

    constructor(config: Config, log: Logger) {
        this.log = log;
        this.sessionId = config.sessionId;
        this.apiKey = config.apiKey;

        this.url = "//" + pathcat([config.url, "api"]);

        this.socket = new JSONWebSocket("wss://" + pathcat([config.url, "ws", config.apiKey]), log);
        this.promises = {};
    }

    onEvent(callback: Callback<proto.Event>) {
        let _this = this;
        this.socket.onMessage(function(e: proto.Event) {
            if (e.type === "error") {
                _this.reject(e.ref, e as proto.Error);
            } else if (e.type === "msg_received") {
                _this.resolve(e.ref, (e as proto.MessageReceived).message); // FIXME Don't rely on this.
            } else {
                _this.resolve(e.ref, e);
            }
            callback(e);
        });
    }

    // Call API:
    createCall(sessions) {
        return this.post([this.url, this.callPath], proto.createCall(sessions));
    }

    createDirectCall(sessionId) {
        return this.post([this.url, this.callPath], proto.createDirectCall(sessionId));
    }

    getCall(callId) {
        return this.get([this.url, this.callPath, callId]);
    }

    getCalls() {
        return this.get([this.url, this.callPath]);
    }

    joinCall(callId) {
        return this.post([this.url, this.callPath, callId, "join"], "");
    }

    leaveCall(callId, reason) {
        return this.post([this.url, this.callPath, callId, "leave"], proto.leaveReason(reason));
    }

    inviteToCall(callId, sessionId) {
        return this.post([this.url, this.callPath, callId, "invite", sessionId], "");
    }

    // Chat API:
    getChatHistory(roomId) {
        return this.get([this.url, this.chatPath, roomId]);
    }

    // Chat room API:
    createRoom(name) {
        return this.post([this.url, this.roomPath], proto.createRoom(name));
    }

    createDirectRoom(sessionId) {
        return this.post([this.url, this.roomPath], proto.createDirectRoom(sessionId));
    }

    getRoom(roomId) {
        return this.get([this.url, this.roomPath, roomId]);
    }

    getRooms() {
        return this.get([this.url, this.roomPath]);
    }

    getRoster() {
        return this.get([this.url, this.roomPath, "unread"]);
    }

    getUsers(roomId) {
        return this.get([this.url, this.roomPath, roomId, "users"]);
    }

    joinRoom(roomId) {
        return this.post([this.url, this.roomPath, roomId, "join"], "");
    }

    leaveRoom(roomId) {
        return this.post([this.url, this.roomPath, roomId, "leave"], "");
    }

    inviteToRoom(roomId, sessionId) {
        return this.post([this.url, this.roomPath, roomId, "invite", sessionId], "");
    }

    // Misc API:
    setStatus(status, timestamp) {
        this.socket.send(proto.presence(this.sessionId, status, timestamp));
    }

    // Call API:
    sendDescription(callId, sessionId, description) {
        this.socket.send(proto.rtcDescription(callId, sessionId, description));
    }

    sendCandidate(callId, sessionId, candidate) {
        this.socket.send(proto.rtcCandidate(callId, sessionId, candidate));
    }

    // Chat API:
    setDelivered(messageId, timestamp) {
        this.socket.send(proto.messageDelivered(messageId, timestamp));
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
            _this.socket.send(proto.messageRequest(roomId, body, ref));
        });
    }

    sendTyping(roomId) {
        this.socket.send(proto.typing(roomId));
    }

    setMark(roomId, timestamp) {
        this.socket.send(proto.mark(roomId, timestamp));
    }

    private responseCallback(xhttp, resolve, reject) {
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

    private get(path: Array<string>): Promise<proto.Event | Array<proto.Event>> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let xhttp = new XMLHttpRequest();
            let url = pathcat(path);
            xhttp.onreadystatechange = _this.responseCallback(xhttp, resolve, reject);
            _this.log("GET " + url);
            xhttp.open("GET", url, true);
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send();
        });
    }

    private post(path: Array<string>, obj): Promise<proto.Event | Array<proto.Event>> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let json = JSON.stringify(obj);
            let xhttp = new XMLHttpRequest();
            let url = pathcat(path);
            xhttp.onreadystatechange = _this.responseCallback(xhttp, resolve, reject);
            _this.log("POST " + url + " " + json);
            xhttp.open("POST", url, true);
            xhttp.setRequestHeader("Content-Type", "application/json");
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send(json);
        });
    }

    private resolve(ref, value) {
        if (ref && ref in this.promises) {
            this.promises[ref].resolve(value);
            delete this.promises[ref];
        }
    }

    private reject(ref, error) {
        if (ref && ref in this.promises) {
            this.promises[ref].reject(error);
            delete this.promises[ref];
        }
    }
}
