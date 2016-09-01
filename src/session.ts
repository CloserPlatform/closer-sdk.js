import { API } from "./api";
import { Artichoke } from "./artichoke";
import { Config } from "./config";
import { EventHandler } from "./events";
import * as logger from "./logger";
import { ID } from "./protocol";

export class Session {
    public id: ID;
    public chat: Artichoke;
    public api: API;
    public events: EventHandler;

    constructor(config: Config) {
        let log = config.debug ? logger.debugConsole : logger.devNull;

        log("Configuration: " + JSON.stringify(config));

        this.id = config.sessionId;
        this.events = new EventHandler(log);
        this.api = new API(config, log);
        this.chat = new Artichoke(config, log, this.events, this.api);
    }
}
