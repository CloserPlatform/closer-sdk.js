import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import * as proto from "./protocol";
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
    let _this = this;
    this.events.onConcreteEvent("chat_delivered", this.id, function(msg: proto.ChatDelivered) {
      _this.delivered = {
        user: msg.user,
        timestamp: msg.timestamp
      };
      callback(_this);
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
    let _this = this;
    this.events.onConcreteEvent("chat_edited", this.id, function(msg: proto.ChatEdited) {
      let m = (msg.archivable as proto.Message);
      _this.body = m.body;
      _this.edited = m.edited;
      callback(_this);
    });
  }

  // TODO markRead, onRead
}

export function createMessage(message: proto.Message, log: Logger, events: EventHandler, api: ArtichokeAPI): Message {
  return new Message(message, log, events, api);
}
