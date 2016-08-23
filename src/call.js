import { RTCConnection, RTCPool } from "./rtc";
import { nop } from "./utils";

class Call {
    constructor(call, artichoke) {
        this.id = call.id;
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
    }

    addLocalStream(stream) {
        this.localStream = stream;
    }

    join(stream) {
        this.addLocalStream(stream);
        this.artichoke.socket.joinCall(this.id);
    }

    leave(reason) {
        this.artichoke.socket.leaveCall(this.id, reason);
        this.pool.destroyAll();
    }

    reject() {
        this.leave("rejected");
    }

    onLeft(callback) {
        let _this = this;
        this._defineCallback("call_left", function(msg) {
            _this.pool.destroy(msg.user);
            callback(msg);
        });
    }

    onJoined(callback) {
        let _this = this;
        this._defineCallback("call_joined", function(msg) {
            _this._createRTC(msg.user);
            callback(msg);
        });
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
