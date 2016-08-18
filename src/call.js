import { RTCConnection } from "./rtc";

class Call {
    constructor(call, artichoke) {
        this.id = call.id;
        this.users = call.users;
        this.log = artichoke.log;
        this.artichoke = artichoke;

        this.connections = {};
    }

    offer(stream) {
        let rtc = this._createRTC("FIXME");

        rtc.addStream(stream);

        let _this = this;
        // FIXME Don't use private artichoke function.
        rtc.createOffer()
            .then((offer) => _this.artichoke.socket.sendOffer(_this.id, offer))
            .catch((error) => _this.artichoke._runCallbacks("error", {"reason": "Offer creation failed.", "error": error}));
    }

    answer(offer, stream) {
        let rtc = this._createRTC("FIXME");

        rtc.addStream(stream);

        let _this = this;
        rtc.setRemoteDescription("offer", offer.sdp, function(candidate) {
            _this.artichoke.socket.sendCandidate(_this.id, candidate);
        });

        // FIXME Don't use private artichoke function.
        rtc.createAnswer()
            .then((answer) => _this.artichoke.socket.answerCall(_this.id, answer))
            .catch((error) => _this.artichoke._runCallbacks("error", {"reason": "Answer creation failed.", "error": error}));
    }

    reject() {
        this.hangup("rejected");
    }

    hangup(reason) {
        this.artichoke.socket.hangupCall(this.id, reason);
        Object.values(this.connections).forEach((c) => c.reconnect());
        this.connections = {};
    }

    onRemoteStream(callback) {
        Object.values(this.connections).forEach((c) => c.onRemoteStream(callback));
    }

    onAnswer(callback) {
        this._defineCallback("call_answer", callback);
    }

    onOffer(callback) {
        this._defineCallback("call_offer", callback);
    }

    onHangup(callback) {
        this._defineCallback("call_hangup", callback);
    }

    _createRTC(user) {
        let rtc = new RTCConnection(this.artichoke.config);

        let _this = this;
        this.artichoke.onEvent("call_candidate", (m) => rtc.addICECandidate(m.candidate));
        this.artichoke.onEvent("call_hangup", function(m) {
            rtc.reconnect();
            delete _this.connections[user];
        });
        this.artichoke.onEvent("call_answer", function(m) {
            rtc.setRemoteDescription("answer", m.sdp, function(candidate) {
                _this.artichoke.socket.sendCandidate(m.id, candidate);
            });
        });

        this.connections[user] = rtc;
        return rtc;
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
