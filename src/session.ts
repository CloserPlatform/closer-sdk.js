import { Artichoke } from './artichoke/artichoke';
import { ApiKey } from './auth/auth';
import { Config } from './config/config';
import { ID } from './protocol/protocol';
import { ArtichokeAPI } from './apis/artichoke-api';
import { RTCPoolRepository } from './rtc/rtc-pool-repository';
import { LogLevel } from './logger/log-level';
import { LoggerFactory } from './logger/logger-factory';

export class Session {
  public readonly chat: Artichoke;

  constructor(public readonly id: ID, apiKey: ApiKey, config: Config) {

    const logLevel = config.logLevel !== undefined ? config.logLevel : LogLevel.NONE;
    const loggerFactory = new LoggerFactory(logLevel);
    const logger = loggerFactory.create(`Session(${id})`);

    logger.info(`Configuration: ${JSON.stringify(config)}`);

    const artichokeAPI = new ArtichokeAPI(id, config.chat, apiKey, loggerFactory);
    const rtcPoolRepository = new RTCPoolRepository(config.chat.rtc, loggerFactory, artichokeAPI);

    this.chat = new Artichoke(artichokeAPI, loggerFactory, rtcPoolRepository);
  }
}
