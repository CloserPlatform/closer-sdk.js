import { Config, load, UserConfig } from '../config/config';
import { ID, Timestamp } from '../protocol/protocol';
import { Session } from '../session';
import { RatelAPI } from '../apis/ratel-api';
import { LogLevel } from '../logger/log-level';
import { LoggerFactory } from '../logger/logger-factory';

export type ApiKey = string;
export type Signature = string;

export interface Payload {
  orgId: ID;
  externalId: ID;
  timestamp: Timestamp;
}

export interface SessionData {
  payload: Payload;
  signature: Signature;
}

export interface AgentContext {
  id: ID;
  orgId: ID;
  apiKey: ApiKey;
}

export const withApiKey = (sessionId: ID, apiKey: ApiKey, config: UserConfig): Promise<Session> =>
  Promise.resolve(new Session(sessionId, apiKey, load(config)));

export const withSignedAuth = (sessionData: SessionData, config: Config): Promise<Session> => {
  const cfg = load(config);

  const logLevel = config.logLevel !== undefined ? config.logLevel : LogLevel.NONE;
  const loggerFactory = new LoggerFactory(logLevel);
  const api = new RatelAPI(cfg.ratel, loggerFactory);

  return api.verifySignature(sessionData).then((context: AgentContext) =>
    withApiKey(context.id, context.apiKey, cfg));
};
