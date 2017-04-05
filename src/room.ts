import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMedia, Media } from "./media";
import { createMessage, Message } from "./message";
import * as proto from "./protocol";
import {
  RichRoomActionSent, RichRoomMark, RichRoomMedia, RichRoomMessage, RichRoomMetadata,
  RichRoomTyping
} from "./rich-events";
import { wrapPromise } from "./utils";

export namespace roomType {
  export enum RoomType {
    GROUP,
    DIRECT,
    BUSINESS,
  }

  export function isDirect(room: Room): room is DirectRoom {
    return room.roomType === RoomType.DIRECT;
  }

  export function isGroup(room: Room): room is GroupRoom {
    return room.roomType === RoomType.GROUP;
  }

  export function isBusiness(room: Room): room is BusinessRoom {
    return room.roomType === RoomType.BUSINESS;
  }
}

export abstract class Room implements proto.Room {
  public id: proto.ID;
  public name: string;
  public created: proto.Timestamp;
  public users: Array<proto.ID>;
  public direct: boolean;
  public orgId: proto.ID;
  public externalId: string;
  public mark: proto.Timestamp;

  private log: Logger;
  protected events: EventHandler;
  protected api: ArtichokeAPI;

  public abstract readonly roomType: roomType.RoomType;

  constructor(room: proto.Room, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.id = room.id;
    this.name = room.name;
    this.created = room.created;
    this.users = room.users;
    this.direct = room.direct;
    this.orgId = room.orgId;
    this.externalId = room.externalId;
    this.mark = room.mark || 0;
    this.log = log;
    this.events = events;
    this.api = api;
  }

  getHistory(): Promise<Array<proto.RoomArchivable>> {
    return wrapPromise(this.api.getRoomHistory(this.id), (a: proto.RoomArchivable) => {
      switch (a.type) {
      case "media":
        const media = a as proto.Media;
        return createMedia(media, this.log, this.events, this.api);

      case "message":
        const msg = a as proto.Message;
        return createMessage(msg, this.log, this.events, this.api);

      default:
        return a as proto.RoomArchivable;
      }
    });
  }

  getUsers(): Promise<Array<proto.ID>> {
    return this.api.getRoomUsers(this.id);
  }

  getMark(): Promise<number> {
    // NOTE No need to retrieve the list if it's cached here.
    return Promise.resolve(this.mark);
  }

  setMark(timestamp: proto.Timestamp) {
    this.mark = timestamp;
    this.api.setMark(this.id, timestamp);
  }

  send(message: string): Promise<Message> {
    return wrapPromise(this.api.sendMessage(this.id, message),
                       (m) => createMessage(m, this.log, this.events, this.api));
  }

  sendMetadata(payload: any): Promise<proto.Metadata> {
    return this.api.sendMetadata(this.id, payload);
  }

  sendMedia(media: proto.MediaItem): Promise<Media> {
    return wrapPromise(this.api.sendMedia(this.id, media),
                       (m) => createMedia(m, this.log, this.events, this.api));
  }

  indicateTyping() {
    this.api.sendTyping(this.id);
  }

  onMark(callback: Callback<RichRoomMark>) {
    this.events.onConcreteEvent("room_mark", this.id, (mark: RichRoomMark) => {
      this.mark = mark.timestamp;
      callback(mark);
    });
  }

  onMessage(callback: Callback<Message>) {
    this.events.onConcreteEvent("room_message", this.id, (msg: RichRoomMessage) => {
      callback(msg.message);
    });
  }

  onMetadata(callback: Callback<proto.Metadata>) {
    this.events.onConcreteEvent("room_metadata", this.id, (msg: RichRoomMetadata) => callback(msg.metadata));
  }

  onMedia(callback: Callback<Media>) {
    this.events.onConcreteEvent("room_media", this.id, (msg: RichRoomMedia) => {
      callback(msg.media);
    });
  }

  onTyping(callback: Callback<RichRoomTyping>) {
    this.events.onConcreteEvent("room_typing", this.id, callback);
  }
}

export class DirectRoom extends Room {
  public readonly roomType: roomType.RoomType = roomType.RoomType.DIRECT;
}

export class GroupRoom extends Room {
  public readonly roomType: roomType.RoomType = roomType.RoomType.GROUP;

  private onJoinedCallback: Callback<proto.RoomAction>;
  private onLeftCallback: Callback<proto.RoomAction>;
  private onInvitedCallback: Callback<proto.RoomAction>;

  constructor(room: proto.Room, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    super(room, log, events, api);

    const nop = (a: proto.RoomAction) => {
      // Do nothing.
    };
    this.onLeftCallback = nop;
    this.onJoinedCallback = nop;
    this.onInvitedCallback = nop;

    this.events.onConcreteEvent("room_action", this.id, (e: RichRoomActionSent) => {
      switch (e.action.action) {
      case "joined":
        this.users.push(e.action.user);
        this.onJoinedCallback(e.action);
        break;

      case "left":
        this.users = this.users.filter((u) => u !== e.action.user);
        this.onLeftCallback(e.action);
        break;

      case "invited":
        this.onInvitedCallback(e.action);
        break;

      default:
        this.events.raise("Invalid room_action event", e);
      }
    });
  }

  getUsers(): Promise<Array<proto.ID>> {
    // NOTE No need to retrieve the list if it's cached here.
    return Promise.resolve(this.users);
  }

  join(): Promise<void> {
    return this.api.joinRoom(this.id);
  }

  leave(): Promise<void> {
    return this.api.leaveRoom(this.id);
  }

  invite(user: proto.ID): Promise<void> {
    return this.api.inviteToRoom(this.id, user);
  }

  onJoined(callback: Callback<proto.RoomAction>) {
    this.onJoinedCallback = callback;
  }

  onLeft(callback: Callback<proto.RoomAction>) {
    this.onLeftCallback = callback;
  }

  onInvited(callback: Callback<proto.RoomAction>) {
    this.onInvitedCallback = callback;
  }
}

export class BusinessRoom extends GroupRoom {
  public readonly roomType: roomType.RoomType = roomType.RoomType.BUSINESS;
}

export function createRoom(room: proto.Room, log: Logger, events: EventHandler, api: ArtichokeAPI): Room {
  if (room.direct) {
    return new DirectRoom(room, log, events, api);
  } else if (room.orgId) {
    return new BusinessRoom(room, log, events, api);
  } else {
    return new GroupRoom(room, log, events, api);
  }
}
