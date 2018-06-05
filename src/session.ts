import { Artichoke } from './artichoke/artichoke';
import { ApiKey } from './auth/auth';
import { Config } from './config/config';
import { EventHandler } from './events/event-handler';
import * as logger from './logger';
import { ID } from './protocol/protocol';
import { ArtichokeAPI } from './apis/artichoke-api';

export class Session {
  public id: ID;
  public chat: Artichoke;

  constructor(id: ID, apiKey: ApiKey, config: Config) {
    const logLevel = config.logLevel !== undefined ? config.logLevel : logger.LogLevel.NONE;
    const log = new logger.ConsoleLogger(logLevel);

    log.info('Configuration: ' + JSON.stringify(config));

    this.id = id;
    const events: EventHandler = new EventHandler(log);
    const chatApi = new ArtichokeAPI(id, apiKey, config.chat, log);
    this.chat = new Artichoke(config.chat, log, events, chatApi);
  }
}
