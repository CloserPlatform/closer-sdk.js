import { API } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { Call as ProtoCall, CallInvited, CallJoined, CallLeft, ID, Timestamp } from "./protocol";
import { createRTCPool, RTCPool } from "./rtc";

export interface RemoteStreamCallback {
    (peer: ID, stream: MediaStream): void;
}

class BaseCall implements ProtoCall {
    public id: ID;
    public created: Timestamp;
    public users: Array<ID>;
    public direct: boolean;

    protected api: API;
    protected events: EventHandler;

    private log: Logger;
    private pool: RTCPool;
    private onRemoteStreamCallback: RemoteStreamCallback;
    private onLeftCallback: Callback<CallLeft>;
    private onJoinedCallback: Callback<CallJoined>;

    constructor(call: ProtoCall, config: RTCConfiguration, log: Logger, events: EventHandler, api: API) {
        this.id = call.id;
        this.created = call.created;
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

        let _this = this;
        this.pool.onConnection(function(peer, rtc) {
            rtc.onRemoteStream((stream) => _this.onRemoteStreamCallback(peer, stream));
        });

        // Signaling callbacks:
        this.events.onConcreteEvent("call_left", this.id, function(msg: CallLeft) {
            _this.users = _this.users.filter((u) => u !== msg.user);
            _this.pool.destroy(msg.user);
            _this.onLeftCallback(msg);
        });

        this.events.onConcreteEvent("call_joined", this.id, function(msg: CallJoined) {
            _this.users.push(msg.user);
            _this.pool.create(msg.user).onRemoteStream((stream) => _this.onRemoteStreamCallback(msg.user, stream));
            _this.onJoinedCallback(msg);
        });
    }

    getUsers(): Promise<Array<ID>> {
        let _this = this;
        return new Promise(function(resolve, reject) {
            // NOTE No need to retrieve the list if it's cached here.
            resolve(_this.users);
        });
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
                           log: Logger, events: EventHandler, api: API): DirectCall | Call {
    if (call.direct) {
        return new DirectCall(call, config, log, events, api);
    } else {
        return new Call(call, config, log, events, api);
    }
}
