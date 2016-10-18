import {ApiKey} from "./auth";
import {Config} from "./config";
import {Callback} from "./events";
import {JSONWebSocket} from "./jsonws";
import {Logger} from "./logger";
import * as proto from "./protocol";

export interface PromiseResolve<T> extends Callback<T> {}
export interface PromiseReject extends Callback<proto.Error> {}

interface PromiseFunctions {
    resolve: PromiseResolve<proto.Event>;
    reject: PromiseReject;
}

export interface Thunk {
    (): void;
}

class HeaderValue {
    header: string;
    value: string;

    constructor(header: string, value: string) {
        this.header = header;
        this.value = value;
    }
}

export type ResolveCallbackType = <Result>(xhttp: XMLHttpRequest,
                                           resolve: PromiseResolve<Result>,
                                           reject: PromiseReject) => Thunk
export type PostRequestType = <Arg, Result>(onload: ResolveCallbackType) => PostRequestWithHeadersType

export type PostRequestWithHeadersType = <Arg, Result>(path: Array<string>, obj: Arg) => Promise<Result>

export class API {
    private log: Logger;

    private sessionId: proto.ID;
    private apiKey: ApiKey;

    private url: string;
    private archivePath = "archive/items";
    private callPath = "calls";
    private botPath = "bots";
    private roomPath = "rooms";

    private wsUrl: string;
    private socket: JSONWebSocket;
    private promises: { [ref: string]: PromiseFunctions };

    private post: PostRequestWithHeadersType;

    private static postFactory <Arg, Result>(headers: Array<HeaderValue>): PostRequestType {
        return function (onloadCallback: ResolveCallbackType) {
            return function (path: Array<string>, obj: Arg) {
                return new Promise<Result>(function (resolve, reject) {
                    let json = JSON.stringify(obj);
                    let xhttp = new XMLHttpRequest();
                    let url = path.join("/");
                    xhttp.onreadystatechange = onloadCallback<Result>(xhttp, resolve, reject);
                    console.log("POST " + url + " " + json);
                    xhttp.open("POST", url, true);
                    xhttp.setRequestHeader("Content-Type", "application/json");
                    for (let header of headers) {
                        xhttp.setRequestHeader(header.header, header.value);
                    }
                    xhttp.send(json);
                });
            };
        };
    }

    static getApiKeyPostRequest = API.postFactory([]);

    constructor(config: Config, log: Logger) {
        this.log = log;
        this.sessionId = config.sessionId;
        this.apiKey = config.apiKey;
        this.post = API.postFactory([new HeaderValue("X-Api-Key", this.apiKey)])(this.responseCallback);

        let host = config.hostname + ":" + config.port;
        this.url = [config.protocol, "//", host, "/api"].join("");
        let wsProtocol = config.protocol === "https:" ? "wss:" : "ws:";
        this.wsUrl = [wsProtocol, "//", host, "/ws/", config.apiKey].join("");

        this.promises = {};
    }

    connect() {
        this.socket = new JSONWebSocket(this.wsUrl, this.log);
    }

    onEvent(callback: Callback<proto.Event>) {
        let _this = this;
        this.socket.onEvent(function(event: proto.Event) {
            let e = proto.fix(event);
            if (e.type === "error") {
                _this.reject(e.ref, e as proto.Error);
            } else {
                _this.resolve(e.ref, e);
            }
            callback(e);
        });
    }

    // Call API:
    sendDescription(callId: proto.ID, sessionId: proto.ID, description: proto.SDP) {
        this.send(proto.rtcDescription(callId, sessionId, description));
    }

    sendCandidate(callId: proto.ID, sessionId: proto.ID, candidate: proto.Candidate) {
        this.send(proto.rtcCandidate(callId, sessionId, candidate));
    }

    createCall(sessionIds: Array<proto.ID>): Promise<proto.Call> {
        return this.post<proto.CreateCall, proto.Call>([this.url, this.callPath], proto.createCall(sessionIds));
    }

    createDirectCall(sessionId: proto.ID): Promise<proto.Call> {
        return this.post<proto.CreateDirectCall, proto.Call>([this.url, this.callPath],
            proto.createDirectCall(sessionId));
    }

    getCall(callId: proto.ID): Promise<proto.Call> {
        return this.get<proto.Call>([this.url, this.callPath, callId]);
    }

    getCalls(): Promise<Array<proto.Call>> {
        return this.get<Array<proto.Call>>([this.url, this.callPath]);
    }

    joinCall(callId: proto.ID): Promise<void> {
        return this.post<string, void>([this.url, this.callPath, callId, "join"], "");
    }

    leaveCall(callId: proto.ID, reason: string): Promise<void> {
        return this.post<proto.LeaveReason, void>([this.url, this.callPath, callId, "leave"],
            proto.leaveReason(reason));
    }

    inviteToCall(callId: proto.ID, sessionId: proto.ID): Promise<void> {
        return this.post<string, void>([this.url, this.callPath, callId, "invite", sessionId], "");
    }

