import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { Call as ProtoCall, CallEnd, CallInvited, CallJoined, CallLeft, ID, Timestamp } from "./protocol";
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
  private onLeftCallback: Callback<CallLeft>;
  private onJoinedCallback: Callback<CallJoined>;

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
    this.onLeftCallback = (msg) => {
      // Do nothing.
    };
    this.onJoinedCallback = (msg) => {
      // Do nothing.
    };

    this.pool.onConnection((peer, rtc) => {
      rtc.onRemoteStream((stream) => this.onRemoteStreamCallback(peer, stream));
    });

    // Signaling callbacks:
    this.events.onConcreteEvent("call_left", this.id, (msg: CallLeft) => {
      this.users = this.users.filter((u) => u !== msg.user);
      this.pool.destroy(msg.user);
      this.onLeftCallback(msg);
    });

    this.events.onConcreteEvent("call_joined", this.id, (msg: CallJoined) => {
      this.users.push(msg.user);
      this.pool.create(msg.user).onRemoteStream((stream) => this.onRemoteStreamCallback(msg.user, stream));
      this.onJoinedCallback(msg);
    });
  }

  getUsers(): Promise<Array<ID>> {
    return Promise.resolve(this.users);
  }

  addLocalStream(stream: MediaStream) {
    this.pool.addLocalStream(stream);
  }

  reject(): Promise<void> {
    return this.leave("rejected");
  }

  join(stream: MediaStream): Promise<void> {
    this.addLocalStream(stream);
    return this.api.joinCall(this.id);
  }

  leave(reason: string): Promise<void> {
    this.pool.destroyAll();
    return this.api.leaveCall(this.id, reason);
  }

  onLeft(callback: Callback<CallLeft>) {
    this.onLeftCallback = callback;
  }

  onJoined(callback: Callback<CallJoined>) {
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

  onInvited(callback: Callback<CallInvited>) {
    this.events.onConcreteEvent("call_invited", this.id, callback);
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
