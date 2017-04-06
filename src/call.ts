import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { CallActionSent, CallEnd } from "./protocol/events";
import * as proto from "./protocol/protocol";
import { actionTypes, eventTypes } from "./protocol/wire-events";
import { createRTCPool, RTCPool } from "./rtc";

export interface RemoteStreamCallback {
  (peer: proto.ID, stream: MediaStream): void;
}

export class BaseCall implements proto.Call {
  public id: proto.ID;
  public created: proto.Timestamp;
  public ended: proto.Timestamp;
  public users: Array<proto.ID>;
  public direct: boolean;

  protected api: ArtichokeAPI;
  protected events: EventHandler;

  private log: Logger;
  protected pool: RTCPool;
  private onRemoteStreamCallback: RemoteStreamCallback;
  private onLeftCallback: Callback<proto.CallAction>;
  private onJoinedCallback: Callback<proto.CallAction>;
  protected onInvitedCallback: Callback<proto.CallAction>;
  private onAnsweredCallback: Callback<proto.CallAction>;
  private onRejectedCallback: Callback<proto.CallAction>;
  private onMutedCallback: Callback<proto.CallAction>;
  private onUnmutedCallback: Callback<proto.CallAction>;
  private onPausedCallback: Callback<proto.CallAction>;
  private onUnpausedCallback: Callback<proto.CallAction>;

  constructor(call: proto.Call, config: RTCConfiguration, log: Logger, events: EventHandler,
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
      this.pool.addLocalStream(stream);
    }

    // By default do nothing:
    this.onRemoteStreamCallback = (peer, s) => {
      // Do nothing.
    };

    this.pool.onConnection((peer, rtc) => {
      rtc.onRemoteStream((s) => this.onRemoteStreamCallback(peer, s));
    });

    let nop = (a: proto.CallAction) => {
      // Do nothing.
    };

    this.onLeftCallback = nop;
    this.onJoinedCallback = nop;
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
        this.pool.create(e.action.user).onRemoteStream((s) => this.onRemoteStreamCallback(e.action.user, s));
        this.onJoinedCallback(e.action);
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

  getUsers(): Promise<Array<proto.ID>> {
    return Promise.resolve(this.users);
  }

  getHistory(): Promise<Array<proto.CallArchivable>> {
    return this.api.getCallHistory(this.id);
  }

  answer(stream: MediaStream): Promise<void> {
    this.pool.addLocalStream(stream);
    return this.api.answerCall(this.id);
  }

  reject(reason: string): Promise<void> {
    return this.api.rejectCall(this.id, reason);
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

  onRemoteStream(callback: RemoteStreamCallback) {
    this.onRemoteStreamCallback = callback;
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

  onEnd(callback: Callback<CallEnd>) {
    this.events.onConcreteEvent(eventTypes.CALL_END, this.id, (e: CallEnd) => {
      this.ended = e.timestamp;
      callback(e);
    });
  }
}

export class DirectCall extends BaseCall {}

export class GroupCall extends BaseCall {
  invite(user: proto.ID): Promise<void> {
    return this.api.inviteToCall(this.id, user);
  }

  join(stream: MediaStream): Promise<void> {
    this.pool.addLocalStream(stream);
    return this.api.joinCall(this.id);
  }

  onInvited(callback: Callback<proto.CallAction>) {
    this.onInvitedCallback = callback;
  }
}

export function createCall(call: proto.Call, config: RTCConfiguration, log: Logger, events: EventHandler,
                           api: ArtichokeAPI, stream?: MediaStream): DirectCall | GroupCall {
  if (call.direct) {
    return new DirectCall(call, config, log, events, api, stream);
  } else {
    return new GroupCall(call, config, log, events, api, stream);
  }
}
