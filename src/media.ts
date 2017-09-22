import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { ChatEdited } from "./protocol/events";
import * as proto from "./protocol/protocol";
import { RichEditable } from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import {Event, eventTypes} from "./protocol/wire-events";

export class Media implements wireEntities.Media, RichEditable<string> {
  public type: proto.Type = "media";
  public id: proto.ID;
  public user: proto.ID;
  public room: proto.ID;
  public timestamp: proto.Timestamp;
  public mimeType: string;
  public content: string;
  public description: string;
  public edited: proto.Edited;

  private log: Logger;
  private events: EventHandler<Event>;
  private api: ArtichokeAPI;

  constructor(media: wireEntities.Media, log: Logger, events: EventHandler<Event>, api: ArtichokeAPI) {
    this.id = media.id;
    this.user = media.user;
    this.room = media.room;
    this.timestamp = media.timestamp;
    this.mimeType = media.mimeType;
    this.content = media.content;
    this.description = media.description;
    this.edited = media.edited;

    this.log = log;
    this.events = events;
    this.api = api;
  }

  edit(description: string) {
    this.description = description;
    let ts = Date.now();
    this.edited = {
      user: "FIXME", // FIXME We don't currently have the sessionId here...
      timestamp: ts
    };
    this.api.updateArchivable(this, ts); // FIXME Actually use the promise.
  }

  onEdit(callback: Callback<Media>) {
    this.events.onConcreteEvent(eventTypes.CHAT_EDITED, this.id, (msg: ChatEdited) => {
      let m = (msg.archivable as wireEntities.Media);
      this.description = m.description;
      this.edited = m.edited;
      callback(this);
    });
  }
}

export function createMedia(media: wireEntities.Media, log: Logger,
                            events: EventHandler<Event>, api: ArtichokeAPI): Media {
  return new Media(media, log, events, api);
}
