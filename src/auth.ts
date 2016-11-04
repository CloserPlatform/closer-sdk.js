import {RatelAPI} from "./api";
import {Config, load} from "./config";
import {debugConsole} from "./logger";
import {Timestamp} from "./protocol";
import {Session} from "./session";

export type ApiKey = string;
export type Signature = string;
export type RatelID = number;

export interface Payload {
  organizationId: RatelID;
  sessionId: RatelID;
  timestamp: Timestamp;
}

export interface SessionData {
  payload: Payload;
  signature: Signature;
}

export function withApiKey(sessionId: RatelID, apiKey: ApiKey, config: Config): Promise<Session> {
  return new Promise<Session>(function (resolve, reject) {
    config.sessionId = sessionId.toString();
    config.apiKey = apiKey;
    resolve(new Session(load(config)));
  });
}

export function withSignedAuth(sessionData: SessionData, config: Config): Promise<Session> {
  return new Promise<Session>(function (resolve, reject) {
    let cfg = load(config);
    let api = new RatelAPI(cfg, debugConsole); // FIXME Should be the common logger.
    api.verifySignature(sessionData).then((apiKey) => {
      withApiKey(sessionData.payload.sessionId, apiKey, cfg)
        .then(resolve)
        .catch(reject);
    }).catch(reject);
  });
}
