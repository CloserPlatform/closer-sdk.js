import { ArtichokeAPI } from "./api";
import { Call, createCall, DirectCall, GroupCall } from "./call";
import { ChatConfig } from "./config";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import * as events from "./protocol/events";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import * as wireEvents from "./protocol/wire-events";
import { eventTypes } from "./protocol/wire-events";
import { createRoom, DirectRoom, GroupRoom, Room } from "./room";
import { wrapPromise } from "./utils";

export class Artichoke {
  private api: ArtichokeAPI;
  private config: ChatConfig;
  private log: Logger;
  private events: EventHandler;

  constructor(config: ChatConfig, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.api = api;
    this.config = config;
    this.log = log;
    this.events = events;

    // NOTE Disable some events by default.
    let nop = (e: events.Event) => {
      // Do nothing.
    };
    events.onEvent(eventTypes.ERROR, nop);
    events.onEvent(eventTypes.CHAT_RECEIVED, nop);
    events.onEvent(eventTypes.CHAT_DELIVERED, nop);
  }

  // Callbacks:
  onConnect(callback: Callback<events.Hello>) {
    this.events.onEvent(eventTypes.HELLO, callback);
  }

  onHeartbeat(callback: Callback<events.Heartbeat>) {
    this.events.onEvent(eventTypes.HEARTBEAT, callback);
  }

  onDisconnect(callback: Callback<events.Disconnect>) {
    this.events.onEvent(eventTypes.DISCONNECT, callback);
  }

  onError(callback: Callback<events.Error>) {
    this.events.onError(callback);
  }

  // API:
  connect() {
    this.api.onEvent((e: wireEvents.Event) => {
      const richEvent: events.Event = events.eventUtils.upgrade(e, this.config, this.log, this.events, this.api);
      this.events.notify(richEvent);
    });

    this.api.connect();
  }

  disconnect() {
    this.api.disconnect();
  }

  // GroupCall API:
  onCall(callback: Callback<events.CallInvitation>) {
    this.events.onEvent(eventTypes.CALL_INVITATION, callback);
  }

  createCall(stream: MediaStream, users: Array<proto.ID>): Promise<GroupCall> {
    return this.wrapCall(this.api.createCall(users), stream) as Promise<GroupCall>; // Trust me.
  }

  createDirectCall(stream: MediaStream, peer: proto.ID, timeout?: number): Promise<DirectCall> {
    return this.wrapCall(this.api.createDirectCall(peer, timeout), stream);
  }

  getCall(call: proto.ID): Promise<Call> {
    return this.wrapCall(this.api.getCall(call));
  }

  getCalls(): Promise<Array<Call>> {
    return wrapPromise(this.api.getCalls(),
                       (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
  }

  // Chat room API:
  onRoom(callback: Callback<events.RoomInvitation>) {
    this.events.onEvent(eventTypes.ROOM_INVITATION, callback);
  }

  createRoom(name: string): Promise<GroupRoom> {
    return this.wrapRoom(this.api.createRoom(name)) as Promise<GroupRoom>; // Trust me.
  }

  createDirectRoom(peer: proto.ID): Promise<DirectRoom> {
    return this.wrapRoom(this.api.createDirectRoom(peer));
  }

  getRoom(room: proto.ID): Promise<Room> {
    return this.wrapRoom(this.api.getRoom(room));
  }

  getRooms(): Promise<Array<Room>> {
    return wrapPromise(this.api.getRooms(), (room) => createRoom(room, this.log, this.events, this.api));
  }

  getRoster(): Promise<Array<Room>> {
    return wrapPromise(this.api.getRoster(), (room) => createRoom(room, this.log, this.events, this.api));
  }

  // Presence API:
  onStatusUpdate(callback: Callback<events.PresenceUpdate>) {
    this.events.onEvent(eventTypes.PRESENCE_UPDATE, callback);
  }

  setStatus(status: wireEvents.Status): Promise<void> {
    return this.api.setStatus(status);
  }

  // Utils:
  private wrapCall(promise: Promise<wireEntities.Call>, stream?: MediaStream) {
    return promise.then((call) => createCall(call, this.config.rtc, this.log, this.events, this.api, stream));
  }

  private wrapRoom(promise: Promise<wireEntities.Room>) {
    return promise.then((room) => createRoom(room, this.log, this.events, this.api));
  }
}
