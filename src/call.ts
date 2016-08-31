import { Artichoke } from "./artichoke";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { Call as ProtoCall, CallInvited, CallJoined, CallLeft, ID } from "./protocol";
import { RTCPool } from "./rtc";

export interface RemoteStreamCallback {
    (peer: ID, stream: MediaStream): void;
}

class BaseCall implements ProtoCall {
    public id: ID;
    public users: Array<ID>;
    public direct: boolean;

    protected artichoke: Artichoke;
    protected events: EventHandler;

    private log: Logger;
    private pool: RTCPool;
    private onRemoteStreamCallback: RemoteStreamCallback;
    private onLeftCallback: Callback<CallLeft>;
    private onJoinedCallback: Callback<CallJoined>;

    constructor(call: ProtoCall, events: EventHandler, artichoke: Artichoke) {
        this.id = call.id;
        this.users = call.users;
        this.direct = call.direct;

        this.log = artichoke.log;
        this.events = events;
        this.artichoke = artichoke;

        this.pool = new RTCPool(this.id, events, artichoke);

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
            rtc.onRemoteStream(function(stream) {
                return _this.onRemoteStreamCallback(peer, stream);
            });
        });

        // Signaling callbacks:
        this.events.onConcreteEvent("call_left", this.id, function(msg: CallLeft) {
            _this.users = _this.users.filter((u) => u === msg.user);
            _this.pool.destroy(msg.user);
            _this.onLeftCallback(msg);
        });

        this.events.onConcreteEvent("call_joined", this.id, function(msg: CallJoined) {
            _this.users.push(msg.user);
            _this.pool.create(msg.user).onRemoteStream((stream) => _this.onRemoteStreamCallback(msg.user, stream));
            _this.onJoinedCallback(msg);
        });
    }

    getUsers() {
        let _this = this;
        return new Promise(function(resolve, reject) {
            // NOTE No need to retrieve the list if it's cached here.
            resolve(_this.users);
        });
    }

    addLocalStream(stream) {
        this.pool.addLocalStream(stream);
    }

    reject() {
        this.leave("rejected");
    }

    join(stream) {
        this.addLocalStream(stream);
        this.artichoke.rest.joinCall(this.id);
    }

    leave(reason) {
        this.artichoke.rest.leaveCall(this.id, reason);
        this.pool.destroyAll();
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
    invite(user) {
        this.artichoke.rest.inviteToCall(this.id, user);
    }

    onInvited(callback: Callback<CallInvited>) {
        this.events.onConcreteEvent("call_invited", this.id, callback);
    }
}

export function createCall(call: ProtoCall, events: EventHandler, artichoke: Artichoke): DirectCall | Call {
    if (call.direct) {
        return new DirectCall(call, events, artichoke);
    } else {
        return new Call(call, events, artichoke);
    }
}
