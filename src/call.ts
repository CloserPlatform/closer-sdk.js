import { Artichoke } from "./artichoke";
import { Callback } from "./events";
import { Logger } from "./logger";
import { Call as ProtoCall, CallInvited, CallJoined, CallLeft, Event, ID, Type as EventType } from "./protocol";
import { RTCPool } from "./rtc";

export interface RemoteStreamCallback {
    (peer: ID, stream: MediaStream): void;
}

class BaseCall implements ProtoCall {
    public id: ID;
    public users: Array<ID>;
    public direct: boolean;

    protected artichoke: Artichoke;

    private log: Logger;
    private pool: RTCPool;
    private onRemoteStreamCallback: RemoteStreamCallback;

    constructor(call: ProtoCall, artichoke: Artichoke) {
        this.id = call.id;
        this.users = call.users;
        this.direct = call.direct;

        this.log = artichoke.log;
        this.artichoke = artichoke;

        this.pool = new RTCPool(this.id, artichoke);

        // By default do nothing:
        this.onRemoteStreamCallback = function(peer, stream) {
            // Do nothing.
        };

        let _this = this;
        this.pool.onConnection(function(peer, rtc) {
            rtc.onRemoteStream(function(stream) {
                return _this.onRemoteStreamCallback(peer, stream);
            });
        });

        // Signaling callbacks:
        this._defineCallback("call_left", function(msg: CallLeft) {
            _this.users = _this.users.filter((u) => u === msg.user);
            _this.pool.destroy(msg.user);
        });

        this._defineCallback("call_joined", function(msg: CallJoined) {
            _this.users.push(msg.user);
            _this._createRTC(msg.user);
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
        this._defineCallback("call_left", callback);
    }

    onJoined(callback: Callback<CallJoined>) {
        this._defineCallback("call_joined", callback);
    }

    onRemoteStream(callback: RemoteStreamCallback) {
        this.onRemoteStreamCallback = callback;
    }

    _createRTC(user) {
        let rtc = this.pool.create(user);
        let _this = this;
        rtc.onRemoteStream(function(stream) {
            return _this.onRemoteStreamCallback(user, stream);
        });
    }

    _defineCallback(type: EventType, callback: Callback<Event>) {
        // FIXME It would be way better to store a hash of rooms and pick the relevant callback directly.
        let _this = this;
        this.artichoke.onEvent(type, function(msg) {
            if (msg.id === _this.id) {
                _this.log("Running callback " + type + " for call: " + _this.id);
                callback(msg);
            }
        });
    }
}

export class DirectCall extends BaseCall {}

export class Call extends BaseCall {
    invite(user) {
        this.artichoke.rest.inviteToCall(this.id, user);
    }

    onInvited(callback: Callback<CallInvited>) {
        this._defineCallback("call_invited", callback);
    }
}

export function createCall(call: ProtoCall, artichoke: Artichoke): DirectCall | Call {
    if (call.direct) {
        return new DirectCall(call, artichoke);
    } else {
        return new Call(call, artichoke);
    }
}
