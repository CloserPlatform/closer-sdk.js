import { ApiKey } from "./auth";
import { ID } from "./protocol";
import { deepcopy } from "./utils";

export interface URLConfig {
  protocol: string;
  hostname: string;
  port: string;
}

export interface ChatConfig extends URLConfig {
  rtc: RTCConfiguration;
}

export interface RatelConfig extends URLConfig {}

export interface Config {
  debug: boolean;

  apiKey?: ApiKey;
  sessionId?: ID;

  ratel: RatelConfig;
  chat: ChatConfig;
}

export const defaultConfig: Config = {
  debug: false,

  ratel: {
    protocol: "https:",
    hostname: "api.dev.ratel.io",
    port: "",
  },

  chat: {
    protocol: "https:",
    hostname: "artichoke.ratel.io",
    port: "",
    rtc: {
      iceServers: [{
        urls: ["stun:turn.ratel.im:5349", "turn:turn.ratel.im:5349"],
        username: "test123",
        credential: "test456"
      }]
    }
  }
};

function merge<O>(a: O, b: O): O {
  let result = a;
  Object.getOwnPropertyNames(b).forEach((p) => result[p] = a[p] || b[p]);
  return result;
}

export function load(conf: Config): Config {
  return merge(deepcopy(conf), deepcopy(defaultConfig));
}
