import { RTCPool } from "./rtc";
import { nop } from "./utils";

class BaseCall {
    id;
    users;
    direct;

    log;
    artichoke;
    pool;
    onRemoteStreamCallback;

    constructor(call, artichoke) {
        this.id = call.id;
        this.users = call.users;
        this.direct = call.direct;

        this.log = artichoke.log;
        this.artichoke = artichoke;

        this.pool = new RTCPool(this.id, artichoke);

        // By default do nothing:
        this.onRemoteStreamCallback = nop;

        let _this = this;
        this.pool.onConnection(function(peer, rtc) {
            rtc.onRemoteStream(function(stream) {
                return _this.onRemoteStreamCallback(peer, stream);
            });
        });

        // Signaling callbacks:
        this._defineCallback("call_left", function(msg) {
            _this.users = _this.users.filter((u) => u === msg.user);
            _this.pool.destroy(msg.user);
        });

        this._defineCallback("call_joined", function(msg) {
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

    onLeft(callback) {
        this._defineCallback("call_left", callback);
    }

    onJoined(callback) {
        this._defineCallback("call_joined", callback);
    }

    onRemoteStream(callback) {
        this.onRemoteStreamCallback = callback;
    }

    _createRTC(user) {
        let rtc = this.pool.create(user);
        let _this = this;
        rtc.onRemoteStream(function(stream) {
            return _this.onRemoteStreamCallback(user, stream);
        });
    }

    _defineCallback(type, callback) {
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

    onInvited(callback) {
        this._defineCallback("call_invited", callback);
    }
}

export function createCall(call, artichoke) {
    if (call.direct) {
        return new DirectCall(call, artichoke);
    } else {
        return new Call(call, artichoke);
    }
}
