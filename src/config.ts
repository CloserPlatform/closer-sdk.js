import { ApiKey } from "./auth";
import { ID } from "./protocol";

export interface Config {
    rtc?: RTCConfiguration;
    url?: string;
    debug?: boolean;

    apiKey?: ApiKey;
    sessionId?: ID;
}

const defaultConfig: Config = {
    rtc: {
        iceServers: [{
            urls: ["stun:turn.ratel.im:5349", "turn:turn.ratel.im:5349"],
            username: "test123",
            credential: "test456"
        }]
    },
    url: "artichoke.ratel.io",
    debug: false
};

function merge(a: Config, b: Config): Config {
    let result = a;
    Object.getOwnPropertyNames(b).forEach((p) => result[p] = a[p] || b[p]);
    return result;
}

export function load(conf: Config): Config {
    return merge(conf, defaultConfig);
}
