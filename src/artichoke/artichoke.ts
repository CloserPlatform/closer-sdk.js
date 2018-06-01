import { Call, createCall, DirectCall, GroupCall } from '../call/call';
import { ChatConfig } from '../config/config';
import { Callback, EventHandler } from '../events/events';
import { Logger } from '../logger';
import { serverCommands } from '../protocol/commands/server-command';
import { callEvents } from '../protocol/events/call-events';
import { chatEvents } from '../protocol/events/chat-events';
import { DomainEvent } from '../protocol/events/domain-event';
import { errorEvents } from '../protocol/events/error-events';
import { internalEvents } from '../protocol/events/internal-events';
import { roomEvents } from '../protocol/events/room-events';
import { serverEvents } from '../protocol/events/server-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { createRoom, DirectRoom, GroupRoom, Room } from '../room/room';
import { BumpableTimeout, wrapPromise } from '../utils/utils';
import { ArtichokeAPI } from '../apis/artichoke-api';

export class Artichoke {
  private api: ArtichokeAPI;
  private config: ChatConfig;
  private log: Logger;
  private events: EventHandler;
  private heartbeatTimeout?: BumpableTimeout;

  constructor(config: ChatConfig, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.api = api;
    this.config = config;
    this.log = log;
    this.events = events;

    events.onEvent(errorEvents.Error.tag, (e: errorEvents.Error) => { /* do nothing */ });
    events.onEvent(chatEvents.Received.tag, (e: chatEvents.Received) => { /* do nothing */ });
    events.onEvent(roomEvents.MessageDelivered.tag, (e: roomEvents.MessageDelivered) => { /* do nothing */ });

    events.onEvent(serverEvents.Hello.tag, (hello: serverEvents.Hello) => {
      this.clearHeartbeatTimeout();

      this.heartbeatTimeout = new BumpableTimeout(
        2 * hello.heartbeatTimeout,
        () => this.events.notify(new internalEvents.ServerBecameUnreachable())
      );
    });

    events.onEvent(serverEvents.OutputHeartbeat.tag, (hb: serverEvents.OutputHeartbeat) => {
      this.api.send(new serverCommands.InputHeartbeat(hb.timestamp));
      if (this.heartbeatTimeout) {
        this.heartbeatTimeout.bump();
      }
    });

    events.onEvent(internalEvents.ServerBecameUnreachable.tag, this.clearHeartbeatTimeout);
  }

  // Callbacks:
  onConnect(callback: Callback<serverEvents.Hello>) {
    this.events.onEvent(serverEvents.Hello.tag, callback);
  }

  onHeartbeat(callback: Callback<serverEvents.OutputHeartbeat>) {
    this.events.onEvent(serverEvents.OutputHeartbeat.tag, callback);
  }

  onServerUnreachable(callback: Callback<internalEvents.ServerBecameUnreachable>) {
    this.events.onEvent(internalEvents.ServerBecameUnreachable.tag, callback);
  }

  onDisconnect(callback: Callback<internalEvents.WebsocketDisconnected>) {
    this.events.onEvent(internalEvents.WebsocketDisconnected.tag, callback);
  }

  onError(callback: Callback<errorEvents.Error>) {
    this.events.onEvent(errorEvents.Error.tag, callback);
  }

  // API:
  connect() {
    this.api.onEvent((e: DomainEvent) => {
      this.notify(e);
    });

    this.api.connect();
  }

  disconnect() {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
    this.api.disconnect();
  }

  // Call API:
  onCallCreated(callback: Callback<callEvents.Created>) {
    this.events.onEvent(callEvents.Created.tag, callback);
  }

  onCallInvitation(callback: Callback<callEvents.Invited>) {
    this.events.onEvent(callEvents.Invited.tag, callback);
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

  getActiveCalls(): Promise<Array<Call>> {
    return wrapPromise(this.api.getActiveCalls(),
                      (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
  }

  getCallsWithPendingInvitations(): Promise<Array<Call>> {
    return wrapPromise(this.api.getCallsWithPendingInvitations(),
      (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
  }

  // Chat room API:
  onRoomCreated(callback: Callback<roomEvents.Created>) {
    this.events.onEvent(roomEvents.Created.tag, callback);
  }

  onRoomInvitation(callback: Callback<roomEvents.Invited>) {
    this.events.onEvent(roomEvents.Invited.tag, callback);
  }

  createRoom(name: string): Promise<GroupRoom> {
    return this.wrapRoom(this.api.createRoom(name)) as Promise<GroupRoom>; // Trust me.
  }

  createDirectRoom(peer: proto.ID, context?: proto.Context): Promise<DirectRoom> {
    return this.wrapRoom(this.api.createDirectRoom(peer, context));
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

  registerForPushNotifications(pushId: proto.ID): Promise<void> {
    return this.api.registerForPushNotifications(pushId);
  }

  unregisterFromPushNotifications(pushId: proto.ID): Promise<void> {
    return this.api.unregisterFromPushNotifications(pushId);
  }

  private clearHeartbeatTimeout = (): void => {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
  }

  private notify(event: DomainEvent): void {
    this.events.notify(event, (e) =>
      this.events.notify(new errorEvents.Error('Unhandled event: ' + e.tag))
    );
  }

  // Utils:
  private wrapCall(promise: Promise<wireEntities.Call>, stream?: MediaStream) {
    return promise.then((call) => createCall(call, this.config.rtc, this.log, this.events, this.api, stream));
  }

  private wrapRoom(promise: Promise<wireEntities.Room>) {
    return promise.then((room) => createRoom(room, this.log, this.events, this.api));
  }
}
