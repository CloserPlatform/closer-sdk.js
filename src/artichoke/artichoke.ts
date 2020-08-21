// tslint:disable:max-file-line-count
import { callEvents } from '../protocol/events/call-events';
import { errorEvents } from '../protocol/events/error-events';
import { roomEvents } from '../protocol/events/room-events';
import { serverEvents } from '../protocol/events/server-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { ArtichokeApi } from './artichoke-api';
import { GroupRoom } from '../rooms/group-room';
import { DirectRoom } from '../rooms/direct-room';
import { Room } from '../rooms/room';
import { GroupCall } from '../calls/group-call';
import { DirectCall } from '../calls/direct-call';
import { Call } from '../calls/call';
import { BumpableTimeout } from '../utils/bumpable-timeout';
import { PromiseUtils } from '../utils/promise-utils';
import { merge, Observable, Subject } from 'rxjs';
import {
  delay,
  filter,
  finalize, ignoreElements,
  repeatWhen,
  retryWhen,
  takeUntil,
  tap,
  share,
} from 'rxjs/operators';
import { CallFactory } from '../calls/call-factory';
import { RoomFactory } from '../rooms/room-factory';
import { externalEvents } from '../protocol/events/external-events';
import { LoggerService } from '../logger/logger-service';

export class Artichoke {
  /**
   * Subscribing will connect or preserve another reference to websocket connection.
   * Reconnection is enabled by default - unsubscribe all observers to disable and disconnect.
   */
  public readonly connection$: Observable<serverEvents.Hello>;

  private heartbeatTimeout?: BumpableTimeout;

  private serverUnreachableEvent = new Subject<void>();

  constructor(
    private artichokeApi: ArtichokeApi,
    private callFactory: CallFactory,
    private roomFactory: RoomFactory,
    private loggerService: LoggerService,
    private reconnectDelayMs: number,
    private heartbeatTimeoutMultiplier: number,
  ) {
    // Do not move this as a property accessor, it must be only one object to make rx `share` operator work.
    this.connection$ = merge(
      this.artichokeApi.connection$.pipe(
        filter(serverEvents.OutputHeartbeat.is),
        tap((ev: serverEvents.OutputHeartbeat) => this.handleHeartbeatEvent(ev)),
        ignoreElements(),
      ),
      this.artichokeApi.connection$.pipe(
        filter(serverEvents.Hello.is),
        tap(ev => this.handleHelloEvent(ev)),
      ),
    ).pipe(
      finalize(() => this.handleDisconnect()),
      // On WebSocket error
      retryWhen(errors => errors.pipe(delay(this.reconnectDelayMs))),
      takeUntil(this.serverUnreachableEvent),
      // On WebSocket gracefull close
      repeatWhen(attempts => attempts.pipe(delay(this.reconnectDelayMs))),
      // IMPORTANT
      // Share the observable, so the internal logic would behave like one consistent stream
      // Without this operator, if client subscribes two times, we would have
      // two heartbeats answers and reconnections logic
      share(),
    );
  }

  public get error$(): Observable<errorEvents.Error> {
    return this.artichokeApi.domainEvent$.pipe(filter(errorEvents.Error.isError));
  }

  public get serverUnreachable$(): Observable<void> {
    return this.serverUnreachableEvent.asObservable();
  }

  // Call API:
  public get callCreated$(): Observable<callEvents.Created> {
    return this.artichokeApi.domainEvent$.pipe(filter(callEvents.Created.isCreated));
  }

  public get callInvitation$(): Observable<callEvents.Invited> {
    return this.artichokeApi.domainEvent$.pipe(filter(callEvents.Invited.isInvited));
  }

