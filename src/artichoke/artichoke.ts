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
  private static heartbeatTimeoutMultiplier = 2;
  private heartbeatTimeout?: BumpableTimeout;

  constructor(private artichokeConfig: ChatConfig,
              private logger: Logger,
              private eventHandler: EventHandler,
              private artichokeApi: ArtichokeAPI) {

    eventHandler.onEvent(errorEvents.Error.tag, (e: errorEvents.Error) =>
      this.logger.warn(`Event error not handled: ${e}`));
    eventHandler.onEvent(chatEvents.Received.tag, (e: chatEvents.Received) =>
      this.logger.warn(`Event received not handled: ${e}`));
    eventHandler.onEvent(roomEvents.MessageDelivered.tag, (e: roomEvents.MessageDelivered) =>
      this.logger.warn(`Event message delivered not handled: ${e}`));

    eventHandler.onEvent(serverEvents.Hello.tag, (hello: serverEvents.Hello) => {
      this.clearHeartbeatTimeout();

      this.heartbeatTimeout = new BumpableTimeout(
        hello.heartbeatTimeout * Artichoke.heartbeatTimeoutMultiplier,
        (): void => this.eventHandler.notify(new internalEvents.ServerBecameUnreachable())
      );
    });

    eventHandler.onEvent(serverEvents.OutputHeartbeat.tag, (hb: serverEvents.OutputHeartbeat) => {
      this.artichokeApi.send(new serverCommands.InputHeartbeat(hb.timestamp));
      if (this.heartbeatTimeout) {
        this.heartbeatTimeout.bump();
      }
    });

    eventHandler.onEvent(internalEvents.ServerBecameUnreachable.tag, this.clearHeartbeatTimeout);
  }

  // Callbacks:
  public onConnect(callback: Callback<serverEvents.Hello>): void {
    this.eventHandler.onEvent(serverEvents.Hello.tag, callback);
  }

  public onHeartbeat(callback: Callback<serverEvents.OutputHeartbeat>): void {
    this.eventHandler.onEvent(serverEvents.OutputHeartbeat.tag, callback);
  }

  public onServerUnreachable(callback: Callback<internalEvents.ServerBecameUnreachable>): void {
    this.eventHandler.onEvent(internalEvents.ServerBecameUnreachable.tag, callback);
  }

  public onDisconnect(callback: Callback<internalEvents.WebsocketDisconnected>): void {
    this.eventHandler.onEvent(internalEvents.WebsocketDisconnected.tag, callback);
  }

  public onError(callback: Callback<errorEvents.Error>): void {
    this.eventHandler.onEvent(errorEvents.Error.tag, callback);
  }

  // API:
  public connect(): void {
    this.artichokeApi.onEvent((e: DomainEvent) => {
      this.notify(e);
    });

    this.artichokeApi.connect();
  }

  public disconnect(): void {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
    this.artichokeApi.disconnect();
  }

  // Call API:
  public onCallCreated(callback: Callback<callEvents.Created>): void {
    this.eventHandler.onEvent(callEvents.Created.tag, callback);
  }

  public onCallInvitation(callback: Callback<callEvents.Invited>): void {
    this.eventHandler.onEvent(callEvents.Invited.tag, callback);
  }

  public createCall(stream: MediaStream, users: ReadonlyArray<proto.ID>): Promise<GroupCall> {
    return this.wrapCall(this.artichokeApi.createCall(users), stream) as Promise<GroupCall>; // Trust me.
  }

  public createDirectCall(stream: MediaStream, peer: proto.ID, timeout?: number): Promise<DirectCall> {
    return this.wrapCall(this.artichokeApi.createDirectCall(peer, timeout), stream);
  }

  public getCall(call: proto.ID): Promise<Call> {
    return this.wrapCall(this.artichokeApi.getCall(call));
  }

  public getCalls(): Promise<ReadonlyArray<Call>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getCalls(),
      (call) => createCall(call, this.artichokeConfig.rtc, this.logger, this.eventHandler, this.artichokeApi));
  }

  public getActiveCalls(): Promise<ReadonlyArray<Call>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getActiveCalls(),
      (call) => createCall(call, this.artichokeConfig.rtc, this.logger, this.eventHandler, this.artichokeApi));
  }

  public getCallsWithPendingInvitations(): Promise<ReadonlyArray<Call>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getCallsWithPendingInvitations(),
      (call) => createCall(call, this.artichokeConfig.rtc, this.logger, this.eventHandler, this.artichokeApi));
  }

  // Chat room API:
  public onRoomCreated(callback: Callback<roomEvents.Created>): void {
    this.eventHandler.onEvent(roomEvents.Created.tag, callback);
  }

  public onRoomInvitation(callback: Callback<roomEvents.Invited>): void {
    this.eventHandler.onEvent(roomEvents.Invited.tag, callback);
  }

  public createRoom(name: string): Promise<GroupRoom> {
    return this.wrapRoom(this.artichokeApi.createRoom(name)) as Promise<GroupRoom>; // Trust me.
  }

  public createDirectRoom(peer: proto.ID, context?: proto.Context): Promise<DirectRoom> {
    return this.wrapRoom(this.artichokeApi.createDirectRoom(peer, context));
  }

  public getRoom(room: proto.ID): Promise<Room> {
    return this.wrapRoom(this.artichokeApi.getRoom(room));
  }

  public getRooms(): Promise<ReadonlyArray<Room>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getRooms(),
      (room) => createRoom(room, this.logger, this.eventHandler, this.artichokeApi));
  }

  public getRoster(): Promise<ReadonlyArray<Room>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getRoster(),
      (room) => createRoom(room, this.logger, this.eventHandler, this.artichokeApi));
  }

  public registerForPushNotifications(pushId: proto.ID): Promise<void> {
    return this.artichokeApi.registerForPushNotifications(pushId);
  }

  public unregisterFromPushNotifications(pushId: proto.ID): Promise<void> {
    return this.artichokeApi.unregisterFromPushNotifications(pushId);
  }

  private clearHeartbeatTimeout = (): void => {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
  }

  private notify(event: DomainEvent): void {
    this.eventHandler.notify(event, (e) =>
      this.eventHandler.notify(new errorEvents.Error(`Unhandled event: ${e.tag}`))
    );
  }

  // Utils:
  private wrapCall(promise: Promise<wireEntities.Call>, stream?: MediaStream): Promise<Call> {
    return promise.then((call) =>
      createCall(call, this.artichokeConfig.rtc, this.logger, this.eventHandler, this.artichokeApi, stream));
  }

  private wrapRoom(promise: Promise<wireEntities.Room>): Promise<Room> {
    return promise.then((room) => createRoom(room, this.logger, this.eventHandler, this.artichokeApi));
  }
}
