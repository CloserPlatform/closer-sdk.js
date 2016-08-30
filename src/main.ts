import { Session } from "./session";
import { merge } from "./utils";

const defaultConfig = {
    "rtc": {"iceServers": [{"urls": ["stun:turn.ratel.im:3478", "turn:turn.ratel.im:3478"],
                            "username": "test123",
                            "credential": "test456"}]},
    "url": "localhost:5431",
    "debug": false
};

export function withApiKey(sessionId, apiKey, conf) {
    return new Promise(function(resolve, reject) {
        // TODO Check supplied apiKey.
        resolve(new Session(merge({
            sessionId,
            apiKey
        }, merge(conf, defaultConfig))));
    });
}

export function withSignedAuth(sessionData, conf) {
    // TODO Check if session data is valid.
    // TODO Obtain an API Key from Ratel backend.
    return withApiKey(sessionData.sessionId, sessionData.sessionId, conf);
}
