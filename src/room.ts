import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMedia, Media } from "./media";
import { createMessage, Message } from "./message";
import * as protoEvents from "./protocol/events";
import * as proto from "./protocol/protocol";
import * as wireEntities from "./protocol/wire-entities";
import { actionTypes, eventTypes } from "./protocol/wire-events";
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

export abstract class Room implements wireEntities.Room {
  public id: proto.ID;
  public name: string;
  public created: proto.Timestamp;
  public users: Array<proto.ID>;
  public direct: boolean;
  public orgId: proto.ID;
  public mark: proto.Timestamp;

  private log: Logger;
  protected events: EventHandler;
  protected api: ArtichokeAPI;

  public abstract readonly roomType: roomType.RoomType;

  constructor(room: wireEntities.Room, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.id = room.id;
    this.name = room.name;
    this.created = room.created;
    this.users = room.users;
    this.direct = room.direct;
    this.orgId = room.orgId;
    this.mark = room.mark || 0;
    this.log = log;
    this.events = events;
    this.api = api;
  }

  getHistory(): Promise<Array<proto.RoomArchivable>> {
    return wrapPromise(this.api.getRoomHistory(this.id), (a: proto.RoomArchivable) => {
      switch (a.type) {
      case "media":
        const media = a as wireEntities.Media;
        return createMedia(media, this.log, this.events, this.api);

      case "message":
        const msg = a as wireEntities.Message;
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

  setMark(timestamp: proto.Timestamp): Promise<void> {
    this.mark = timestamp;
    return this.api.setMark(this.id, timestamp);
  }

  send(message: string, context?: proto.Context): Promise<Message> {
    return this.api.sendMessage(this.id, message, context).then((m) => createMessage(m, this.log,
      this.events, this.api));
  }

  sendMetadata(payload: any): Promise<proto.Metadata> {
    return this.api.sendMetadata(this.id, payload);
  }

  sendMedia(media: proto.MediaItem): Promise<Media> {
    return this.api.sendMedia(this.id, media).then((m) => createMedia(m, this.log, this.events, this.api));
  }

  indicateTyping(): Promise<void> {
    return this.api.sendTyping(this.id);
  }

  onMark(callback: Callback<protoEvents.RoomMark>) {
    this.events.onConcreteEvent(eventTypes.ROOM_MARK, this.id, (mark: protoEvents.RoomMark) => {
      this.mark = mark.timestamp;
      callback(mark);
    });
  }

  onMessage(callback: Callback<Message>) {
    this.events.onConcreteEvent(eventTypes.ROOM_MESSAGE, this.id, (msg: protoEvents.RoomMessage) => {
      callback(msg.message);
    });
  }

  onMetadata(callback: Callback<proto.Metadata>) {
    this.events.onConcreteEvent(eventTypes.ROOM_METADATA, this.id, (msg: protoEvents.RoomMetadata) => {
      callback(msg.metadata);
    });
  }

  onMedia(callback: Callback<Media>) {
    this.events.onConcreteEvent(eventTypes.ROOM_MEDIA, this.id, (msg: protoEvents.RoomMedia) => {
      callback(msg.media);
    });
  }

  onTyping(callback: Callback<protoEvents.RoomTyping>) {
    this.events.onConcreteEvent(eventTypes.ROOM_TYPING, this.id, callback);
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

  constructor(room: wireEntities.Room, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    super(room, log, events, api);

    const nop = (a: proto.RoomAction) => {
      // Do nothing.
    };
    this.onLeftCallback = nop;
    this.onJoinedCallback = nop;
    this.onInvitedCallback = nop;

    this.events.onConcreteEvent(eventTypes.ROOM_ACTION, this.id, (e: protoEvents.RoomActionSent) => {
      switch (e.action.action) {
      case actionTypes.JOINED:
        this.users.push(e.action.user);
        this.onJoinedCallback(e.action);
        break;

      case actionTypes.LEFT:
        this.users = this.users.filter((u) => u !== e.action.user);
        this.onLeftCallback(e.action);
        break;

      case actionTypes.INVITED:
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

export function createRoom(room: wireEntities.Room, log: Logger, events: EventHandler, api: ArtichokeAPI): Room {
  if (room.direct) {
    return new DirectRoom(room, log, events, api);
  } else if (room.orgId) {
    return new BusinessRoom(room, log, events, api);
  } else {
    return new GroupRoom(room, log, events, api);
  }
}
