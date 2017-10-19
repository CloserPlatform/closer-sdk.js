import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { ChatDelivered, ChatEdited } from "./protocol/events";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import { Event, eventTypes } from "./protocol/wire-events";

export class Message implements wireEntities.Message {
  public type: proto.Type = "message";
  public id: proto.ID;
  public userId: proto.ID;
  public channel: proto.ID;
  public timestamp: proto.Timestamp;
  public body: string;
  public tag: string;
  public context?: proto.Context;
  public delivered?: proto.Delivered;
  public edited?: proto.Edited;

  private log: Logger;
  private events: EventHandler<Event>;
  private api: ArtichokeAPI;

  constructor(message: wireEntities.Message, log: Logger, events: EventHandler<Event>, api: ArtichokeAPI) {
    this.id = message.id;
    this.body = message.body;
    this.context = message.context;
    this.userId = message.userId;
    this.channel = message.channel;
    this.tag = message.tag;
    this.context = message.context;
    this.timestamp = message.timestamp;
    this.delivered = message.delivered;
    this.edited = message.edited;

    this.log = log;
    this.events = events;
    this.api = api;
  }

  markDelivered(): Promise<void> {
    if (!this.delivered) {
      let ts = Date.now();

      this.delivered = {
        user: "FIXME", // FIXME We don't currently have the sessionId here...
        timestamp: ts
      };
      return this.api.setDelivered(this.id, ts);
    } else {
      return Promise.resolve();
    }
  }

  onDelivery(callback: Callback<Message>) {
    this.events.onConcreteEvent(eventTypes.CHAT_DELIVERED, this.id, (msg: ChatDelivered) => {
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
    this.api.updateMessage(this, ts); // FIXME Actually use the promise.
  }

  onEdit(callback: Callback<Message>) {
    this.events.onConcreteEvent(eventTypes.CHAT_EDITED, this.id, (msg: ChatEdited) => {
      this.body = msg.message.body;
      this.edited = msg.message.edited;
      callback(this);
    });
  }

  // TODO markRead, onRead
}

export function createMessage(message: wireEntities.Message, log: Logger,
                              events: EventHandler<Event>, api: ArtichokeAPI): Message {
  return new Message(message, log, events, api);
}
