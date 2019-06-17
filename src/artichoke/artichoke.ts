// tslint:disable:max-file-line-count
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
import { LoggerFactory } from '../logger/logger-factory';
import { externalEvents } from '../protocol/events/external-events';

export class Artichoke {
  private static heartbeatTimeoutMultiplier = 2;
  private heartbeatTimeout?: BumpableTimeout;

  private serverUnreachableEvent = new Subject<void>();

  private callFactory: CallFactory;
  private roomFactory: RoomFactory;

  constructor(private artichokeApi: ArtichokeAPI,
              loggerFactory: LoggerFactory,
              rtcPoolRepository: RTCPoolRepository) {
    this.callFactory = new CallFactory(loggerFactory, artichokeApi, rtcPoolRepository);
    this.roomFactory = new RoomFactory(loggerFactory, artichokeApi);
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

  // External events API:
  public get allFollowersRemoved$(): Observable<externalEvents.AllFollowersRemoved> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.AllFollowersRemoved.isAllFollowersRemoved));
  }

  public get assigneeChanged$(): Observable<externalEvents.AssigneeChanged> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.AssigneeChanged.isAssigneeChanged));
  }

  public get assigneeRemoved$(): Observable<externalEvents.AssigneeRemoved> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.AssigneeRemoved.isAssigneeRemoved));
  }

  public get conversationSnoozed$(): Observable<externalEvents.ConversationSnoozed> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.ConversationSnoozed.isConversationSnoozed));
  }

  public get conversationStatusChanged$(): Observable<externalEvents.ConversationStatusChanged> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.ConversationStatusChanged.isConversationStatusChanged));
  }

  public get conversationUnsnoozed$(): Observable<externalEvents.ConversationUnsnoozed> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.ConversationUnsnoozed.isConversationUnsnoozed));
  }

  public get followerAdded$(): Observable<externalEvents.FollowerAdded> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.FollowerAdded.isFollowerAdded));
  }

  public get followerRemoved$(): Observable<externalEvents.FollowerRemoved> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.FollowerRemoved.isFollowerRemoved));
  }

  public get guestProfileUpdated$(): Observable<externalEvents.GuestProfileUpdated> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.GuestProfileUpdated.isGuestProfileUpdated));
  }

  public get lastAdviserTimestampSet$(): Observable<externalEvents.LastAdviserTimestampSet> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.LastAdviserTimestampSet.isLastAdviserTimestampSet));
  }

  public get lastAdviserTimestampRemoved$(): Observable<externalEvents.LastAdviserTimestampRemoved> {
    return this.artichokeApi.event$.pipe(
      filter(externalEvents.LastAdviserTimestampRemoved.isLastAdviserTimestampRemoved)
    );
  }

  public get lastMessageUpdated$(): Observable<externalEvents.LastMessageUpdated> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.LastMessageUpdated.isLastMessageUpdated));
  }

  public get meetingCancelled$(): Observable<externalEvents.MeetingCancelled> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.MeetingCancelled.isMeetingCancelled));
  }

  public get meetingRescheduled$(): Observable<externalEvents.MeetingRescheduled> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.MeetingRescheduled.isMeetingRescheduled));
  }

  public get meetingScheduled$(): Observable<externalEvents.MeetingScheduled> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.MeetingScheduled.isMeetingScheduled));
  }

  public get notificationUpcomingMeeting$(): Observable<externalEvents.NotificationUpcomingMeeting> {
    return this.artichokeApi.event$.pipe(
      filter(externalEvents.NotificationUpcomingMeeting.isNotificationUpcomingMeeting));
  }

  public get presenceUpdated$(): Observable<externalEvents.PresenceUpdated> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.PresenceUpdated.isPresenceUpdated));
  }

  public get typingSent$(): Observable<externalEvents.TypingSent> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.TypingSent.isTypingSent));
  }

  public get unreadCountUpdated$(): Observable<externalEvents.UnreadCountUpdated> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.UnreadCountUpdated.isUnreadCountUpdated));
  }

  public get unreadTotalUpdated$(): Observable<externalEvents.UnreadTotalUpdated> {
    return this.artichokeApi.event$.pipe(filter(externalEvents.UnreadTotalUpdated.isUnreadTotalUpdated));
  }

  // tslint:disable-next-line:no-any
  public createCall(tracks: ReadonlyArray<MediaStreamTrack>, users: ReadonlyArray<proto.ID>, metadata?: any):
    Promise<GroupCall> {
    return this.wrapCall(this.artichokeApi.createCall(users, metadata), tracks) as Promise<GroupCall>; // Trust me.
  }

  // tslint:disable-next-line:no-any
  public createDirectCall(tracks:  ReadonlyArray<MediaStreamTrack>, peer: proto.ID, timeout?: number, metadata?: any):
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
  private wrapCall(promise: Promise<wireEntities.Call>, tracks?: ReadonlyArray<MediaStreamTrack>): Promise<Call> {
    return promise.then(call => this.callFactory.create(call, tracks));
  }

  private wrapRoom(promise: Promise<wireEntities.Room>): Promise<Room> {
    return promise.then(room => this.roomFactory.create(room));
  }
}
