import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { CallActionSent, CallActiveDevice, CallEnd } from "./protocol/events";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import { actionTypes, eventTypes } from "./protocol/wire-events";
import {
  createRTCPool,
  HackedRTCOfferOptions as RTCOfferOptions,
  RemoteStreamCallback,
  RTCAnswerOptions,
  RTCConfig,
  RTCConnectionConstraints,
  RTCPool
} from "./rtc";

export namespace callType {
  export enum CallType {
    DIRECT,
    GROUP,
  }

  export function isDirect(call: Call): call is DirectCall {
    return call.callType === CallType.DIRECT;
  }

  export function isGroup(call: Call): call is GroupCall {
    return call.callType === CallType.GROUP;
  }
}

export abstract class Call implements wireEntities.Call {
  public id: proto.ID;
  public created: proto.Timestamp;
  public ended: proto.Timestamp;
  public users: Array<proto.ID>;
  public direct: boolean;

  protected api: ArtichokeAPI;
  protected events: EventHandler;

  private log: Logger;
  protected pool: RTCPool;
  private onActiveDeviceCallback: Callback<CallActiveDevice>;
  private onLeftCallback: Callback<proto.CallAction>;
  private onJoinedCallback: Callback<proto.CallAction>;
  private onTransferredCallback: Callback<proto.CallAction>;
  protected onInvitedCallback: Callback<proto.CallAction>;
  private onAnsweredCallback: Callback<proto.CallAction>;
  private onRejectedCallback: Callback<proto.CallAction>;
  private onMutedCallback: Callback<proto.CallAction>;
  private onUnmutedCallback: Callback<proto.CallAction>;
  private onPausedCallback: Callback<proto.CallAction>;
  private onUnpausedCallback: Callback<proto.CallAction>;

  public abstract readonly callType: callType.CallType;

  constructor(call: wireEntities.Call, config: RTCConfig, log: Logger, events: EventHandler,
              api: ArtichokeAPI, stream?: MediaStream) {
    this.id = call.id;
    this.created = call.created;
    this.ended = call.ended;
    this.users = call.users;
    this.direct = call.direct;

    this.log = log;
    this.events = events;
    this.api = api;

    this.pool = createRTCPool(this.id, config, log, events, api);

    if (stream) {
      this.addLocalStream(stream);
    }

    // By default do nothing:
    this.onActiveDeviceCallback = (e: CallActiveDevice) => {
      // Do nothing.
    };

    this.events.onConcreteEvent(eventTypes.CALL_ACTIVE_DEVICE, this.id, (e: CallActiveDevice) => {
      this.pool.destroyAll();
      this.onActiveDeviceCallback(e);
    });

    let nop = (a: proto.CallAction) => {
      // Do nothing.
    };

    this.onLeftCallback = nop;
    this.onJoinedCallback = nop;
    this.onTransferredCallback = nop;
    this.onInvitedCallback = nop;
    this.onAnsweredCallback = nop;
    this.onRejectedCallback = nop;
    this.onMutedCallback = nop;
    this.onUnmutedCallback = nop;
    this.onPausedCallback = nop;
    this.onUnpausedCallback = nop;

    this.events.onConcreteEvent(eventTypes.CALL_ACTION, this.id, (e: CallActionSent) => {
      switch (e.action.action) {
        case actionTypes.JOINED:
          this.users.push(e.action.user);
          this.pool.create(e.action.user);
          this.onJoinedCallback(e.action);
          break;

        case actionTypes.TRANSFERRED:
          this.pool.destroy(e.action.user);
          this.pool.create(e.action.user);
          this.onTransferredCallback(e.action);
          break;

        case actionTypes.LEFT:
          this.users = this.users.filter((u) => u !== e.action.user);
          this.pool.destroy(e.action.user);
          this.onLeftCallback(e.action);
          break;

        case actionTypes.INVITED:
          this.onInvitedCallback(e.action);
          break;

        case actionTypes.ANSWERED:
          this.onAnsweredCallback(e.action);
          break;

        case actionTypes.REJECTED:
          this.onRejectedCallback(e.action);
          break;

        case actionTypes.AUDIO_MUTED:
          this.onMutedCallback(e.action);
          break;

        case actionTypes.AUDIO_UNMUTED:
          this.onUnmutedCallback(e.action);
          break;

        case actionTypes.VIDEO_PAUSED:
          this.onPausedCallback(e.action);
          break;

        case actionTypes.VIDEO_UNPAUSED:
          this.onUnpausedCallback(e.action);
          break;

        default:
          this.events.raise("Invalid call_action event", e);
      }
    });
  }

