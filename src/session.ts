import { ArtichokeAPI } from "./api";
import { Artichoke } from "./artichoke";
import { ApiKey } from "./auth";
import { Config } from "./config";
import { EventHandler } from "./events";
import * as logger from "./logger";
import { ID } from "./protocol/protocol";

export class Session {
  public id: ID;
  public chat: Artichoke;

  constructor(id: ID, apiKey: ApiKey, config: Config) {
    let log = config.debug ? logger.debugConsole : logger.devNull;

    log("Configuration: " + JSON.stringify(config));

    this.id = id;
    const events: EventHandler = new EventHandler(log);
    const chatApi = new ArtichokeAPI(apiKey, config.chat, log);
    this.chat = new Artichoke(config.chat, log, events, chatApi);
  }
}
