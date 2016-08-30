import * as config from "./config";
import { Session } from "./session";

export function withApiKey(sessionId: config.ID, apiKey: config.ApiKey, conf: config.Config): Promise<Session> {
    return new Promise(function(resolve, reject) {
        // TODO Check supplied apiKey.
        conf.sessionId = sessionId;
        conf.apiKey = apiKey;

        resolve(new Session(config.load(conf)));
    });
}

type Timestamp = number;
type Signature = string;

export interface SessionData {
    organizationId: config.ID;
    sessionId: config.ID;
    timestamp: Timestamp;
    signature: Signature;
}

export function withSignedAuth(sessionData: SessionData, conf: config.Config): Promise<Session> {
    // TODO Check if session data is valid.
    // TODO Obtain an API Key from Ratel backend.
    return withApiKey(sessionData.sessionId, sessionData.sessionId, conf);
}
