import { ApiKey } from "./auth";
import { ID } from "./protocol/protocol";
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

export interface ResourceConfig extends URLConfig {}

export interface Config {
  debug: boolean;

  apiKey?: ApiKey;
  sessionId?: ID;

  chat: ChatConfig;
  ratel: RatelConfig;
  resource: ResourceConfig;
}

export const defaultConfig: Config = {
  debug: false,

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
  },

  ratel: {
    protocol: "https:",
    hostname: "api.dev.ratel.io",
    port: "",
  },

  resource: {
    protocol: "https:",
    hostname: "wheelhouse.ratel.io",
    port: "",
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
