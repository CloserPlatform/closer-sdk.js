import { Config, load } from '../config/config';
import * as logger from '../logger';
import { ID, Timestamp } from '../protocol/protocol';
import { Session } from '../session';
import { RatelAPI } from '../apis/ratel-api';

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

export function withApiKey(sessionId: ID, apiKey: ApiKey, config: Config): Promise<Session> {
  return Promise.resolve(new Session(sessionId, apiKey, load(config)));
}

export function withSignedAuth(sessionData: SessionData, config: Config): Promise<Session> {
  const cfg = load(config);
  // FIXME Logger should be the common logger.
  const logLevel = config.logLevel !== undefined ? config.logLevel : logger.LogLevel.NONE;
  const api = new RatelAPI(cfg.ratel, new logger.ConsoleLogger(logLevel));

  return api.verifySignature(sessionData).then((context: AgentContext) =>
    withApiKey(context.id, context.apiKey, cfg));
}
