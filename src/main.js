import { Session } from "./session";
import { merge } from "./utils";

const defaultConfig = {
    "rtc": {"iceServers": [{"urls": ["stun:46.101.163.186:3478", "turn:46.101.163.186:3478"],
                            "username": "test123",
                            "credential":"test456"}]},
    "url": "localhost:5431",
    "debug": false
};

export function init(sessionData, conf) {
    return new Promise(function(resolve, reject) {
        let config = merge(sessionData, merge(conf, defaultConfig));

        // TODO Check if session data is valid.

        // TODO Obtain an API Key from Ratel backend.
        config.apiKey = sessionData.sessionId;


        resolve(new Session(config));
    });
}
