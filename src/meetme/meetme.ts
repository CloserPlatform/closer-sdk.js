import { Callback, EventHandler } from "../events";
import { JSONWebSocket } from "../jsonws";
import * as logger from "../logger";
import { Logger } from "../logger";
import { Config } from "./config";
import * as events from "./events";
import { MeetmeEventType } from "./events";

export class MeetmeWebsocket {
  protected log: Logger;

  private socket: JSONWebSocket<events.MeetmeEvent>;
  private events: EventHandler<events.MeetmeEvent>;

  constructor(debug = true) {
    this.log = debug ? logger.debugConsole : logger.devNull;
  }

  connect(config: Config) {
    this.events = new EventHandler(this.log, events.codec);
    this.socket = new JSONWebSocket(this.log, events.codec);

    let host = config.ws.hostname + (config.ws.port === "" ? "" : ":" + config.ws.port);
    const url = [config.ws.protocol, "//", host, "/ws/", config.apiKey].join("");
    this.socket.connect(url);
    this.socket.onEvent((e) => this.notify(e));
  }

  disconnect() {
    this.socket.disconnect();
  }

  onPresenceUpdated(callback: Callback<events.PresencedUpdated>) {
    this.events.onEvent(MeetmeEventType.PRESENCE_UPDATED, callback);
  }

  onTyping(callback: Callback<events.Typing>) {
    this.events.onEvent(MeetmeEventType.TYPING, callback);
  }

  onMessage(callback: Callback<events.MessageSent>) {
    this.events.onEvent(MeetmeEventType.MESSAGE_SENT, callback);
  }

  onJoined(callback: Callback<events.RoomJoined>) {
    this.events.onEvent(MeetmeEventType.ROOM_JOINED, callback);
  }

  onLeft(callback: Callback<events.RoomLeft>) {
    this.events.onEvent(MeetmeEventType.ROOM_LEFT, callback);
  }

  private notify(event: events.MeetmeEvent): void {
    this.events.notify(event, (e) => {
        this.events.notify(events.error("Unhandled " + e.type));
      }
    );
  }
}
