import { Artichoke } from "./artichoke";
import * as events from "./events";
import { Logger } from "./logger";

class Message implements events.Message { // FIXME A message shouldn't be an Event...
    public type: string = "message";

    public id: events.ID;
    public body: string;
    public sender: events.ID;
    public room: events.ID;
    public timestamp: events.Timestamp;
    public delivered: events.Timestamp;

    private log: Logger;
    private artichoke: Artichoke;

    constructor(message: events.Message, artichoke: Artichoke) {
        this.id = message.id;
        this.body = message.body;
        this.sender = message.sender;
        this.room = message.room;
        this.timestamp = message.timestamp;
        this.delivered = message.delivered;

        this.log = artichoke.log;
        this.artichoke = artichoke;

        if (!(this.sender === artichoke.sessionId || this.delivered)) {
            this.markDelivered();
        }
    }

    onDelivery(callback: events.Callback<events.Event>) {
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

    private markDelivered() {
        this.delivered = Date.now();
        this.artichoke.socket.setDelivered(this.id, this.delivered);
    }
}

export function createMessage(message: events.Message, artichoke: Artichoke): Message {
    return new Message(message, artichoke);
}
