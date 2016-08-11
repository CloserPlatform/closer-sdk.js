class Call {
    constructor(creator, call, artichoke) {
        this.id = call.id;
        this.users = call.users;
        this.creator = creator;
        this.artichoke = artichoke;
    }

    offer(stream) {
        this.artichoke.rtc.addStream(stream);

        let _this = this;
        this.artichoke.rtc.createOffer()
            .then((offer) => _this.artichoke.socket.sendOffer(_this.id, offer))
            .catch((error) => _this.artichoke.onErrorCallback({"reason": "Offer creation failed.", "error": error}));
    }

    answer(offer, stream) {
        this.artichoke.rtc.addStream(stream);

        let _this = this;
        this.artichoke.rtc.setRemoteDescription("offer", offer.sdp, function(candidate) {
            _this.artichoke.socket.sendCandidate(_this.id, candidate);
        });

        this.artichoke.rtc.createAnswer()
            .then((answer) => _this.artichoke.socket.answerCall(_this.id, answer))
            .catch((error) => _this.artichoke.onErrorCallback({"reason": "Answer creation failed.", "error": error}));
    }

    reject() {
        this.hangup("rejected");
    }

    hangup(reason) {
        this.artichoke.rtc.reconnect();
        this.artichoke.socket.hangupCall(this.id, reason);
    }

    onRemoteStream(callback) {
        this.artichoke.rtc.onRemoteStream(callback);
    }
}

export function createCall(creator, call, artichoke) {
    return new Call(creator, call, artichoke);
}
