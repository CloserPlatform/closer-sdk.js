import { ApiKey, SessionData } from "./auth";
import { ChatConfig, RatelConfig } from "./config";
import { Callback } from "./events";
import { JSONWebSocket } from "./jsonws";
import { Logger } from "./logger";
import * as proto from "./protocol";

export class HeaderValue {
  header: string;
  value: string;

  constructor(header: string, value: string) {
    this.header = header;
    this.value = value;
  }
}

interface Thunk {
  (): void;
}

export class RESTfulAPI {
  protected log: Logger;

  constructor(log: Logger) {
    this.log = log;
  }

  private responseCallback<Response>(xhttp: XMLHttpRequest,
                                     resolve: PromiseResolve<Response>,
                                     reject: PromiseReject): Thunk {
    return () => {
      if (xhttp.readyState === 4 && xhttp.status === 200) {
        this.log("OK response: " + xhttp.responseText);
        try {
          resolve(JSON.parse(xhttp.responseText));
        } catch (e) {
          // FIXME Needed by RatelAPI.verifySignature()
          (resolve as PromiseResolve<any>)(xhttp.responseText);
        }
      } else if (xhttp.readyState === 4 && xhttp.status === 204) {
        this.log("NoContent response.");
        resolve(undefined);
      } else if (xhttp.readyState === 4) {
        this.log("Error response: " + xhttp.responseText);
        try {
          reject(JSON.parse(xhttp.responseText));
        } catch (error) {
          reject(undefined); // FIXME Make sure that this never happens.
        }
      }
    };
  }

  get<Response>(path: Array<string>, headers?: Array<HeaderValue>): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      let url = path.join("/");
      this.log("GET " + url);

      let xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = this.responseCallback<Response>(xhttp, resolve, reject);
      xhttp.open("GET", url, true);
      (headers || []).forEach((h) => xhttp.setRequestHeader(h.header, h.value));
      xhttp.send();
    });
  }

  post<Body, Response>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      let url = path.join("/");

      let xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = this.responseCallback<Response>(xhttp, resolve, reject);
      xhttp.open("POST", url, true);
      (headers || []).forEach((h) => xhttp.setRequestHeader(h.header, h.value));

      if (body) {
        let json = JSON.stringify(body);
        this.log("POST " + url + ": " + json);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(json);
      } else {
        this.log("POST " + url);
        xhttp.send();
      }
    });
  }
}

export interface PromiseResolve<T> extends Callback<T> {}
export interface PromiseReject extends Callback<proto.Error> {}

interface PromiseFunctions {
  resolve: PromiseResolve<proto.Event>;
  reject: PromiseReject;
}

export class APIWithWebsocket extends RESTfulAPI {
  private socket: JSONWebSocket;
  private promises: { [ref: string]: PromiseFunctions };

  constructor(log: Logger) {
    super(log);
    this.promises = {};
  }

  connect(url: string) {
    this.socket = new JSONWebSocket(url, this.log);
  }

  send(event: proto.Event) {
    this.socket.send(proto.unfix(event));
  }

  ask<Response>(event: proto.Event): Promise<Response> {
    return new Promise((resolve, reject) => {
      let ref = "ref" + Date.now(); // FIXME Use UUID instead.
      this.promises[ref] = {
        resolve,
        reject
      };
      event.ref = ref;
      this.send(event);
    });
  }

