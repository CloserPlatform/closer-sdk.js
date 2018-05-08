import { ArtichokeAPI, CallReason } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { callEvents } from "./protocol/events/call-events";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import {
  createRTCPool,
  HackedRTCOfferOptions as RTCOfferOptions,
  RemoteStreamCallback,
  RTCAnswerOptions,
  RTCConfig,
  RTCConnectionConstraints,
  RTCPool
} from "./rtc";
import { randomUUID, UUID } from "./utils";

export namespace callType {
  export enum CallType {
    DIRECT,
    GROUP,
    BUSINESS,
  }

  export function isDirect(call: Call): call is DirectCall {
    return call.callType === CallType.DIRECT;
  }

  export function isGroup(call: Call): call is GroupCall {
    return call.callType === CallType.GROUP;
  }

  export function isBusiness(call: Call): call is BusinessCall {
    return call.callType === CallType.BUSINESS;
  }
}

export abstract class Call implements wireEntities.Call {
  private readonly uuid: UUID = randomUUID();
  public id: proto.ID;
  public created: proto.Timestamp;
  public ended: proto.Timestamp;
  public creator: proto.ID;
  public users: Array<proto.ID>;
  public direct: boolean;
  public orgId: proto.ID;

  protected api: ArtichokeAPI;
  protected events: EventHandler;

  private log: Logger;
  protected pool: RTCPool;
  private onActiveDeviceCallback: Callback<callEvents.CallHandledOnDevice>;
  private onLeftCallback: Callback<callEvents.Left>;
  private onOfflineCallback: Callback<callEvents.DeviceOffline>;
  private onOnlineCallback: Callback<callEvents.DeviceOnline>;
  private onJoinedCallback: Callback<callEvents.Joined>;
  private onTransferredCallback: Callback<callEvents.CallHandledOnDevice>;
  protected onInvitedCallback: Callback<callEvents.Invited>;
  private onAnsweredCallback: Callback<callEvents.Answered>;
  private onRejectedCallback: Callback<callEvents.Rejected>;

  public abstract readonly callType: callType.CallType;

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
    this.onActiveDeviceCallback = (e: callEvents.CallHandledOnDevice) => { /* Do nothing */ };

    this.events.onConcreteEvent(callEvents.CallHandledOnDevice.tag, this.id, this.uuid,
      (e: callEvents.CallHandledOnDevice) => {
        this.pool.destroyAll();
        this.onActiveDeviceCallback(e);
      });

    this.onLeftCallback = (e: callEvents.Left) => { /* Do nothing */ };
    this.onOfflineCallback = (e: callEvents.DeviceOffline) => { /* Do nothing */ };
    this.onOnlineCallback = (e: callEvents.DeviceOnline) => { /* Do nothing */ };
    this.onJoinedCallback = (e: callEvents.Joined) => { /* Do nothing */ };
    this.onTransferredCallback = (e: callEvents.CallHandledOnDevice) => { /* Do nothing */ };
    this.onInvitedCallback = (e: callEvents.Invited) => { /* Do nothing */ };
    this.onAnsweredCallback = (e: callEvents.Answered) => { /* Do nothing */ };
    this.onRejectedCallback = (e: callEvents.Rejected) => { /* Do nothing */ };

