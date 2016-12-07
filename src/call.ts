import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { Call as ProtoCall, CallAction, CallActionSent, CallEnd, ID, Timestamp } from "./protocol";
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
  private pool: RTCPool;
  private onRemoteStreamCallback: RemoteStreamCallback;
  private onLeftCallback: Callback<CallAction>;
  private onJoinedCallback: Callback<CallAction>;
  protected onInvitedCallback: Callback<CallAction>;
  private onAnsweredCallback: Callback<CallAction>;
  private onRejectedCallback: Callback<CallAction>;

  constructor(call: ProtoCall, config: RTCConfiguration, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.id = call.id;
    this.created = call.created;
    this.ended = call.ended;
    this.users = call.users;
    this.direct = call.direct;

    this.log = log;
    this.events = events;
    this.api = api;

    this.pool = createRTCPool(this.id, config, log, events, api);

    // By default do nothing:
    this.onRemoteStreamCallback = (peer, stream) => {
      // Do nothing.
    };

    let nop = (a: CallAction) => {
      // Do nothing.
    };
    this.onLeftCallback = nop;
    this.onJoinedCallback = nop;
    this.onInvitedCallback = nop;
    this.onAnsweredCallback = nop;
    this.onRejectedCallback = nop;

    this.pool.onConnection((peer, rtc) => {
      rtc.onRemoteStream((stream) => this.onRemoteStreamCallback(peer, stream));
    });

    this.events.onConcreteEvent("call_action", this.id, (e: CallActionSent) => {
      switch (e.action.action) {
      case "joined":
        this.users.push(e.action.user);
        this.pool.create(e.action.user).onRemoteStream((stream) => this.onRemoteStreamCallback(e.action.user, stream));
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

      default:
        this.events.raise("Invalid call_action event", e);
      }
    });
  }

  getUsers(): Promise<Array<ID>> {
    return Promise.resolve(this.users);
  }

  addLocalStream(stream: MediaStream) {
    this.pool.addLocalStream(stream);
  }

  answer(stream: MediaStream): Promise<void> {
    this.addLocalStream(stream);
    return this.api.answerCall(this.id);
  }

  reject(reason: string): Promise<void> {
    return this.api.rejectCall(this.id, reason);
  }

  leave(reason: string): Promise<void> {
    this.pool.destroyAll();
    return this.api.leaveCall(this.id, reason);
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

  onEnd(callback: Callback<CallEnd>) {
    this.events.onConcreteEvent("call_end", this.id, (e: CallEnd) => {
      this.ended = Date.now(); // FIXME Use provided timestamp.
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
    this.addLocalStream(stream);
    return this.api.joinCall(this.id);
  }

  onInvited(callback: Callback<CallAction>) {
    this.onInvitedCallback = callback;
  }
}

export function createCall(call: ProtoCall, config: RTCConfiguration,
                           log: Logger, events: EventHandler, api: ArtichokeAPI): DirectCall | Call {
  if (call.direct) {
    return new DirectCall(call, config, log, events, api);
  } else {
    return new Call(call, config, log, events, api);
  }
}
