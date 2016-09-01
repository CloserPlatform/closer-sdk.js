import { Config, load } from "./config";
import { ID, Timestamp } from "./protocol";
import { Session } from "./session";

export type ApiKey = string;

export function withApiKey(sessionId: ID, apiKey: ApiKey, config: Config): Promise<Session> {
    return new Promise(function(resolve, reject) {
        // TODO Check supplied apiKey.
        config.sessionId = sessionId;
        config.apiKey = apiKey;

        resolve(new Session(load(config)));
    });
}

type Signature = string;

export interface SessionData {
    organizationId: ID;
    sessionId: ID;
    timestamp: Timestamp;
    signature: Signature;
}

export function withSignedAuth(sessionData: SessionData, config: Config): Promise<Session> {
    // TODO Check if session data is valid.
    // TODO Obtain an API Key from Ratel backend.
    return withApiKey(sessionData.sessionId, sessionData.sessionId, config);
}