  onEvent(callback: Callback<proto.Event>) {
    this.socket.onDisconnect(callback);

    this.socket.onError(callback);

    this.socket.onEvent((event: proto.Event) => {
      let e = proto.fix(event);
      if (e.type === "error") {
        this.reject(e.ref, e as proto.Error);
      } else {
        this.resolve(e.ref, e);
      }
      callback(e);
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

export class ArtichokeAPI extends APIWithWebsocket {
  private authHeaders: Array<HeaderValue>;

  protected url: string;
  private archivePath = "archive/items";
  private callPath = "calls";
  private botPath = "bots";
  private roomPath = "rooms";

  private wsUrl: string;

  constructor(apiKey: ApiKey, config: ChatConfig, log: Logger) {
    super(log);

    this.authHeaders = [new HeaderValue("X-Api-Key", apiKey)];

    let host = config.hostname + ":" + config.port;
    this.url = [config.protocol, "//", host, "/api"].join("");
    let wsProtocol = config.protocol === "https:" ? "wss:" : "ws:";
    this.wsUrl = [wsProtocol, "//", host, "/ws/", apiKey].join("");
  }

  connect() {
    super.connect(this.wsUrl);
  }

  // Call API:
  sendDescription(callId: proto.ID, sessionId: proto.ID, description: proto.SDP) {
    this.send(proto.rtcDescription(callId, sessionId, description));
  }

  sendCandidate(callId: proto.ID, sessionId: proto.ID, candidate: proto.Candidate) {
    this.send(proto.rtcCandidate(callId, sessionId, candidate));
  }

  createCall(sessionIds: Array<proto.ID>): Promise<proto.Call> {
    return this.postAuth<proto.CreateCall, proto.Call>([this.url, this.callPath], proto.createCall(sessionIds));
  }

  createDirectCall(sessionId: proto.ID): Promise<proto.Call> {
    return this.postAuth<proto.CreateDirectCall, proto.Call>([this.url, this.callPath],
                                                             proto.createDirectCall(sessionId));
  }

  getCall(callId: proto.ID): Promise<proto.Call> {
    return this.getAuth<proto.Call>([this.url, this.callPath, callId]);
  }

  getCalls(): Promise<Array<proto.Call>> {
    return this.getAuth<Array<proto.Call>>([this.url, this.callPath]);
  }

  joinCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "join"]);
  }

  leaveCall(callId: proto.ID, reason: string): Promise<void> {
    return this.postAuth<proto.LeaveReason, void>([this.url, this.callPath, callId, "leave"],
                                                  proto.leaveReason(reason));
  }

  inviteToCall(callId: proto.ID, sessionId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "invite", sessionId]);
  }

  // Room API:
  createRoom(name: string): Promise<proto.Room> {
    return this.postAuth<proto.CreateRoom, proto.Room>([this.url, this.roomPath], proto.createRoom(name));
  }

  createDirectRoom(sessionId: proto.ID): Promise<proto.Room> {
    return this.postAuth<proto.CreateDirectRoom, proto.Room>([this.url, this.roomPath],
                                                             proto.createDirectRoom(sessionId));
  }

  getRoom(roomId: proto.ID): Promise<proto.Room> {
    return this.getAuth<proto.Room>([this.url, this.roomPath, roomId]);
  }

  getRooms(): Promise<Array<proto.Room>> {
    return this.getAuth<Array<proto.Room>>([this.url, this.roomPath]);
  }

  getRoster(): Promise<Array<proto.Room>> {
    return this.getAuth<Array<proto.Room>>([this.url, this.roomPath, "roster"]);
  }

  getRoomUsers(roomId: proto.ID): Promise<Array<proto.ID>> {
    return this.getAuth<Array<proto.ID>>([this.url, this.roomPath, roomId, "users"]);
  }

  getRoomHistory(roomId: proto.ID): Promise<Array<proto.ArchivableWithType>> {
    return this.getAuth<Array<proto.ArchivableWithType>>([this.url, this.roomPath, roomId, "history"]);
  }

  joinRoom(roomId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.roomPath, roomId, "join"]);
  }

  leaveRoom(roomId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.roomPath, roomId, "leave"]);
  }

  inviteToRoom(roomId: proto.ID, sessionId: proto.ID): Promise<void> {
    return this.postAuth<proto.Invite, void>([this.url, this.roomPath, roomId, "invite"], proto.invite(sessionId));
  }

  sendMessage(roomId: proto.ID, body: string): Promise<proto.Message> {
    return this.ask<proto.ChatReceived>(proto.chatRequest(roomId, body)).then((ack) => ack.message);
  }

  sendMetadata(roomId: proto.ID, payload: any): Promise<proto.Metadata> {
    return this.postAuth<any, proto.Metadata>([this.url, this.roomPath, roomId, "metadata"], payload);
  }

  sendMedia(roomId: proto.ID, media: proto.MediaItem): Promise<proto.Media> {
    return this.postAuth<proto.MediaItem, proto.Media>([this.url, this.roomPath, roomId, "media"], media);
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
    return this.postAuth<proto.Archivable, proto.Archivable>([this.url, this.archivePath, archivable.id], archivable);
  }

  // Presence API:
  setStatus(status: proto.Status) {
    this.send(proto.presenceRequest(status));
  }

  // Bot API:
  createBot(name: string, callback?: string): Promise<proto.Bot> {
    return this.postAuth<proto.CreateBot, proto.Bot>([this.url, this.botPath], proto.createBot(name, callback));
  }

  getBot(botId: proto.ID): Promise<proto.Bot> {
    return this.getAuth<proto.Bot>([this.url, this.botPath, botId]);
  }

  getBots(): Promise<Array<proto.Bot>> {
    return this.getAuth<Array<proto.Bot>>([this.url, this.botPath]);
  }

  private getAuth<Response>(path: Array<string>): Promise<Response> {
    return this.get<Response>(path, this.authHeaders);
  }

  private postAuth<Body, Response>(path, body?: Body): Promise<Response> {
    return this.post<Body, Response>(path, this.authHeaders, body);
  }
}

export class RatelAPI extends RESTfulAPI {
  private verifyPath = "session/verifySig";
  private url: string;

  constructor(config: RatelConfig, log: Logger) {
    super(log);

    let host = config.hostname + ":" + config.port;
    this.url = [config.protocol, "//", host].join("");
  }

  verifySignature(sessionData: SessionData): Promise<ApiKey> {
    let data: any = sessionData;
    data.payload.organizationId = parseInt(sessionData.payload.organizationId);
    data.payload.sessionId = parseInt(sessionData.payload.sessionId);
    return this.post<SessionData, ApiKey>([this.url, this.verifyPath], [], data);
  }
}
