import { ArtichokeAPI } from "./api";
import { Artichoke } from "./artichoke";
import { ApiKey } from "./auth";
import { Config } from "./config";
import { EventHandler } from "./events";
import * as logger from "./logger";
import { ID } from "./protocol/protocol";
import { codec, Event } from "./protocol/wire-events";

export class Session {
  public id: ID;
  public chat: Artichoke;

  constructor(id: ID, apiKey: ApiKey, config: Config) {
    let log = config.debug ? logger.debugConsole : logger.devNull;

    log("Configuration: " + JSON.stringify(config));

    this.id = id;
    const events: EventHandler<Event> = new EventHandler<Event>(log, codec);
    const chatApi = new ArtichokeAPI(apiKey, config.chat, log);
    this.chat = new Artichoke(config.chat, log, events, chatApi);
  }
}
