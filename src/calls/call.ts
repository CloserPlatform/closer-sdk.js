import { Logger } from '../logger';
import { callEvents } from '../protocol/events/call-events';
import * as proto from '../protocol/protocol';
import * as wireEntities from '../protocol/wire-entities';
import { randomUUID, UUID } from '../utils/utils';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { CallReason } from '../apis/call-reason';
import { CallType } from './call-type';
import { Callback, EventHandler } from '../events/event-handler';
import { RTCPool } from '../rtc/rtc-pool';
import { createRTCPool } from '../rtc/create-rtc-pool';
import { RTCConfig } from '../rtc/rtc-config';
import { RemoteStreamCallback } from '../rtc/remote-stream-callback';
import { RTCAnswerOptions } from '../rtc/rtc-answer-options';
import { RTCConnectionConstraints } from '../rtc/rtc-connection-constraints';
import { HackedRTCOfferOptions } from '../rtc/hacked-rtc-offer-options';

export abstract class Call implements wireEntities.Call {
  public id: proto.ID;
  public created: proto.Timestamp;
  public ended: proto.Timestamp;
  public creator: proto.ID;
  public users: Array<proto.ID>;
  public direct: boolean;
  public orgId: proto.ID;
  public abstract readonly callType: CallType;

  protected api: ArtichokeAPI;
  protected events: EventHandler;
  protected onInvitedCallback: Callback<callEvents.Invited>;
  protected pool: RTCPool;

  private log: Logger;
  private onActiveDeviceCallback: Callback<callEvents.CallHandledOnDevice>;
  private onLeftCallback: Callback<callEvents.Left>;
  private onOfflineCallback: Callback<callEvents.DeviceOffline>;
  private onOnlineCallback: Callback<callEvents.DeviceOnline>;
  private onJoinedCallback: Callback<callEvents.Joined>;
  private onTransferredCallback: Callback<callEvents.CallHandledOnDevice>;
  private onAnsweredCallback: Callback<callEvents.Answered>;
  private onRejectedCallback: Callback<callEvents.Rejected>;

  private readonly uuid: UUID = randomUUID();

  constructor(call: wireEntities.Call, config: RTCConfig, log: Logger, events: EventHandler,
              api: ArtichokeAPI, stream?: MediaStream) {
    this.id = call.id;
    this.created = call.created;
    this.ended = call.ended;
    this.creator = call.creator;
    this.users = call.users;
    this.direct = call.direct;
    this.orgId = call.orgId;

    this.log = log;
    this.events = events;
    this.api = api;

    this.pool = createRTCPool(this.id, config, log, events, api);

    if (stream) {
      this.addStream(stream);
    }

    // By default do nothing:
    this.onActiveDeviceCallback = (e: callEvents.CallHandledOnDevice): void => { /* Do nothing */
    };

    this.events.onConcreteEvent(callEvents.CallHandledOnDevice.tag, this.id, this.uuid,
      (e: callEvents.CallHandledOnDevice) => {
        this.pool.destroyAll();
        this.onActiveDeviceCallback(e);
      });

    this.onLeftCallback = (e: callEvents.Left): void => { /* Do nothing */
    };
    this.onOfflineCallback = (e: callEvents.DeviceOffline): void => { /* Do nothing */
    };
    this.onOnlineCallback = (e: callEvents.DeviceOnline): void => { /* Do nothing */
    };
    this.onJoinedCallback = (e: callEvents.Joined): void => { /* Do nothing */
    };
    this.onInvitedCallback = (e: callEvents.Invited): void => { /* Do nothing */
    };
    this.onAnsweredCallback = (e: callEvents.Answered): void => { /* Do nothing */
    };
    this.onRejectedCallback = (e: callEvents.Rejected): void => { /* Do nothing */
    };

    if (this.creator === this.api.sessionId) {
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

  public setOfferOptions(options: HackedRTCOfferOptions): void {
    this.pool.setOfferOptions(options);
  }

  public setConnectionConstraints(constraints: RTCConnectionConstraints): void {
    this.pool.setConnectionConstraints(constraints);
  }

  public getUsers(): Promise<Array<proto.ID>> {
    return Promise.resolve(this.users);
  }

  public getMessages(): Promise<Array<callEvents.CallEvent>> {
    return this.api.getCallHistory(this.id);
  }

  public answer(stream: MediaStream): Promise<void> {
    this.addStream(stream);

    return this.api.answerCall(this.id);
  }

  public reject(reason: CallReason): Promise<void> {
    return this.api.rejectCall(this.id, reason);
  }

  public pull(stream: MediaStream): Promise<void> {
    this.addStream(stream);

    return this.api.pullCall(this.id);
  }

  public leave(reason: CallReason): Promise<void> {
    this.pool.destroyAll();

    return this.api.leaveCall(this.id, reason);
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
    this.events.onConcreteEvent(callEvents.Ended.tag, this.id, this.uuid, (e: callEvents.Ended) => {
      this.ended = e.timestamp;
      callback(e);
    });
  }

  private establishRTCWithOldUsers(): void {
    this.api.getCallUsers(this.id).then((users) => {
      const oldUsers = users.filter((u) => u !== this.api.sessionId && !this.users.includes(u));
      oldUsers.forEach((u) => this.pool.create(u));
      this.users = this.users.concat(oldUsers);
    });
  }

  private setupListeners(): void {
    this.events.onConcreteEvent(callEvents.Joined.tag, this.id, this.uuid, (e: callEvents.Joined) => {
      this.users.push(e.authorId);
      this.pool.create(e.authorId);
      this.onJoinedCallback(e);
    });
    this.events.onConcreteEvent(callEvents.Left.tag, this.id, this.uuid, (e: callEvents.Left) => {
      this.users = this.users.filter((u) => u !== e.authorId);
      this.pool.destroy(e.authorId);
      this.onLeftCallback(e);
    });
    this.events.onConcreteEvent(callEvents.Invited.tag, this.id, this.uuid, (e: callEvents.Invited) => {
      this.onInvitedCallback(e);
    });
    this.events.onConcreteEvent(callEvents.Answered.tag, this.id, this.uuid, (e: callEvents.Answered) => {
      this.onAnsweredCallback(e);
    });
    this.events.onConcreteEvent(callEvents.Rejected.tag, this.id, this.uuid, (e: callEvents.Rejected) => {
      this.onRejectedCallback(e);
    });
    this.events.onConcreteEvent(callEvents.DeviceOffline.tag, this.id, this.uuid, (e: callEvents.DeviceOffline) => {
      this.onOfflineCallback(e);
    });
    this.events.onConcreteEvent(callEvents.DeviceOnline.tag, this.id, this.uuid, (e: callEvents.DeviceOnline) => {
      this.onOnlineCallback(e);
    });
  }
}
