import { Artichoke } from "./artichoke";
import * as config from "./config";
import { EventHandler } from "./events";
import * as logger from "./logger";

export class Session {
    public id: config.ID;
    public chat: Artichoke;
    public events: EventHandler;

    constructor(conf: config.Config) {
        let log = conf.debug ? logger.debugConsole : logger.devNull;

        log("Configuration: " + JSON.stringify(conf));

        this.id = conf.sessionId;
        this.events = new EventHandler(log);
        this.chat = new Artichoke(conf, log, this.events);
    }
}
