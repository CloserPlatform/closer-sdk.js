import { ApiKey } from "../auth";
import { Callback, EventHandler } from "../events";
import { JSONWebSocket } from "../jsonws";
import * as logger from "../logger";
import { Logger } from "../logger";
import { Config } from "./config";
import { codec, MeetmeEvent } from "./event";

export class MeetmeWebsocket {
  protected log: Logger;

  private url: string;

  private socket: JSONWebSocket<MeetmeEvent>;
  private events: EventHandler<MeetmeEvent>;

  constructor(apiKey: ApiKey, config: Config) {
    this.log = config.debug ? logger.debugConsole : logger.devNull;

    this.log("Configuration: " + JSON.stringify(config));
    this.events = new EventHandler(this.log, codec);
    this.socket = new JSONWebSocket(this.log, codec);

    let host = config.ws.hostname + (config.ws.port === "" ? "" : ":" + config.ws.port);
    this.url = [config.ws.protocol, "//", host, "/ws/", apiKey].join("");
  }

  connect() {
    this.socket.connect(this.url);
  }

  disconnect() {
    this.socket.disconnect();
  }

  onEvent(callback: Callback<MeetmeEvent>) {
    this.socket.onDisconnect(callback);
    this.socket.onError(callback);
    this.socket.onEvent(callback);
  }
}
