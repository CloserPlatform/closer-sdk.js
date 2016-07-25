import { Artichoke } from "./artichoke";
import { uuid4 } from "./utils";

let config = {
    "rtc": {"iceServers": [{"urls": ["stun:46.101.163.186:3478", "turn:46.101.163.186:3478"],
                            "username": "test123",
                            "credential":"test456"}]},
    "url": "localhost:5431",
    "apiKey": undefined,
    "debug": false
};

function merge(cfg) {
    Object.getOwnPropertyNames(config).forEach((p) => {
        config[p] = cfg[p] || config[p];
    });
}

export function init(conf) {
    return new Promise(function(resolve, reject) {
        merge(conf);

        // FIXME Actually connect to Ratel & authorize the user.

        resolve();
    });
}

export function chat() {
    return new Artichoke(config);
}
