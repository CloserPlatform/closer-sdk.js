import { API } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { ID, Message as MSG, MessageDelivered, Timestamp }  from "./protocol";

// FIXME A message shouldn't be an Event...
export class Message implements MSG {
    public type: string = "message";

    public id: ID;
    public body: string;
    public sender: ID;
    public room: ID;
    public timestamp: Timestamp;
    public delivered: Timestamp;

    private log: Logger;
    private events: EventHandler;
    private api: API;

    constructor(message: MSG, log: Logger, events: EventHandler, api: API) {
        this.id = message.id;
        this.body = message.body;
        this.sender = message.sender;
        this.room = message.room;
        this.timestamp = message.timestamp;
        this.delivered = message.delivered;

        this.log = log;
        this.events = events;
        this.api = api;
    }

    markDelivered() {
        if (!this.delivered) {
            this.delivered = Date.now();
            this.api.setDelivered(this.id, this.delivered);
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
}

export function createMessage(message: MSG, log: Logger, events: EventHandler, api: API): Message {
    return new Message(message, log, events, api);
}
