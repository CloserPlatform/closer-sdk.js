import { Logger } from '../logger';
import { callEvents } from '../protocol/events/call-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { CallReason } from '../apis/call-reason';
import { CallType } from './call-type';
import { Callback, EventHandler } from '../events/event-handler';
import { RemoteStreamCallback, RTCPool } from '../rtc/rtc-pool';
import { RTCConfig } from '../rtc/rtc-config';
import { RandomUtils, UUID } from '../utils/random-utils';

export abstract class Call implements wireEntities.Call {
  public id: proto.ID;
  public created: proto.Timestamp;
  public ended?: proto.Timestamp;
  public creator: proto.ID;
  public users: ReadonlyArray<proto.ID>;
  public direct: boolean;
  public orgId?: proto.ID;
  public abstract readonly callType: CallType;
  protected onInvitedCallback: Callback<callEvents.Invited>;
  protected pool: RTCPool;

  private logger: Logger;
  private onActiveDeviceCallback: Callback<callEvents.CallHandledOnDevice>;
  private onLeftCallback: Callback<callEvents.Left>;
  private onOfflineCallback: Callback<callEvents.DeviceOffline>;
  private onOnlineCallback: Callback<callEvents.DeviceOnline>;
  private onJoinedCallback: Callback<callEvents.Joined>;
  private onAnsweredCallback: Callback<callEvents.Answered>;
  private onRejectedCallback: Callback<callEvents.Rejected>;

  private readonly uuid: UUID = RandomUtils.randomUUID();

  constructor(call: wireEntities.Call, config: RTCConfig, logger: Logger, private eventHandler: EventHandler,
              protected artichokeApi: ArtichokeAPI, stream?: MediaStream) {
    this.id = call.id;
    this.created = call.created;
    this.ended = call.ended;
    this.creator = call.creator;
    this.users = call.users;
    this.direct = call.direct;
    this.orgId = call.orgId;

    this.pool = new RTCPool(this.id, config, logger, eventHandler, artichokeApi);

    if (stream) {
      this.addStream(stream);
    }

    // By default do nothing:
    this.onActiveDeviceCallback = (e: callEvents.CallHandledOnDevice): void =>
      this.logger.warn(`Event active device not handled: ${e}`);

    this.eventHandler.onConcreteEvent(callEvents.CallHandledOnDevice.tag, this.id, this.uuid,
      (e: callEvents.CallHandledOnDevice) => {
        this.pool.destroyAllConnections();
        this.onActiveDeviceCallback(e);
      });

    this.onLeftCallback = (e: callEvents.Left): void =>
      this.logger.warn(`Event LEFT not handled: ${e}`);
    this.onOfflineCallback = (e: callEvents.DeviceOffline): void =>
      this.logger.warn(`Event DEVICE OFFLINE not handled: ${e}`);
    this.onOnlineCallback = (e: callEvents.DeviceOnline): void =>
      this.logger.warn(`Event DEVICE ONLINE not handled: ${e}`);
    this.onJoinedCallback = (e: callEvents.Joined): void =>
      this.logger.warn(`Event JOIN not handled: ${e}`);
    this.onInvitedCallback = (e: callEvents.Invited): void =>
      this.logger.warn(`Event INVITED not handled: ${e}`);
    this.onAnsweredCallback = (e: callEvents.Answered): void =>
      this.logger.warn(`Event ANSWERED not handled: ${e}`);
    this.onRejectedCallback = (e: callEvents.Rejected): void =>
      this.logger.warn(`Event REJECTED not handled: ${e}`);

    if (this.creator === this.artichokeApi.sessionId) {
      this.users = [];
      this.setupListeners();
      this.establishRTCWithOldUsers();
    } else {
      this.setupListeners();
    }
  }

