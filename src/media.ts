import { API } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import * as proto from "./protocol";
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
    private api: API;

    constructor(media: proto.Media, log: Logger, events: EventHandler, api: API) {
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
        let _this = this;
        this.events.onConcreteEvent("chat_edited", this.id, function(msg: proto.ChatEdited) {
            let m = (msg.archivable as proto.Media);
            _this.description = m.description;
            _this.edited = m.edited;
            callback(_this);
        });
    }
}

export function createMedia(media: proto.Media, log: Logger, events: EventHandler, api: API): Media {
    return new Media(media, log, events, api);
}
