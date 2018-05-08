import { ApiHeaders } from "./api-headers";
import { AgentContext, ApiKey, SessionData } from "./auth";
import { ChatConfig, RatelConfig } from "./config";
import { Callback } from "./events";
import { JSONWebSocket } from "./jsonws";
import { Logger } from "./logger";
import { DomainCommand, encoder } from "./protocol/commands/domain-command";
import { roomCommand } from "./protocol/commands/room-commands";
import { rtcCommands } from "./protocol/commands/rtc-commands";
import { callEvents } from "./protocol/events/call-events";
import { chatEvents } from "./protocol/events/chat-events";
import { decoder, DomainEvent } from "./protocol/events/domain-event";
import { errorEvents } from "./protocol/events/error-events";
import { internalEvents } from "./protocol/events/internal-events";
import { roomEvents } from "./protocol/events/room-events";
import { serverEvents } from "./protocol/events/server-events";
import { PushRegistration } from "./protocol/protocol";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
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

  private responseCallback(xhttp: XMLHttpRequest,
                           resolve: PromiseResolve<XMLHttpRequest>,
                           reject: PromiseReject): Thunk {
    return () => {
      if (xhttp.readyState === 4 && (xhttp.status === 200 || xhttp.status === 204)) {
        this.log.debug("OK response: " + xhttp.responseText);
        resolve(xhttp);
      } else if (xhttp.readyState === 4) {
        this.log.debug("Api - responseCallback: Error response: " + xhttp.responseText);
        try {
          const responseError = JSON.parse(xhttp.responseText);
          reject(responseError);
        } catch (err) {
          this.log.debug("Api - responseCallback: Cannot parse error response: " + err +
            "\n Tried to parse: " + xhttp.responseText);
          reject(("Cannot parse Error response: " + err + "\nError response: " + xhttp.responseText) as any);
        }
      }

      xhttp.onerror = (err) => {
        reject(new errorEvents.Error("XMLHttpRequest status: " + xhttp.status));
      };
    };
  }

  getRaw<Response>(path: Array<string>, headers?: Array<HeaderValue>): Promise<XMLHttpRequest> {
    return new Promise<XMLHttpRequest>((resolve, reject) => {
      const url = path.join("/");
      this.log.debug("GET " + url);

      const xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = this.responseCallback(xhttp, resolve, reject);
      xhttp.open("GET", url, true);
      (headers || []).forEach((h) => xhttp.setRequestHeader(h.header, h.value));
      xhttp.send();
    });
  }

  get<Response>(path: Array<string>, headers?: Array<HeaderValue>): Promise<Response> {
    return this.getRaw(path, headers).then((resp) => this.parseData(resp));
  }

  postRaw: <Body>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body) => Promise<XMLHttpRequest> =
    this.httpRequestWithBody("POST");

  deleteRaw: <Body>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body) => Promise<XMLHttpRequest> =
    this.httpRequestWithBody("DELETE");

  post<Body, Response>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body): Promise<Response> {
    return this.postRaw(path, headers, body).then((resp) => this.parseData(resp));
  }

  delete<Body, Response>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body): Promise<Response> {
    return this.deleteRaw(path, headers, body).then((resp) => this.parseData(resp));
  }

  private httpRequestWithBody(method: "POST" | "DELETE") {
    return <Body>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body): Promise<XMLHttpRequest> =>
      new Promise<XMLHttpRequest>((resolve, reject) => {
        const url = path.join("/");

        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = this.responseCallback(xhttp, resolve, reject);
        xhttp.open(method, url, true);
        (headers || []).forEach((h) => xhttp.setRequestHeader(h.header, h.value));

        if (body) {
          const json = JSON.stringify(body);
          this.log.debug(method + url + ": " + json);
          xhttp.setRequestHeader("Content-Type", "application/json");
          xhttp.send(json);
        } else {
          this.log.debug(method + url);
          xhttp.send();
        }
      });
  }

  private parseData(resp: XMLHttpRequest) {
    if (resp.status === 204) {
      return resp.responseText;
    }
    try {
      return JSON.parse(resp.responseText);
    } catch (err) {
      this.log.debug("Api - parseData: Cannot parse response: " + err
        + "\n Tried to parse: " + resp.responseText);
      return resp.responseText;
    }
  }

}

export interface PromiseResolve<T> extends Callback<T | PromiseLike<T>> {
}

export interface PromiseReject extends Callback<errorEvents.Error> {
}

interface PromiseFunctions {
  resolve: PromiseResolve<DomainEvent>;
  reject: PromiseReject;
}

export class APIWithWebsocket extends RESTfulAPI {
  private socket: JSONWebSocket;
  private promises: { [ref: string]: PromiseFunctions };

  constructor(log: Logger) {
    super(log);
    this.promises = {};
    this.socket = new JSONWebSocket(this.log, encoder, decoder);
  }

  connect(url: string) {
    this.socket.connect(url);
  }

