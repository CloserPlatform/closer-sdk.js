import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { Call as ProtoCall, CallAction, CallArchivable, ID, Timestamp } from "./protocol/protocol";
import { RichCallActionSent, RichCallEnd } from "./protocol/rich-events";
import { eventTypes } from "./protocol/wire-events";
import { createRTCPool, RTCPool } from "./rtc";

export interface RemoteStreamCallback {
  (peer: ID, stream: MediaStream): void;
}

export class BaseCall implements ProtoCall {
  public id: ID;
  public created: Timestamp;
  public ended: Timestamp;
  public users: Array<ID>;
  public direct: boolean;

  protected api: ArtichokeAPI;
  protected events: EventHandler;

  private log: Logger;
  protected pool: RTCPool;
  private onRemoteStreamCallback: RemoteStreamCallback;
  private onLeftCallback: Callback<CallAction>;
  private onJoinedCallback: Callback<CallAction>;
  protected onInvitedCallback: Callback<CallAction>;
  private onAnsweredCallback: Callback<CallAction>;
  private onRejectedCallback: Callback<CallAction>;
  private onMutedCallback: Callback<CallAction>;
  private onUnmutedCallback: Callback<CallAction>;
  private onPausedCallback: Callback<CallAction>;
  private onUnpausedCallback: Callback<CallAction>;

  constructor(call: ProtoCall, config: RTCConfiguration, log: Logger, events: EventHandler,
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

    let nop = (a: CallAction) => {
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

    this.events.onConcreteEvent(eventTypes.CALL_ACTION, this.id, (e: RichCallActionSent) => {
      switch (e.action.action) {
      case "joined":
        this.users.push(e.action.user);
        this.pool.create(e.action.user).onRemoteStream((s) => this.onRemoteStreamCallback(e.action.user, s));
        this.onJoinedCallback(e.action);
        break;

      case "left":
        this.users = this.users.filter((u) => u !== e.action.user);
        this.pool.destroy(e.action.user);
        this.onLeftCallback(e.action);
        break;

      case "invited":
        this.onInvitedCallback(e.action);
        break;

      case "answered":
        this.onAnsweredCallback(e.action);
        break;

      case "rejected":
        this.onRejectedCallback(e.action);
        break;

      case "audio_muted":
        this.onMutedCallback(e.action);
        break;

      case "audio_unmuted":
        this.onUnmutedCallback(e.action);
        break;

      case "video_paused":
        this.onPausedCallback(e.action);
        break;

      case "video_unpaused":
        this.onUnpausedCallback(e.action);
        break;

      default:
        this.events.raise("Invalid call_action event", e);
      }
    });
  }

  getUsers(): Promise<Array<ID>> {
    return Promise.resolve(this.users);
  }

  getHistory(): Promise<Array<CallArchivable>> {
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

  onAnswered(callback: Callback<CallAction>) {
    this.onAnsweredCallback = callback;
  }

  onRejected(callback: Callback<CallAction>) {
    this.onRejectedCallback = callback;
  }

  onLeft(callback: Callback<CallAction>) {
    this.onLeftCallback = callback;
  }

  onJoined(callback: Callback<CallAction>) {
    this.onJoinedCallback = callback;
  }

  onRemoteStream(callback: RemoteStreamCallback) {
    this.onRemoteStreamCallback = callback;
  }

  onStreamMuted(callback: Callback<CallAction>) {
    this.onMutedCallback = callback;
  }

  onStreamUnmuted(callback: Callback<CallAction>) {
    this.onUnmutedCallback = callback;
  }

  onStreamPaused(callback: Callback<CallAction>) {
    this.onPausedCallback = callback;
  }

  onStreamUnpaused(callback: Callback<CallAction>) {
    this.onUnpausedCallback = callback;
  }

  onEnd(callback: Callback<RichCallEnd>) {
    this.events.onConcreteEvent(eventTypes.CALL_END, this.id, (e: RichCallEnd) => {
      this.ended = e.timestamp;
      callback(e);
    });
  }
}

export class DirectCall extends BaseCall {}

export class Call extends BaseCall {
  invite(user: ID): Promise<void> {
    return this.api.inviteToCall(this.id, user);
  }

  join(stream: MediaStream): Promise<void> {
    this.pool.addLocalStream(stream);
    return this.api.joinCall(this.id);
  }

  onInvited(callback: Callback<CallAction>) {
    this.onInvitedCallback = callback;
  }
}

export function createCall(call: ProtoCall, config: RTCConfiguration, log: Logger, events: EventHandler,
                           api: ArtichokeAPI, stream?: MediaStream): DirectCall | Call {
  if (call.direct) {
    return new DirectCall(call, config, log, events, api, stream);
  } else {
    return new Call(call, config, log, events, api, stream);
  }
}
