import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import * as proto from "./protocol/protocol";
import { RichChatEdited } from "./protocol/rich-events";
import { eventTypes } from "./protocol/wire-events";
import { RichMedia } from "./rich";

export class Media implements RichMedia {
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
  private events: EventHandler;
  private api: ArtichokeAPI;

  constructor(media: proto.Media, log: Logger, events: EventHandler, api: ArtichokeAPI) {
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
    this.events.onConcreteEvent(eventTypes.CHAT_EDITED, this.id, (msg: RichChatEdited) => {
      let m = (msg.archivable as proto.Media);
      this.description = m.description;
      this.edited = m.edited;
      callback(this);
    });
  }
}

export function createMedia(media: proto.Media, log: Logger, events: EventHandler, api: ArtichokeAPI): Media {
  return new Media(media, log, events, api);
}
