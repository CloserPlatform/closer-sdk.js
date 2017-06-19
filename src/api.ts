import { AgentContext, ApiKey, SessionData } from "./auth";
import { ChatConfig, RatelConfig } from "./config";
import { Callback } from "./events";
import { JSONWebSocket } from "./jsonws";
import { Logger } from "./logger";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import * as wireEvents from "./protocol/wire-events";
import { eventTypes } from "./protocol/wire-events";
import { Thunk } from "./utils";

export class HeaderValue {
  header: string;
  value: string;

  constructor(header: string, value: string) {
    this.header = header;
    this.value = value;
  }
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
        resolve(JSON.parse(xhttp.responseText));
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
export interface PromiseReject extends Callback<wireEvents.Error> {}

interface PromiseFunctions {
  resolve: PromiseResolve<wireEvents.Event>;
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

  disconnect() {
    this.socket.disconnect();
  }

  send(event: wireEvents.Event) {
    this.socket.send(event);
  }

  ask<Response>(event: wireEvents.Event): Promise<Response> {
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

  onEvent(callback: Callback<wireEvents.Event>) {
    this.socket.onDisconnect(callback);

    this.socket.onError(callback);

    this.socket.onEvent((event: wireEvents.Event) => {
      if (event.type === eventTypes.ERROR) {
        this.reject(event.ref, event as wireEvents.Error);
      } else {
        this.resolve(event.ref, event);
      }
      callback(event);
    });
  }

  private resolve(ref: proto.Ref, event: wireEvents.Event) {
    if (ref && ref in this.promises) {
      this.promises[ref].resolve(event);
      delete this.promises[ref];
    }
  }

  private reject(ref: proto.Ref, error: wireEvents.Error) {
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
  private roomPath = "rooms";

  private wsUrl: string;

  constructor(apiKey: ApiKey, config: ChatConfig, log: Logger) {
    super(log);

    this.authHeaders = [new HeaderValue("X-Api-Key", apiKey)];

    let host = config.hostname + (config.port === "" ? "" : ":" + config.port);
    this.url = [config.protocol, "//", host, "/api"].join("");
    let wsProtocol = config.protocol === "https:" ? "wss:" : "ws:";
    this.wsUrl = [wsProtocol, "//", host, "/ws/", apiKey].join("");
  }

  onEvent(callback: Callback<wireEvents.Event>) {
    super.onEvent((event: wireEvents.Event) => {
      // FIXME Apply this bandaid elsewhere.
      if (event.type === eventTypes.HELLO) {
        this.authHeaders = this.authHeaders.concat(
          new HeaderValue("X-Device-Id", (event as wireEvents.Hello).deviceId)
        );
      }

      callback(event);
    });
  }

  connect() {
    super.connect(this.wsUrl);
  }

  // GroupCall API:
  sendDescription(callId: proto.ID, sessionId: proto.ID, description: wireEvents.SDP) {
    this.send(wireEvents.rtcDescription(callId, sessionId, description));
  }

  sendCandidate(callId: proto.ID, sessionId: proto.ID, candidate: wireEvents.Candidate) {
    this.send(wireEvents.rtcCandidate(callId, sessionId, candidate));
  }

  createCall(sessionIds: Array<proto.ID>): Promise<wireEntities.Call> {
    return this.postAuth<proto.CreateCall, wireEntities.Call>([this.url, this.callPath], proto.createCall(sessionIds));
  }

  createDirectCall(sessionId: proto.ID, timeout?: number): Promise<wireEntities.Call> {
    return this.postAuth<proto.CreateDirectCall, wireEntities.Call>([this.url, this.callPath],
                                                             proto.createDirectCall(sessionId, timeout));
  }

  getCall(callId: proto.ID): Promise<wireEntities.Call> {
    return this.getAuth<wireEntities.Call>([this.url, this.callPath, callId]);
  }

  getCalls(): Promise<Array<wireEntities.Call>> {
    return this.getAuth<Array<wireEntities.Call>>([this.url, this.callPath]);
  }

  getCallHistory(callId: proto.ID): Promise<Array<proto.CallArchivable>> {
    return this.getAuth<Array<proto.CallArchivable>>([this.url, this.callPath, callId, "history"]);
  }

  answerCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "answer"]);
  }

