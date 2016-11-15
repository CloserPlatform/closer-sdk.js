import { ArtichokeAPI } from "./api";
import { Call, createCall, DirectCall } from "./call";
import { ChatConfig } from "./config";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { createMessage } from "./message";
import * as proto from "./protocol";
import { createRoom, DirectRoom, Room } from "./room";
import { wrapPromise } from "./utils";

export class Artichoke {
  private api: ArtichokeAPI;
  private config: ChatConfig;
  private log: Logger;
  private events: EventHandler;

  constructor(config: ChatConfig, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.api = api;
    this.config = config;
    this.log = log;
    this.events = events;

    // NOTE Disable some events by default.
    let nop = (e: proto.Event) => {
      // Do nothing.
    };
    events.onEvent("error", nop);
    events.onEvent("chat_received", nop);
    events.onEvent("chat_delivered", nop);
  }

  // Callbacks:
  onConnect(callback: Callback<proto.Event>) {
    this.events.onEvent("hello", callback);
  }

  onError(callback: Callback<proto.Error>) {
    this.events.onError(callback);
  }

  // API:
  connect() {
    this.api.connect();

    this.api.onEvent((e: proto.Event) => {
      switch (e.type) {
      case "call_invitation":
        let c = e as proto.CallInvitation;
        c.call = createCall(c.call, this.config.rtc, this.log, this.events, this.api);
        this.events.notify(c);
        break;

      case "room_invitation":
        let i = e as proto.RoomInvitation;
        i.room = createRoom(i.room, this.log, this.events, this.api);
        this.events.notify(i);
        break;

      case "room_message":
        let m = e as proto.RoomMessage;
        m.message = createMessage(m.message, this.log, this.events, this.api);
        this.events.notify(m);
        break;

      default:
        this.events.notify(e);
      }
    });
  }

  // Bot API:
  onBotUpdate(callback: Callback<proto.BotUpdated>) {
    this.events.onEvent("bot_updated", callback);
  }

  createBot(name: string, callback?: string): Promise<proto.Bot> {
    return this.api.createBot(name, callback);
  }

  getBot(bot: proto.ID): Promise<proto.Bot> {
    return this.api.getBot(bot);
  }

  getBots(): Promise<Array<proto.Bot>> {
    return this.api.getBots();
  }

  // Call API:
  onCall(callback: Callback<proto.CallInvitation>) {
    this.events.onEvent("call_invitation", callback);
  }

  createDirectCall(peer: proto.ID): Promise<DirectCall> {
    return this.wrapCall(this.api.createDirectCall(peer));
  }

  createCall(users: Array<proto.ID>): Promise<Call> {
    return this.wrapCall(this.api.createCall(users));
  }

  getCall(call: proto.ID): Promise<Call | DirectCall> {
    return this.wrapCall(this.api.getCall(call));
  }

  getCalls(): Promise<Array<Call | DirectCall>> {
    return this.wrapCall(this.api.getCalls());
  }

  // Chat room API:
  onRoom(callback: Callback<proto.RoomInvitation>) {
    this.events.onEvent("room_invitation", callback);
  }

  createRoom(name: string): Promise<Room> {
    return this.wrapRoom(this.api.createRoom(name));
  }

  createDirectRoom(peer: proto.ID): Promise<DirectRoom> {
    return this.wrapRoom(this.api.createDirectRoom(peer));
  }

  getRoom(room: proto.ID): Promise<Room | DirectRoom> {
    return this.wrapRoom(this.api.getRoom(room));
  }

  getRooms(): Promise<Array<Room | DirectRoom>> {
    return this.wrapRoom(this.api.getRooms());
  }

  getRoster(): Promise<Array<Room | DirectRoom>> {
    return this.wrapRoom(this.api.getRoster());
  }

  // Presence API:
  onStatusUpdate(callback: Callback<proto.Presence>) {
    this.events.onEvent("presence", callback);
  }

  setStatus(status: proto.Status) {
    this.api.setStatus(status, Date.now());
  }

  // Utils:
  private wrapCall(promise: Promise<proto.Call | Array<proto.Call>>) {
    return wrapPromise(promise, (call) => createCall(call, this.config.rtc, this.log, this.events, this.api));
  }

  private wrapRoom(promise: Promise<proto.Room | Array<proto.Room>>) {
    return wrapPromise(promise, (room: proto.Room) => createRoom(room, this.log, this.events, this.api));
  }
}
