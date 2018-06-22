import { Logger } from '../logger';
import { serverCommands } from '../protocol/commands/server-command';
import { callEvents } from '../protocol/events/call-events';
import { errorEvents } from '../protocol/events/error-events';
import { roomEvents } from '../protocol/events/room-events';
import { serverEvents } from '../protocol/events/server-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { GroupRoom } from '../rooms/group-room';
import { DirectRoom } from '../rooms/direct-room';
import { Room } from '../rooms/room';
import { GroupCall } from '../calls/group-call';
import { DirectCall } from '../calls/direct-call';
import { Call } from '../calls/call';
import { BumpableTimeout } from '../utils/bumpable-timeout';
import { PromiseUtils } from '../utils/promise-utils';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';
import { CallFactory } from '../calls/call-factory';
import { RoomFactory } from '../rooms/room-factory';

export class Artichoke {
  private static heartbeatTimeoutMultiplier = 2;
  private heartbeatTimeout?: BumpableTimeout;

  private serverUnreachableEvent = new Subject<void>();

  private callFactory: CallFactory;
  private roomFactory: RoomFactory;

  constructor(private artichokeApi: ArtichokeAPI,
              logger: Logger,
              rtcPoolRepository: RTCPoolRepository) {
    this.callFactory = new CallFactory(logger, artichokeApi, rtcPoolRepository);
    this.roomFactory = new RoomFactory(logger, artichokeApi);
    this.setupHeartbeats();
  }

  // Callbacks:
  public get connect$(): Observable<serverEvents.Hello> {
    return this.artichokeApi.event$.pipe(filter(serverEvents.Hello.is));
  }

  public get heartbeat$(): Observable<serverEvents.OutputHeartbeat> {
    return this.artichokeApi.event$.pipe(filter(serverEvents.OutputHeartbeat.is));
  }

  public get serverUnreachable$(): Observable<void> {
    return this.serverUnreachableEvent;
  }

  public get disconnect$(): Observable<CloseEvent> {
    return this.artichokeApi.disconnect$;
  }

  public get error$(): Observable<errorEvents.Error> {
    return this.artichokeApi.event$.pipe(filter(errorEvents.Error.isError));
  }

  // API:
  public connect(): void {
    return this.artichokeApi.connect();
  }

  public disconnect(): void {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }

    return this.artichokeApi.disconnect();
  }

  // Call API:
  public get callCreated$(): Observable<callEvents.Created> {
    return this.artichokeApi.event$.pipe(filter(callEvents.Created.isCreated));
  }

  public get callInvitation$(): Observable<callEvents.Invited> {
    return this.artichokeApi.event$.pipe(filter(callEvents.Invited.isInvited));
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
    return PromiseUtils.wrapPromise(this.artichokeApi.getCalls(), call => this.callFactory.create(call));
  }

  public getActiveCalls(): Promise<ReadonlyArray<Call>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getActiveCalls(), call => this.callFactory.create(call));
  }

  public getCallsWithPendingInvitations(): Promise<ReadonlyArray<Call>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getCallsWithPendingInvitations(),
        call => this.callFactory.create(call));
  }

  // Chat room API:
  public get roomCreated$(): Observable<roomEvents.Created> {
    return this.artichokeApi.event$.pipe(filter(roomEvents.Created.isCreated));
  }

  public get roomInvitation$(): Observable<roomEvents.Invited> {
    return this.artichokeApi.event$.pipe(filter(roomEvents.Invited.isInvited));
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
    return PromiseUtils.wrapPromise(this.artichokeApi.getRooms(), room => this.roomFactory.create(room));
  }

  public getRoster(): Promise<ReadonlyArray<Room>> {
    return PromiseUtils.wrapPromise(this.artichokeApi.getRoster(), room => this.roomFactory.create(room));
  }

  public registerForPushNotifications(pushId: proto.ID): Promise<void> {
    return this.artichokeApi.registerForPushNotifications(pushId);
  }

  public unregisterFromPushNotifications(pushId: proto.ID): Promise<void> {
    return this.artichokeApi.unregisterFromPushNotifications(pushId);
  }

  private setupHeartbeats = (): void => {
    // FIXME - unsubscribe
    this.artichokeApi.event$.pipe(filter(serverEvents.Hello.is)).subscribe(hello => {
      this.clearHeartbeatTimeout();

      this.heartbeatTimeout = new BumpableTimeout(
        hello.heartbeatTimeout * Artichoke.heartbeatTimeoutMultiplier,
        (): void => this.serverUnreachableEvent.next()
      );
    });

    // FIXME - unsubscribe
    this.artichokeApi.event$.pipe(filter(serverEvents.OutputHeartbeat.is)).subscribe(hb => {
      this.artichokeApi.send(new serverCommands.InputHeartbeat(hb.timestamp));
      if (this.heartbeatTimeout) {
        this.heartbeatTimeout.bump();
      }
    });

    // FIXME - unsubscribe
    this.serverUnreachableEvent.subscribe(this.clearHeartbeatTimeout);
  }

  private clearHeartbeatTimeout = (): void => {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
  }

  // Utils:
  private wrapCall(promise: Promise<wireEntities.Call>, stream?: MediaStream): Promise<Call> {
    return promise.then(call => this.callFactory.create(call, stream));
  }

  private wrapRoom(promise: Promise<wireEntities.Room>): Promise<Room> {
    return promise.then(room => this.roomFactory.create(room));
  }
}