  public addStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => this.addTrack(track, stream));
  }

  public removeStream(stream: MediaStream): void {
    stream.getTracks().forEach((track) => this.removeTrack(track));
  }

  public addTrack(track: MediaStreamTrack, stream?: MediaStream): void {
    this.pool.addTrack(track, stream);
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.pool.removeTrack(track);
  }

  public onRemoteStream(callback: RemoteStreamCallback): void {
    this.pool.onRemoteStream(callback);
  }

  public setAnswerOptions(options: RTCAnswerOptions): void {
    this.pool.setAnswerOptions(options);
  }

  public setOfferOptions(options: RTCOfferOptions): void {
    this.pool.setOfferOptions(options);
  }

  public getUsers(): Promise<ReadonlyArray<proto.ID>> {
    return Promise.resolve(this.users);
  }

  public getMessages(): Promise<ReadonlyArray<callEvents.CallEvent>> {
    return this.artichokeApi.getCallHistory(this.id);
  }

  public answer(stream: MediaStream): Promise<void> {
    this.addStream(stream);

    return this.artichokeApi.answerCall(this.id);
  }

  public reject(reason: CallReason): Promise<void> {
    return this.artichokeApi.rejectCall(this.id, reason);
  }

  public pull(stream: MediaStream): Promise<void> {
    this.addStream(stream);

    return this.artichokeApi.pullCall(this.id);
  }

  public leave(reason: CallReason): Promise<void> {
    this.pool.destroyAllConnections();

    return this.artichokeApi.leaveCall(this.id, reason);
  }

  public onAnswered(callback: Callback<callEvents.Answered>): void {
    this.onAnsweredCallback = callback;
  }

  public onRejected(callback: Callback<callEvents.Rejected>): void {
    this.onRejectedCallback = callback;
  }

  public onLeft(callback: Callback<callEvents.Left>): void {
    this.onLeftCallback = callback;
  }

  public onOffline(callback: Callback<callEvents.DeviceOffline>): void {
    this.onOfflineCallback = callback;
  }

  public onOnline(callback: Callback<callEvents.DeviceOnline>): void {
    this.onOnlineCallback = callback;
  }

  public onJoined(callback: Callback<callEvents.Joined>): void {
    this.onJoinedCallback = callback;
  }

  public onActiveDevice(callback: Callback<callEvents.CallHandledOnDevice>): void {
    this.onActiveDeviceCallback = callback;
  }

  public onEnd(callback: Callback<callEvents.Ended>): void {
    this.eventHandler.onConcreteEvent(callEvents.Ended.tag, this.id, this.uuid, (e: callEvents.Ended) => {
      this.ended = e.timestamp;
      callback(e);
    });
  }

  private establishRTCWithOldUsers(): void {
    this.artichokeApi.getCallUsers(this.id).then((users) => {
      const oldUsers = users.filter((u) => u !== this.artichokeApi.sessionId && !this.users.includes(u));
      oldUsers.forEach((u) => this.pool.create(u));
      this.users = this.users.concat(oldUsers);
    });
  }

  private setupListeners(): void {
    this.eventHandler.onConcreteEvent(callEvents.Joined.tag, this.id, this.uuid, (e: callEvents.Joined) => {
      this.users = [...this.users, e.authorId];
      this.pool.create(e.authorId);
      this.onJoinedCallback(e);
    });
    this.eventHandler.onConcreteEvent(callEvents.Left.tag, this.id, this.uuid, (e: callEvents.Left) => {
      this.users = this.users.filter((u) => u !== e.authorId);
      this.pool.destroyConnection(e.authorId);
      this.onLeftCallback(e);
    });
    this.eventHandler.onConcreteEvent(callEvents.Invited.tag, this.id, this.uuid, (e: callEvents.Invited) => {
      this.onInvitedCallback(e);
    });
    this.eventHandler.onConcreteEvent(callEvents.Answered.tag, this.id, this.uuid, (e: callEvents.Answered) => {
      this.onAnsweredCallback(e);
    });
    this.eventHandler.onConcreteEvent(callEvents.Rejected.tag, this.id, this.uuid, (e: callEvents.Rejected) => {
      this.onRejectedCallback(e);
    });
    this.eventHandler.onConcreteEvent(callEvents.DeviceOffline.tag, this.id, this.uuid,
      (e: callEvents.DeviceOffline) => {
      this.onOfflineCallback(e);
    });
    this.eventHandler.onConcreteEvent(callEvents.DeviceOnline.tag, this.id, this.uuid, (e: callEvents.DeviceOnline) => {
      this.onOnlineCallback(e);
    });
  }
}