  rejectCall(callId: proto.ID, reason: string): Promise<void> {
    return this.postAuth<proto.LeaveReason, void>([this.url, this.callPath, callId, "reject"],
                                                  proto.leaveReason(reason));
  }

  joinCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "join"]);
  }

  pullCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "pull"]);
  }

  leaveCall(callId: proto.ID, reason: string): Promise<void> {
    return this.postAuth<proto.LeaveReason, void>([this.url, this.callPath, callId, "leave"],
                                                  proto.leaveReason(reason));
  }

  inviteToCall(callId: proto.ID, sessionId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "invite", sessionId]);
  }

  // GroupRoom API:
  createRoom(name: string): Promise<wireEntities.Room> {
    return this.postAuth<proto.CreateRoom, wireEntities.Room>([this.url, this.roomPath], proto.createRoom(name));
  }

  createDirectRoom(sessionId: proto.ID): Promise<wireEntities.Room> {
    return this.postAuth<proto.CreateDirectRoom, wireEntities.Room>([this.url, this.roomPath],
                                                             proto.createDirectRoom(sessionId));
  }

  getRoom(roomId: proto.ID): Promise<wireEntities.Room> {
    return this.getAuth<wireEntities.Room>([this.url, this.roomPath, roomId]);
  }

  getRooms(): Promise<Array<wireEntities.Room>> {
    return this.getAuth<Array<wireEntities.Room>>([this.url, this.roomPath]);
  }

  getRoster(): Promise<Array<wireEntities.Room>> {
    return this.getAuth<Array<wireEntities.Room>>([this.url, this.roomPath, "roster"]);
  }

  getRoomUsers(roomId: proto.ID): Promise<Array<proto.ID>> {
    return this.getAuth<Array<proto.ID>>([this.url, this.roomPath, roomId, "users"]);
  }

  getRoomHistory(roomId: proto.ID): Promise<Array<proto.RoomArchivable>> {
    return this.getAuth<Array<proto.RoomArchivable>>([this.url, this.roomPath, roomId, "history"]);
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

  sendMessage(roomId: proto.ID, body: string): Promise<wireEntities.Message> {
    return this.ask<wireEvents.ChatReceived>(wireEvents.chatRequest(roomId, body)).then((ack) => ack.message);
  }

  sendMetadata(roomId: proto.ID, payload: any): Promise<proto.Metadata> {
    return this.postAuth<any, proto.Metadata>([this.url, this.roomPath, roomId, "metadata"], payload);
  }

  sendMedia(roomId: proto.ID, media: proto.MediaItem): Promise<wireEntities.Media> {
    return this.postAuth<proto.MediaItem, wireEntities.Media>([this.url, this.roomPath, roomId, "media"], media);
  }

  sendTyping(roomId: proto.ID) {
    this.send(wireEvents.startTyping(roomId));
  }

  setMark(roomId: proto.ID, timestamp: proto.Timestamp) {
    this.send(wireEvents.mark(roomId, timestamp));
  }

  // Archivable API:
  setDelivered(archivableId: proto.ID, timestamp: proto.Timestamp) {
    this.send(wireEvents.chatDelivered(archivableId, timestamp));
  }

  updateArchivable(archivable: proto.Archivable, timestamp: proto.Timestamp): Promise<proto.Archivable> {
    return this.postAuth<proto.Archivable, proto.Archivable>([this.url, this.archivePath, archivable.id], archivable);
  }

  // Presence API:
  setStatus(status: wireEvents.Status) {
    this.send(wireEvents.presenceRequest(status));
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
    this.url = [config.protocol, "//", host, "/api"].join("");
  }

  verifySignature(sessionData: SessionData): Promise<AgentContext> {
    return this.post<SessionData, AgentContext>([this.url, this.verifyPath], [], sessionData);
  }
}
