import { Logger } from '../logger';
import { callEvents } from '../protocol/events/call-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { CallReason } from '../apis/call-reason';
import { CallType } from './call-type';
import { PeerDataChannelMessage, RemoteTrack, RTCPool } from '../rtc/rtc-pool';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { RTCPoolRepository } from '../rtc/rtc-pool-repository';
import { DataChannelMessage } from '../rtc/data-channel';

export abstract class Call implements wireEntities.Call {
  public readonly id: proto.ID;
  public readonly created: proto.Timestamp;
  public readonly creator: proto.ID;
  public readonly direct: boolean;
  public ended?: proto.Timestamp;
  public users: ReadonlyArray<proto.ID>;
  public orgId?: proto.ID;
  public abstract readonly callType: CallType;
  protected pool: RTCPool;
  protected callEvent = new Subject<callEvents.CallEvent>();

  constructor(call: wireEntities.Call, private logger: Logger,
              protected artichokeApi: ArtichokeAPI, rtcPoolRepository: RTCPoolRepository,
              tracks?: ReadonlyArray<MediaStreamTrack>) {
    this.id = call.id;
    this.created = call.created;
    this.ended = call.ended;
    this.creator = call.creator;
    this.users = call.users;
    this.direct = call.direct;
    this.orgId = call.orgId;

    this.pool = rtcPoolRepository.getRtcPoolInstance(call.id);

    // FIXME - unsubscribe
    this.artichokeApi.event$
      .pipe(filter(callEvents.CallEvent.isCallEvent))
      .pipe(filter(ev => ev.callId === this.id))
      .subscribe(ev => this.callEvent.next(ev));

    // FIXME - unsubscribe
    this.end$.subscribe((e) => this.ended = e.timestamp);
    // FIXME - unsubscribe
    this.activeDevice$.subscribe(_ => this.pool.destroyAllConnections());

    if (tracks) {
      this.addTracks(tracks);
    }

    if (this.creator === this.artichokeApi.sessionId) {
      this.users = [];
      this.setupListeners();
      this.establishRTCWithOldUsers();
    } else {
      this.setupListeners();
    }

    logger.debug(`Created new call object with id: ${this.id}`);
  }

  public addTracks(tracks: ReadonlyArray<MediaStreamTrack>): void {
    tracks.forEach((track) => this.addTrack(track));
  }

  public addTrack(track: MediaStreamTrack): void {
    this.pool.addTrack(track);
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.pool.removeTrack(track);
  }

  public get remoteTrack$(): Observable<RemoteTrack> {
    return this.pool.remoteTrack$;
  }

  public setAnswerOptions(options: RTCAnswerOptions): void {
    this.pool.setAnswerOptions(options);
  }

  public replaceTrackByKind(track: MediaStreamTrack): Promise<void> {
    return this.pool.replaceTrackByKind(track);
  }

  public setOfferOptions(options: RTCOfferOptions): void {
    this.pool.setOfferOptions(options);
  }

  public broadcast(message: DataChannelMessage): void {
    return this.pool.broadcast(message);
  }

  public get message$(): Observable<PeerDataChannelMessage> {
    return this.pool.message$;
  }

  public getUsers(): Promise<ReadonlyArray<proto.ID>> {
    return Promise.resolve(this.users);
  }

  public getMessages(): Promise<ReadonlyArray<callEvents.CallEvent>> {
    return this.artichokeApi.getCallHistory(this.id);
  }

  public answer(tracks: ReadonlyArray<MediaStreamTrack>): Promise<void> {
    this.addTracks(tracks);

    return this.artichokeApi.answerCall(this.id);
  }

  public reject(reason: CallReason): Promise<void> {
    return this.artichokeApi.rejectCall(this.id, reason);
  }

  public pull(tracks: ReadonlyArray<MediaStreamTrack>): Promise<void> {
    this.addTracks(tracks);

    return this.artichokeApi.pullCall(this.id);
  }

  public leave(reason: CallReason): Promise<void> {
    this.pool.destroyAllConnections();

    return this.artichokeApi.leaveCall(this.id, reason);
  }

  public get answered$(): Observable<callEvents.Answered> {
    return this.callEvent.pipe(filter(callEvents.Answered.isAnswered));
  }

  public get rejected$(): Observable<callEvents.Rejected> {
    return this.callEvent.pipe(filter(callEvents.Rejected.isRejected));
  }

  public get left$(): Observable<callEvents.Left> {
    return this.callEvent.pipe(filter(callEvents.Left.isLeft));
  }

  public get offline$(): Observable<callEvents.DeviceOffline> {
    return this.callEvent.pipe(filter(callEvents.DeviceOffline.isDeviceOffline));
  }

  public get online$(): Observable<callEvents.DeviceOnline> {
    return this.callEvent.pipe(filter(callEvents.DeviceOnline.isDeviceOnline));
  }

  public get joined$(): Observable<callEvents.Joined> {
    return this.callEvent.pipe(filter(callEvents.Joined.isJoined));
  }

  public get activeDevice$(): Observable<callEvents.CallHandledOnDevice> {
    return this.callEvent.pipe(filter(callEvents.CallHandledOnDevice.isCallHandledOnDevice));
  }

  public get end$(): Observable<callEvents.Ended> {
    return this.callEvent.pipe(filter(callEvents.Ended.isEnded));
  }

  protected getInvited$(): Observable<callEvents.Invited> {
    return this.callEvent.pipe(filter(callEvents.Invited.isInvited));
  }

  private establishRTCWithOldUsers(): void {
    this.logger.debug('Establishing rtc with existing call old users');
    this.artichokeApi.getCallUsers(this.id).then(users => {
      const oldUsers = users.filter(u => u !== this.artichokeApi.sessionId && !this.users.includes(u));
      oldUsers.forEach(u => this.pool.create(u));
      this.logger.debug(`Old call users count: ${oldUsers.length}`);
      this.users = this.users.concat(oldUsers);
    })
      .catch(err => this.logger.error(`Get call old users failed: ${err}`));
  }

  private setupListeners(): void {
    // FIXME - unsubscribe
    this.joined$.subscribe(joined => {
      this.logger.debug(`Call ${this.id} received joined author ${joined.authorId} creating rtc connection..`);
      this.users = [...this.users, joined.authorId];
      this.pool.create(joined.authorId);
    });

    // FIXME - unsubscribe
    this.left$.subscribe(left => {
      this.users = this.users.filter(u => u !== left.authorId);
      this.pool.destroyConnection(left.authorId);
    });
  }
}