  // External events API:
  public get allFollowersRemoved$(): Observable<externalEvents.AllFollowersRemoved> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.AllFollowersRemoved.isAllFollowersRemoved));
  }

  public get assigneeChanged$(): Observable<externalEvents.AssigneeChanged> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.AssigneeChanged.isAssigneeChanged));
  }

  public get assigneeRemoved$(): Observable<externalEvents.AssigneeRemoved> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.AssigneeRemoved.isAssigneeRemoved));
  }

  public get conversationSnoozed$(): Observable<externalEvents.ConversationSnoozed> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.ConversationSnoozed.isConversationSnoozed));
  }

  public get conversationStatusChanged$(): Observable<externalEvents.ConversationStatusChanged> {
    return this.artichokeApi.domainEvent$.pipe(
      filter(externalEvents.ConversationStatusChanged.isConversationStatusChanged));
  }

  public get conversationUnsnoozed$(): Observable<externalEvents.ConversationUnsnoozed> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.ConversationUnsnoozed.isConversationUnsnoozed));
  }

  public get followerAdded$(): Observable<externalEvents.FollowerAdded> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.FollowerAdded.isFollowerAdded));
  }

  public get followerRemoved$(): Observable<externalEvents.FollowerRemoved> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.FollowerRemoved.isFollowerRemoved));
  }

  public get guestProfileUpdated$(): Observable<externalEvents.GuestProfileUpdated> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.GuestProfileUpdated.isGuestProfileUpdated));
  }

  public get lastAdviserTimestampSet$(): Observable<externalEvents.LastAdviserTimestampSet> {
    return this.artichokeApi.domainEvent$.pipe(
      filter(externalEvents.LastAdviserTimestampSet.isLastAdviserTimestampSet));
  }

  public get lastAdviserTimestampRemoved$(): Observable<externalEvents.LastAdviserTimestampRemoved> {
    return this.artichokeApi.domainEvent$.pipe(
      filter(externalEvents.LastAdviserTimestampRemoved.isLastAdviserTimestampRemoved)
    );
  }

  public get lastMessageUpdated$(): Observable<externalEvents.LastMessageUpdated> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.LastMessageUpdated.isLastMessageUpdated));
  }

  public get meetingCancelled$(): Observable<externalEvents.MeetingCancelled> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.MeetingCancelled.isMeetingCancelled));
  }

  public get meetingRescheduled$(): Observable<externalEvents.MeetingRescheduled> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.MeetingRescheduled.isMeetingRescheduled));
  }

  public get meetingScheduled$(): Observable<externalEvents.MeetingScheduled> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.MeetingScheduled.isMeetingScheduled));
  }

  public get notificationUpcomingMeeting$(): Observable<externalEvents.NotificationUpcomingMeeting> {
    return this.artichokeApi.domainEvent$.pipe(
      filter(externalEvents.NotificationUpcomingMeeting.isNotificationUpcomingMeeting));
  }

  public get presenceUpdated$(): Observable<externalEvents.PresenceUpdated> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.PresenceUpdated.isPresenceUpdated));
  }

  public get typingSent$(): Observable<externalEvents.TypingSent> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.TypingSent.isTypingSent));
  }

  public get unreadCountUpdated$(): Observable<externalEvents.UnreadCountUpdated> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.UnreadCountUpdated.isUnreadCountUpdated));
  }

  public get unreadTotalUpdated$(): Observable<externalEvents.UnreadTotalUpdated> {
    return this.artichokeApi.domainEvent$.pipe(filter(externalEvents.UnreadTotalUpdated.isUnreadTotalUpdated));
  }

  public createCall(tracks: ReadonlyArray<MediaStreamTrack>, users: ReadonlyArray<proto.ID>, metadata?: proto.Metadata):
    Promise<GroupCall> {
    return this.wrapCall(this.artichokeApi.createCall(users, metadata), tracks) as Promise<GroupCall>; // Trust me.
  }

  public createDirectCall(tracks: ReadonlyArray<MediaStreamTrack>,
    peer: proto.ID, timeout?: number, metadata?: proto.Metadata):
    Promise<DirectCall> {
    return this.wrapCall(this.artichokeApi.createDirectCall(peer, timeout, metadata), tracks);
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
    return this.artichokeApi.domainEvent$.pipe(filter(roomEvents.Created.isCreated));
  }

  public get roomInvitation$(): Observable<roomEvents.Invited> {
    return this.artichokeApi.domainEvent$.pipe(filter(roomEvents.Invited.isInvited));
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

  // Utils:
  private wrapCall(promise: Promise<wireEntities.Call>, tracks?: ReadonlyArray<MediaStreamTrack>): Promise<Call> {
    return promise.then(call => this.callFactory.create(call, tracks));
  }

  private wrapRoom(promise: Promise<wireEntities.Room>): Promise<Room> {
    return promise.then(room => this.roomFactory.create(room));
  }

  private handleHelloEvent(hello: serverEvents.Hello): void {
    this.clearHeartbeatTimeout();

    this.heartbeatTimeout = new BumpableTimeout(
      hello.heartbeatTimeout * this.heartbeatTimeoutMultiplier,
      (): void => {
        this.serverUnreachableEvent.next();
        this.clearHeartbeatTimeout();
      }
    );
  }

  private handleHeartbeatEvent(heartbeat: serverEvents.OutputHeartbeat): void {
    this.loggerService.debug('Received heartbeat, sending answer');
    this.artichokeApi.sendHeartbeat(heartbeat.timestamp);
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.bump();
    }
  }

  private handleDisconnect(): void {
    this.loggerService.info('Disconnected');
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
  }

  private clearHeartbeatTimeout(): void {
    if (this.heartbeatTimeout) {
      this.heartbeatTimeout.clear();
      this.heartbeatTimeout = undefined;
    }
  }
}