  addTrack(track: MediaStreamTrack, stream?: MediaStream) {
    this.pool.addTrack(track, stream);
  }

  removeTrack(track: MediaStreamTrack) {
    this.pool.removeTrack(track);
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

  getHistory(): Promise<Array<proto.CallArchivable>> {
    return this.api.getCallHistory(this.id);
  }

  answer(stream: MediaStream): Promise<void> {
    this.addLocalStream(stream);
    return this.api.answerCall(this.id);
  }

  reject(reason: string): Promise<void> {
    return this.api.rejectCall(this.id, reason);
  }

  pull(stream: MediaStream): Promise<void> {
    this.addLocalStream(stream);
    return this.api.pullCall(this.id);
  }

  leave(reason: string): Promise<void> {
    this.pool.destroyAll();
    return this.api.leaveCall(this.id, reason);
  }

  mute() {
    this.pool.muteStream();
  }

  unmute() {
    this.pool.unmuteStream();
  }

  pause() {
    this.pool.pauseStream();
  }

  unpause() {
    this.pool.unpauseStream();
  }

  onAnswered(callback: Callback<proto.CallAction>) {
    this.onAnsweredCallback = callback;
  }

  onRejected(callback: Callback<proto.CallAction>) {
    this.onRejectedCallback = callback;
  }

  onLeft(callback: Callback<proto.CallAction>) {
    this.onLeftCallback = callback;
  }

  onJoined(callback: Callback<proto.CallAction>) {
    this.onJoinedCallback = callback;
  }

  onTransferred(callback: Callback<proto.CallAction>) {
    this.onTransferredCallback = callback;
  }

  onRemoteStream(callback: RemoteStreamCallback) {
    this.pool.onRemoteStream(callback);
  }

  onStreamMuted(callback: Callback<proto.CallAction>) {
    this.onMutedCallback = callback;
  }

  onStreamUnmuted(callback: Callback<proto.CallAction>) {
    this.onUnmutedCallback = callback;
  }

  onStreamPaused(callback: Callback<proto.CallAction>) {
    this.onPausedCallback = callback;
  }

  onStreamUnpaused(callback: Callback<proto.CallAction>) {
    this.onUnpausedCallback = callback;
  }

  onActiveDevice(callback: Callback<CallActiveDevice>) {
    this.onActiveDeviceCallback = callback;
  }

  onEnd(callback: Callback<CallEnd>) {
    this.events.onConcreteEvent(eventTypes.CALL_END, this.id, (e: CallEnd) => {
      this.ended = e.timestamp;
      callback(e);
    });
  }

  protected addLocalStream(stream: MediaStream) {
    stream.getTracks().forEach((t) => this.addTrack(t, stream))
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
    this.addLocalStream(stream);
    return this.api.joinCall(this.id);
  }

  onInvited(callback: Callback<proto.CallAction>) {
    this.onInvitedCallback = callback;
  }
}

export function createCall(call: wireEntities.Call, config: RTCConfig, log: Logger, events: EventHandler,
                           api: ArtichokeAPI, stream?: MediaStream): Call {
  if (call.direct) {
    return new DirectCall(call, config, log, events, api, stream);
  } else {
    return new GroupCall(call, config, log, events, api, stream);
  }
}
