import { RTCConnection, RTCPool } from "./rtc";
import { nop } from "./utils";

class Call {
    constructor(call, artichoke) {
        this.id = call.id;
        this.users = call.users;
        this.direct = call.direct;

        this.log = artichoke.log;
        this.artichoke = artichoke;
        this.localStream = undefined;

        this.pool = new RTCPool(this.id, artichoke);

        // By default do nothing:
        this.onRemoteStreamCallback = nop;

        let _this = this;
        this.pool.onConnection(function(peer, rtc) {
            rtc.onRemoteStream(function(stream) {
                return _this.onRemoteStreamCallback(peer, stream);
            });
            rtc.addStream(_this.localStream);
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
        return Promise(function(resolve, reject) {
            // NOTE No need to retrieve the list if it's cached here.
            resolve(_this.users);
        });
    }

    addLocalStream(stream) {
        this.localStream = stream;
    }

    // FIXME These three ought to use the REST API.
    join(stream) {
        this.addLocalStream(stream);
        this.artichoke.socket.joinCall(this.id);
    }

    invite(user) {
        this.artichoke.socket.inviteToCall(this.id, user);
    }

    leave(reason) {
        this.artichoke.socket.leaveCall(this.id, reason);
        this.pool.destroyAll();
    }

    reject() {
        this.leave("rejected");
    }

    onLeft(callback) {
        this._defineCallback("call_left", callback);
    }

    onJoined(callback) {
        this._defineCallback("call_joined", callback);
    }

    onInvited(callback) {
        this._defineCallback("call_invited", callback);
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
        rtc.addStream(this.localStream);
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

export function createCall(call, artichoke) {
    return new Call(call, artichoke);
}
