import { ArtichokeAPI, WheelHouseAPI } from "./api";
import { Artichoke } from "./artichoke";
import { ApiKey } from "./auth";
import { Config } from "./config";
import { EventHandler } from "./events";
import * as logger from "./logger";
import { ID } from "./protocol";
import { WheelHouse } from "./wheelhouse";

export class Session {
  public id: ID;
  public chat: Artichoke;
  public api: ArtichokeAPI;
  public events: EventHandler;
  public campaign: WheelHouse;

  constructor(id: ID, apiKey: ApiKey, config: Config) {
    let log = config.debug ? logger.debugConsole : logger.devNull;

    log("Configuration: " + JSON.stringify(config));

    this.id = id;
    this.events = new EventHandler(log);
    this.api = new ArtichokeAPI(apiKey, config.chat, log);
    this.chat = new Artichoke(config.chat, log, this.events, this.api);
    const wheelHouseApi = new WheelHouseAPI(apiKey, config.resource, log);
    this.campaign = new WheelHouse(config.resource, log, this.events, wheelHouseApi, this.api);
  }
}
