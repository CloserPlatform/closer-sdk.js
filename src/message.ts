import { Artichoke } from "./artichoke";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { ID, Message as MSG, MessageDelivered, Timestamp }  from "./protocol";

// FIXME A message shouldn't be an Event...
class Message implements MSG {
    public type: string = "message";

    public id: ID;
    public body: string;
    public sender: ID;
    public room: ID;
    public timestamp: Timestamp;
    public delivered: Timestamp;

    private log: Logger;
    private events: EventHandler;
    private artichoke: Artichoke;

    constructor(message: MSG, log: Logger, events: EventHandler, artichoke: Artichoke) {
        this.id = message.id;
        this.body = message.body;
        this.sender = message.sender;
        this.room = message.room;
        this.timestamp = message.timestamp;
        this.delivered = message.delivered;

        this.log = log;
        this.events = events;
        this.artichoke = artichoke;

        if (!(this.sender === artichoke.sessionId || this.delivered)) {
            this.markDelivered();
        }
    }

    onDelivery(callback: Callback<MessageDelivered>) {
        let _this = this;
        this.events.onConcreteEvent("msg_delivered", this.id, function(msg: MessageDelivered) {
            _this.delivered = msg.timestamp;
            callback(_this);
        });
    }

    // TODO markRead, onRead, edit & onEdit

    private markDelivered() {
        this.delivered = Date.now();
        this.artichoke.socket.setDelivered(this.id, this.delivered);
    }
}

export function createMessage(message: MSG, log: Logger, events: EventHandler, api: Artichoke): Message {
    return new Message(message, log, events, api);
}
