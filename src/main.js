import { Artichoke } from "./artichoke";
import { merge } from "./utils";

const defaultConfig = {
    "rtc": {"iceServers": [{"urls": ["stun:46.101.163.186:3478", "turn:46.101.163.186:3478"],
                            "username": "test123",
                            "credential":"test456"}]},
    "url": "localhost:5431",
    "debug": false
};

let config = undefined;

export function init(sessionData, conf) {
    return new Promise(function(resolve, reject) {
        config = merge(sessionData, merge(conf, defaultConfig));

        // TODO Check if session data is valid.

        // TODO Obtain an API Key from Ratel backend.
        config.apiKey = sessionData.sessionId;

        // TODO Initialize the SDK.

        resolve();
    });
}

export function chat() {
    return new Artichoke(config);
}
