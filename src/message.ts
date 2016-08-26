class Message {
    id;
    body;
    sender;
    room;
    timestamp;
    delivered;
    log;
    artichoke;

    constructor(message, artichoke) {
        this.id = message.id;
        this.body = message.body;
        this.sender = message.sender;
        this.room = message.room;
        this.timestamp = message.timestamp;
        this.delivered = message.delivered;

        this.log = artichoke.log;
        this.artichoke = artichoke;

        if (!(this.sender === artichoke.sessionId || this.delivered)) {
            this._markDelivered();
        }
    }

    onDelivery(callback) {
        // FIXME This registers a callback for EVERY message ever created. Nope.
        let _this = this;
        this.artichoke.onEvent("msg_delivered", function(msg) {
            if (msg.id === _this.id) {
                _this.log("Running callback msg_delivered for message: " + _this.id);
                _this.delivered = msg.timestamp;
                callback(_this);
            }
        });
    }

    // TODO markRead, onRead, edit & onEdit

    _markDelivered() {
        this.delivered = Date.now();
        this.artichoke.socket.setDelivered(this.id, this.delivered);
    }
}

export function createMessage(message, artichoke) {
    return new Message(message, artichoke);
}
