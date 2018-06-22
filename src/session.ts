import { Artichoke } from './artichoke/artichoke';
import { ApiKey } from './auth/auth';
import { Config } from './config/config';
import { ID } from './protocol/protocol';
import { ArtichokeAPI } from './apis/artichoke-api';
import { ConsoleLogger, LogLevel } from './logger';
import { RTCPoolRepository } from './rtc/rtc-pool-repository';

export class Session {
  public id: ID;
  public chat: Artichoke;

  constructor(id: ID, apiKey: ApiKey, config: Config) {
    this.id = id;

    const logLevel = config.logLevel !== undefined ? config.logLevel : LogLevel.NONE;
    const logger = new ConsoleLogger(logLevel);

    logger.info(`Configuration: ${JSON.stringify(config)}`);

    const artichokeAPI = new ArtichokeAPI(id, apiKey, config.chat, logger);
    const rtcPoolRepository = new RTCPoolRepository(config.chat.rtc, logger, artichokeAPI);

    this.chat = new Artichoke(artichokeAPI, logger, rtcPoolRepository);
  }
}
