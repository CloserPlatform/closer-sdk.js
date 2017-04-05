import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { eventTypes } from "./protocol/events";
import * as proto from "./protocol/protocol";
import { RichChatDelivered, RichChatEdited } from "./protocol/rich-events";
import { RichMessage } from "./rich";

export class Message implements RichMessage {
  public type: proto.Type = "message"; // NOTE Needed in order to differentiate between different Archivables.
  public id: proto.ID;
  public body: string;
  public user: proto.ID;
  public room: proto.ID;
  public timestamp: proto.Timestamp;
  public delivered: proto.Delivered;
  public edited: proto.Edited;

  private log: Logger;
  private events: EventHandler;
  private api: ArtichokeAPI;

  constructor(message: proto.Message, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.id = message.id;
    this.body = message.body;
    this.user = message.user;
    this.room = message.room;
    this.timestamp = message.timestamp;
    this.delivered = message.delivered;
    this.edited = message.edited;

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
    this.events.onConcreteEvent(eventTypes.CHAT_DELIVERED, this.id, (msg: RichChatDelivered) => {
      this.delivered = {
        user: msg.user,
        timestamp: msg.timestamp
      };
      callback(this);
    });
  }

  edit(body: string) {
    this.body = body;
    let ts = Date.now();
    this.edited = {
      user: "FIXME", // FIXME We don't currently have the sessionId here...
      timestamp: ts
    };
    this.api.updateArchivable(this, ts); // FIXME Actually use the promise.
  }

  onEdit(callback: Callback<Message>) {
    this.events.onConcreteEvent(eventTypes.CHAT_EDITED, this.id, (msg: RichChatEdited) => {
      let m = (msg.archivable as proto.Message);
      this.body = m.body;
      this.edited = m.edited;
      callback(this);
    });
  }

  // TODO markRead, onRead
}

export function createMessage(message: proto.Message, log: Logger, events: EventHandler, api: ArtichokeAPI): Message {
  return new Message(message, log, events, api);
}
