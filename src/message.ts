import { API } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { ArchivableWithType, ChatDelivered, Delivered, ID, Message as MSG, Timestamp, Type }  from "./protocol";

export class Message implements MSG, ArchivableWithType {
    public type: Type = "message"; // NOTE Needed in order to differentiate between different Archivables.
    public id: ID;
    public body: string;
    public user: ID;
    public room: ID;
    public timestamp: Timestamp;
    public delivered: Delivered;

    private log: Logger;
    private events: EventHandler;
    private api: API;

    constructor(message: MSG, log: Logger, events: EventHandler, api: API) {
        this.id = message.id;
        this.body = message.body;
        this.user = message.user;
        this.room = message.room;
        this.timestamp = message.timestamp;
        this.delivered = message.delivered;

        this.log = log;
        this.events = events;
        this.api = api;
    }

    markDelivered() {
        if (!this.delivered) {
            let ts = Date.now();

            this.delivered = {
                user: "FIXME", // FIXME We don't currently have the sessionId here...
                timestamp: ts
            };
            this.api.setDelivered(this.id, ts);
        }
    }

    onDelivery(callback: Callback<Message>) {
        let _this = this;
        this.events.onConcreteEvent("chat_delivered", this.id, function(msg: ChatDelivered) {
            _this.delivered = {
                user: msg.user,
                timestamp: msg.timestamp
            };
            callback(_this);
        });
    }

    // TODO markRead, onRead, edit & onEdit
}

export function createMessage(message: MSG, log: Logger, events: EventHandler, api: API): Message {
    return new Message(message, log, events, api);
}