    // Room API:
    createRoom(name: string): Promise<proto.Room> {
        return this.post<proto.CreateRoom, proto.Room>([this.url, this.roomPath], proto.createRoom(name));
    }

    createDirectRoom(sessionId: proto.ID): Promise<proto.Room> {
        return this.post<proto.CreateDirectRoom, proto.Room>([this.url, this.roomPath],
            proto.createDirectRoom(sessionId));
    }

    getRoom(roomId: proto.ID): Promise<proto.Room> {
        return this.get<proto.Room>([this.url, this.roomPath, roomId]);
    }

    getRooms(): Promise<Array<proto.Room>> {
        return this.get<Array<proto.Room>>([this.url, this.roomPath]);
    }

    getRoster(): Promise<Array<proto.Room>> {
        return this.get<Array<proto.Room>>([this.url, this.roomPath, "roster"]);
    }

    getRoomUsers(roomId: proto.ID): Promise<Array<proto.ID>> {
        return this.get<Array<proto.ID>>([this.url, this.roomPath, roomId, "users"]);
    }

    getRoomHistory(roomId: proto.ID): Promise<Array<proto.ArchivableWithType>> {
        return this.get<Array<proto.ArchivableWithType>>([this.url, this.roomPath, roomId, "history"]);
    }

    joinRoom(roomId: proto.ID): Promise<void> {
        return this.post<string, void>([this.url, this.roomPath, roomId, "join"], "");
    }

    leaveRoom(roomId: proto.ID): Promise<void> {
        return this.post<string, void>([this.url, this.roomPath, roomId, "leave"], "");
    }

    inviteToRoom(roomId: proto.ID, sessionId: proto.ID): Promise<void> {
        return this.post<proto.Invite, void>([this.url, this.roomPath, roomId, "invite"], proto.invite(sessionId));
    }

    sendMessage(roomId: proto.ID, body: string): Promise<proto.Message> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            let ref = "ref" + Date.now(); // FIXME Use UUID instead.
            _this.promises[ref] = {
                resolve: (ack: proto.ChatReceived) => resolve(ack.message),
                reject
            };
            _this.send(proto.chatRequest(roomId, body, ref));
        });
    }

    sendMetadata(roomId: proto.ID, payload: any): Promise<proto.Metadata> {
        return this.post<any, proto.Metadata>([this.url, this.roomPath, roomId, "metadata"], payload);
    }

    sendMedia(roomId: proto.ID, media: proto.MediaItem): Promise<proto.Media> {
        return this.post<proto.MediaItem, proto.Media>([this.url, this.roomPath, roomId, "media"], media);
    }

    sendTyping(roomId: proto.ID) {
        this.send(proto.typing(roomId));
    }

    setMark(roomId: proto.ID, timestamp: proto.Timestamp) {
        this.send(proto.mark(roomId, timestamp));
    }

    // Archivable API:
    setDelivered(archivableId: proto.ID, timestamp: proto.Timestamp) {
        this.send(proto.chatDelivered(archivableId, timestamp));
    }

    updateArchivable(archivable: proto.Archivable, timestamp: proto.Timestamp): Promise<proto.Archivable> {
        return this.post<proto.Archivable, proto.Archivable>([this.url, this.archivePath, archivable.id], archivable);
    }

    // Presence API:
    setStatus(status: proto.Status, timestamp: proto.Timestamp) {
        this.send(proto.presence(this.sessionId, status, timestamp));
    }

    // Bot API:
    createBot(name: string, callback?: string): Promise<proto.Bot> {
        return this.post<proto.CreateBot, proto.Bot>([this.url, this.botPath], proto.createBot(name, callback));
    }

    getBot(botId: proto.ID): Promise<proto.Bot> {
        return this.get<proto.Bot>([this.url, this.botPath, botId]);
    }

    getBots(): Promise<Array<proto.Bot>> {
        return this.get<Array<proto.Bot>>([this.url, this.botPath]);
    }

    private send(event: proto.Event) {
        this.socket.send(proto.unfix(event));
    }

    private responseCallback<Result>(xhttp: XMLHttpRequest, resolve: PromiseResolve<Result>,
                                     reject: PromiseReject): Thunk {
        let _this = console;
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

    private get<Result>(path: Array<string>): Promise<Result> {
        let _this = this;
        return new Promise<Result>(function(resolve, reject) {
            let xhttp = new XMLHttpRequest();
            let url = path.join("/");
            xhttp.onreadystatechange = _this.responseCallback<Result>(xhttp, resolve, reject);
            _this.log("GET " + url);
            xhttp.open("GET", url, true);
            xhttp.setRequestHeader("X-Api-Key", _this.apiKey);
            xhttp.send();
        });
    }

    private resolve(ref: proto.Ref, event: proto.Event) {
        if (ref && ref in this.promises) {
            this.promises[ref].resolve(event);
            delete this.promises[ref];
        }
    }

    private reject(ref: proto.Ref, error: proto.Error) {
        if (ref && ref in this.promises) {
            this.promises[ref].reject(error);
            delete this.promises[ref];
        }
    }
}