  disconnect() {
    this.socket.disconnect();
  }

  send(command: DomainCommand): Promise<void> {
    return this.socket.send(command);
  }

  ask<Response extends DomainEvent>(cmd: roomCommand.SendMessage | roomCommand.SendCustomMessage): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      const ref = "ref" + Date.now(); // FIXME Use UUID instead.
      this.promises[ref] = {
        resolve,
        reject
      };
      cmd.ref = ref;
      this.send(cmd).catch((e) => this.reject(ref, new errorEvents.Error("Ask failed")));
    });
  }

  onEvent(callback: Callback<DomainEvent>) {
    this.socket.onDisconnect((ev) =>
      callback(new internalEvents.WebsocketDisconnected(ev.code, ev.reason))
    );

    this.socket.onError((ev) =>
      callback(new errorEvents.Error("Websocket connection error." + ev))
    );

    this.socket.onEvent((event: DomainEvent) => {
      if (errorEvents.isError(event)) {
        this.reject((event as any).ref, event);
      } else {
        this.resolve((event as any).ref, event);
      }
      callback(event);
    });
  }

  private resolve(ref: proto.Ref, event: DomainEvent) {
    if (ref && ref in this.promises) {
      this.promises[ref].resolve(event);
      delete this.promises[ref];
    }
  }

  private reject(ref: proto.Ref, error: errorEvents.Error) {
    if (ref && ref in this.promises) {
      this.promises[ref].reject(error);
      delete this.promises[ref];
    }
  }
}

export enum CallReason {
  Terminated = "terminated",
  Timeout = "timeout",
  Ended = "ended",
  Hangup = "hangup",
  ConnectionDropped = "connection_dropped",
  Disconnected = "disconnected",
  CallRejected = "rejected",
  Busy = "busy"
}

export class ArtichokeAPI extends APIWithWebsocket {
  public sessionId: proto.ID;

  private deviceId: proto.ID;

  protected url: string;
  private archivePath = "archive/items";
  private callPath = "calls";
  private roomPath = "rooms";
  private pushNotifsPath = "push";

  private wsUrl: string;

  private apiHeaders: ApiHeaders = new ApiHeaders();

  constructor(sessionId: proto.ID, apiKey: ApiKey, config: ChatConfig, log: Logger) {
    super(log);

    this.sessionId = sessionId;
    this.apiHeaders.apiKey = apiKey;

    const pathname = config.pathname ? config.pathname : "";

    let host = config.hostname + (config.port === "" ? "" : ":" + config.port);
    this.url = [config.protocol, "//", host, pathname, "/api"].join("");
    let wsProtocol = config.protocol === "https:" ? "wss:" : "ws:";
    this.wsUrl = [wsProtocol, "//", host, pathname, "/ws/", apiKey].join("");
  }

  onEvent(callback: Callback<DomainEvent>) {
    super.onEvent((event: DomainEvent) => {
      // FIXME Apply this bandaid elsewhere.
      if (event.tag === serverEvents.Hello.tag) {
        this.deviceId = (event as serverEvents.Hello).deviceId;
        this.apiHeaders.deviceId = this.deviceId;
      }

      callback(event);
    });
  }

  connect() {
    const url = this.deviceId ? [this.wsUrl, "/reconnect/", this.deviceId].join("") : this.wsUrl;
    super.connect(url);
  }

  // GroupCall API:
  sendDescription(callId: proto.ID, sessionId: proto.ID, description: RTCSessionDescriptionInit): Promise<void> {
    return this.send(new rtcCommands.SendDescription(callId, sessionId, description));
  }

