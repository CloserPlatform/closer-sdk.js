import { ChatConfig } from '../config/config';
import { Callback, EventHandler } from '../events/event-handler';
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
import { ArtichokeAPI } from '../apis/artichoke-api';
import { GroupRoom } from '../rooms/group-room';
import { DirectRoom } from '../rooms/direct-room';
import { Room } from '../rooms/room';
import { createRoom } from '../rooms/create-room';
import { GroupCall } from '../calls/group-call';
import { DirectCall } from '../calls/direct-call';
import { Call } from '../calls/call';
import { createCall } from '../calls/create-call';
import { BumpableTimeout } from '../utils/bumpable-timeout';
import { PromiseUtils } from '../utils/promise-utils';

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

    events.onEvent(errorEvents.Error.tag, (e: errorEvents.Error) =>
      this.log.warn('Event error not handled: ' + e));
    events.onEvent(chatEvents.Received.tag, (e: chatEvents.Received) =>
      this.log.warn('Event received not handled: ' + e));
    events.onEvent(roomEvents.MessageDelivered.tag, (e: roomEvents.MessageDelivered) =>
      this.log.warn('Event message delivered not handled: ' + e));

    events.onEvent(serverEvents.Hello.tag, (hello: serverEvents.Hello) => {
      this.clearHeartbeatTimeout();

      this.heartbeatTimeout = new BumpableTimeout(
        hello.heartbeatTimeout * 2,
        (): void => this.events.notify(new internalEvents.ServerBecameUnreachable())
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
  public onConnect(callback: Callback<serverEvents.Hello>): void {
    this.events.onEvent(serverEvents.Hello.tag, callback);
  }

  public onHeartbeat(callback: Callback<serverEvents.OutputHeartbeat>): void {
    this.events.onEvent(serverEvents.OutputHeartbeat.tag, callback);
  }

  public onServerUnreachable(callback: Callback<internalEvents.ServerBecameUnreachable>): void {
    this.events.onEvent(internalEvents.ServerBecameUnreachable.tag, callback);
  }

  public onDisconnect(callback: Callback<internalEvents.WebsocketDisconnected>): void {
    this.events.onEvent(internalEvents.WebsocketDisconnected.tag, callback);
  }

  public onError(callback: Callback<errorEvents.Error>): void {
    this.events.onEvent(errorEvents.Error.tag, callback);
  }

  // API:
  public connect(): void {
    this.api.onEvent((e: DomainEvent) => {
      this.notify(e);
    });

    this.api.connect();
  }

  public disconnect(): void {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
    this.api.disconnect();
  }

  // Call API:
  public onCallCreated(callback: Callback<callEvents.Created>): void {
    this.events.onEvent(callEvents.Created.tag, callback);
  }

  public onCallInvitation(callback: Callback<callEvents.Invited>): void {
    this.events.onEvent(callEvents.Invited.tag, callback);
  }

  public createCall(stream: MediaStream, users: Array<proto.ID>): Promise<GroupCall> {
    return this.wrapCall(this.api.createCall(users), stream) as Promise<GroupCall>; // Trust me.
  }

  public createDirectCall(stream: MediaStream, peer: proto.ID, timeout?: number): Promise<DirectCall> {
    return this.wrapCall(this.api.createDirectCall(peer, timeout), stream);
  }

  public getCall(call: proto.ID): Promise<Call> {
    return this.wrapCall(this.api.getCall(call));
  }

  public getCalls(): Promise<Array<Call>> {
    return PromiseUtils.wrapPromise(this.api.getCalls(),
                       (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
  }

  public getActiveCalls(): Promise<Array<Call>> {
    return PromiseUtils.wrapPromise(this.api.getActiveCalls(),
                      (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
  }

  public getCallsWithPendingInvitations(): Promise<Array<Call>> {
    return PromiseUtils.wrapPromise(this.api.getCallsWithPendingInvitations(),
      (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
  }

  // Chat room API:
  public onRoomCreated(callback: Callback<roomEvents.Created>): void {
    this.events.onEvent(roomEvents.Created.tag, callback);
  }

  public onRoomInvitation(callback: Callback<roomEvents.Invited>): void {
    this.events.onEvent(roomEvents.Invited.tag, callback);
  }

  public createRoom(name: string): Promise<GroupRoom> {
    return this.wrapRoom(this.api.createRoom(name)) as Promise<GroupRoom>; // Trust me.
  }

  public createDirectRoom(peer: proto.ID, context?: proto.Context): Promise<DirectRoom> {
    return this.wrapRoom(this.api.createDirectRoom(peer, context));
  }

  public getRoom(room: proto.ID): Promise<Room> {
    return this.wrapRoom(this.api.getRoom(room));
  }

  public getRooms(): Promise<Array<Room>> {
    return PromiseUtils.wrapPromise(this.api.getRooms(), (room) => createRoom(room, this.log, this.events, this.api));
  }

  public getRoster(): Promise<Array<Room>> {
    return PromiseUtils.wrapPromise(this.api.getRoster(), (room) => createRoom(room, this.log, this.events, this.api));
  }

  public registerForPushNotifications(pushId: proto.ID): Promise<void> {
    return this.api.registerForPushNotifications(pushId);
  }

  public unregisterFromPushNotifications(pushId: proto.ID): Promise<void> {
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
  private wrapCall(promise: Promise<wireEntities.Call>, stream?: MediaStream): Promise<Call> {
    return promise.then((call) => createCall(call, this.config.rtc, this.log, this.events, this.api, stream));
  }

  private wrapRoom(promise: Promise<wireEntities.Room>): Promise<Room> {
    return promise.then((room) => createRoom(room, this.log, this.events, this.api));
  }
}