    if (this.creator === this.api.sessionId) {
      this.users = [];
      this.setupListeners();
      this.establishRTCWithOldUsers();
    } else {
      this.setupListeners();
    }
  }

  private establishRTCWithOldUsers() {
    this.api.getCallUsers(this.id).then((users) => {
      const oldUsers = users.filter((u) => u !== this.api.sessionId && !this.users.includes(u));
      oldUsers.forEach((u) => this.pool.create(u));
      this.users = this.users.concat(oldUsers);
    });
  }

  private setupListeners() {
    this.events.onConcreteEvent(callEvents.Joined.tag, this.id, this.uuid, (e: callEvents.Joined) => {
      this.users.push(e.authorId);
      this.pool.create(e.authorId);
      this.onJoinedCallback(e);
    });
    this.events.onConcreteEvent(callEvents.CallHandledOnDevice.tag, this.id, this.uuid,
      (e: callEvents.CallHandledOnDevice) => {
        this.pool.destroy(e.authorId);
        this.pool.create(e.authorId);
        this.onTransferredCallback(e);
      }
    );
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

  addStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => this.addTrack(track, stream));
  }

  removeStream(stream: MediaStream) {
    stream.getTracks().forEach((track) => this.removeTrack(track));
  }

  addTrack(track: MediaStreamTrack, stream?: MediaStream) {
    this.pool.addTrack(track, stream);
  }

  removeTrack(track: MediaStreamTrack) {
    this.pool.removeTrack(track);
  }

  onRemoteStream(callback: RemoteStreamCallback) {
    this.pool.onRemoteStream(callback);
  }

  setAnswerOptions(options: RTCAnswerOptions) {
    this.pool.setAnswerOptions(options);
  }

  setOfferOptions(options: RTCOfferOptions) {
    this.pool.setOfferOptions(options);
  }

  setConnectionConstraints(constraints: RTCConnectionConstraints) {
    this.pool.setConnectionConstraints(constraints);
  }

  getUsers(): Promise<Array<proto.ID>> {
    return Promise.resolve(this.users);
  }

  getMessages(): Promise<Array<callEvents.CallEvent>> {
    return this.api.getCallHistory(this.id);
  }

  answer(stream: MediaStream): Promise<void> {
    this.addStream(stream);
    return this.api.answerCall(this.id);
  }

  reject(reason: CallReason): Promise<void> {
    return this.api.rejectCall(this.id, reason);
  }

  pull(stream: MediaStream): Promise<void> {
    this.addStream(stream);
    return this.api.pullCall(this.id);
  }

  leave(reason: CallReason): Promise<void> {
    this.pool.destroyAll();
    return this.api.leaveCall(this.id, reason);
  }

  onAnswered(callback: Callback<callEvents.Answered>) {
    this.onAnsweredCallback = callback;
  }

  onRejected(callback: Callback<callEvents.Rejected>) {
    this.onRejectedCallback = callback;
  }

  onLeft(callback: Callback<callEvents.Left>) {
    this.onLeftCallback = callback;
  }

  onOffline(callback: Callback<callEvents.DeviceOffline>) {
    this.onOfflineCallback = callback;
  }

  onOnline(callback: Callback<callEvents.DeviceOnline>) {
    this.onOnlineCallback = callback;
  }

  onJoined(callback: Callback<callEvents.Joined>) {
    this.onJoinedCallback = callback;
  }

  onTransferred(callback: Callback<callEvents.CallHandledOnDevice>) {
    this.onTransferredCallback = callback;
  }

  onActiveDevice(callback: Callback<callEvents.CallHandledOnDevice>) {
    this.onActiveDeviceCallback = callback;
  }

  onEnd(callback: Callback<callEvents.Ended>) {
    this.events.onConcreteEvent(callEvents.Ended.tag, this.id, this.uuid, (e: callEvents.Ended) => {
      this.ended = e.timestamp;
      callback(e);
    });
  }
}

export class DirectCall extends Call {
  public readonly callType: callType.CallType = callType.CallType.DIRECT;
}

export class GroupCall extends Call {
  public readonly callType: callType.CallType = callType.CallType.GROUP;

  invite(user: proto.ID): Promise<void> {
    return this.api.inviteToCall(this.id, user);
  }

  join(stream: MediaStream): Promise<void> {
    this.addStream(stream);
    return this.api.joinCall(this.id);
  }

  onInvited(callback: Callback<callEvents.Invited>) {
    this.onInvitedCallback = callback;
  }
}

export class BusinessCall extends GroupCall {
  public readonly callType: callType.CallType = callType.CallType.BUSINESS;
}

export function createCall(call: wireEntities.Call, config: RTCConfig, log: Logger, events: EventHandler,
                           api: ArtichokeAPI, stream?: MediaStream): Call {
  if (call.direct) {
    return new DirectCall(call, config, log, events, api, stream);
  } else if (call.orgId) {
    return new BusinessCall(call, config, log, events, api, stream);
  } else {
    return new GroupCall(call, config, log, events, api, stream);
  }
}