  sendCandidate(callId: proto.ID, sessionId: proto.ID, candidate: RTCIceCandidate): Promise<void> {
    return this.send(new rtcCommands.SendCandidate(callId, sessionId, candidate));
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

  getActiveCalls(): Promise<Array<wireEntities.Call>> {
    return this.getAuth<Array<wireEntities.Call>>([this.url, this.callPath, "active"]);
  }

  getCallsWithPendingInvitations(): Promise<Array<wireEntities.Call>> {
    return this.getAuth<Array<wireEntities.Call>>([this.url, this.callPath, "pending-invitation"]);
  }

  getCallHistory(callId: proto.ID): Promise<Array<callEvents.CallEvent>> {
    return this.getAuth<Array<callEvents.CallEvent>>([this.url, this.callPath, callId, "history"]);
  }

  getCallUsers(callId: proto.ID): Promise<Array<proto.ID>> {
    return this.getAuth<Array<proto.ID>>([this.url, this.callPath, callId, "users"]);
  }

  answerCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "answer"]);
  }

  rejectCall(callId: proto.ID, reason: CallReason): Promise<void> {
    return this.postAuth<proto.LeaveReason, void>([this.url, this.callPath, callId, "reject"],
      proto.leaveReason(reason));
  }

  joinCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "join"]);
  }

  pullCall(callId: proto.ID): Promise<void> {
    return this.postAuth<void, void>([this.url, this.callPath, callId, "pull"]);
  }

  leaveCall(callId: proto.ID, reason: CallReason): Promise<void> {
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

  createDirectRoom(sessionId: proto.ID, context?: proto.Context): Promise<wireEntities.Room> {
    return this.postAuth<proto.CreateDirectRoom, wireEntities.Room>(
      [this.url, this.roomPath],
      proto.createDirectRoom(sessionId, context)
    );
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

  getRoomHistoryLast(roomId: proto.ID,
                     count: number,
                     filter?: proto.HistoryFilter): Promise<proto.Paginated<roomEvents.RoomEvent>> {
    let endpoint = "history/last?count=" + count;
    if (filter) {
      endpoint += filter.filter.map((tag) => "&filter=" + tag).join("");
      endpoint += filter.customFilter.map((tag) => "&customFilter=" + tag).join("");
    }
    return this.getAuthPaginated<roomEvents.RoomEvent>([this.url, this.roomPath, roomId, endpoint]);
  }

  getRoomHistoryPage(roomId: proto.ID,
                     offset: number,
                     limit: number,
                     filter?: proto.HistoryFilter): Promise<proto.Paginated<roomEvents.RoomEvent>> {
    let endpoint = "history/page?offset=" + offset + "&limit=" + limit;
    if (filter) {
      endpoint += filter.filter.map((tag) => "&filter=" + tag).join("");
      endpoint += filter.customFilter.map((tag) => "&customFilter=" + tag).join("");
    }
    return this.getAuthPaginated<roomEvents.RoomEvent>([this.url, this.roomPath, roomId, endpoint]);
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

  sendMessage(roomId: proto.ID, body: string): Promise<chatEvents.Received> {
    return this.ask<chatEvents.Received>(new roomCommand.SendMessage(roomId, body));
  }

  sendCustom(roomId: proto.ID, body: string, subtag: string,
             context: proto.Context): Promise<chatEvents.Received> {
    return this.ask<chatEvents.Received>(new roomCommand.SendCustomMessage(roomId, body, subtag, context));
  }

  sendTyping(roomId: proto.ID): Promise<void> {
    return this.send(new roomCommand.SendTyping(roomId));
  }

  setMark(roomId: proto.ID, timestamp: proto.Timestamp): Promise<void> {
    return this.send(new roomCommand.SendMark(roomId, timestamp));
  }

  // Archive API:
  setDelivered(roomId: proto.ID, messageId: proto.ID, timestamp: proto.Timestamp): Promise<void> {
    return this.send(new roomCommand.ConfirmMessageDelivery(roomId, messageId, timestamp));
  }

  private getAuth<Response>(path: Array<string>): Promise<Response> {
    return this.get<Response>(path, this.apiHeaders.getHeaders());
  }

  private getAuthPaginated<Item>(path: Array<string>): Promise<proto.Paginated<Item>> {
    return this.getRaw(path, this.apiHeaders.getHeaders())
      .then((resp) => {
        let items;
        try {
          items = JSON.parse(resp.responseText) as Array<Item>;
        } catch (err) {
          this.log.debug("Api - getAuthPaginated: Cannot parse response: " + err
            + "\n Tried to parse: " + resp.responseText);
          throw new Error("Api - getAuthPaginated: Cannot parse response");
        }
        const offset = +resp.getResponseHeader("X-Paging-Offset");
        const limit = +resp.getResponseHeader("X-Paging-Limit");
        return {
          items,
          offset,
          limit
        };
      });
  }

  // Push Notifications API:
  registerForPushNotifications(pushId: proto.ID): Promise<void> {
    return this.postAuth<PushRegistration, void>([this.url, this.pushNotifsPath, "register"],
      proto.pushRegistration(pushId));
  }

  unregisterFromPushNotifications(pushId: proto.ID): Promise<void> {
    return this.deleteAuth([this.url, this.pushNotifsPath, "unregister", pushId]);
  }

  private postAuth<Body, Response>(path, body?: Body): Promise<Response> {
    return this.post<Body, Response>(path, this.apiHeaders.getHeaders(), body);
  }

  private deleteAuth<Body, Response>(path, body?: Body): Promise<Response> {
    return this.delete<Body, Response>(path, this.apiHeaders.getHeaders(), body);
  }

}

export class RatelAPI extends RESTfulAPI {
  private verifyPath = "session/verifySig";
  private url: string;

  constructor(config: RatelConfig, log: Logger) {
    super(log);

    const pathname = config.pathname ? config.pathname : "";

    let host = config.hostname + ":" + config.port;
    this.url = [config.protocol, "//", host, pathname, "/api"].join("");
  }

  verifySignature(sessionData: SessionData): Promise<AgentContext> {
    return this.post<SessionData, AgentContext>([this.url, this.verifyPath], [], sessionData);
  }
}
