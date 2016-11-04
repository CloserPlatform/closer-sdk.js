import { ApiKey } from "./auth";
import { ID } from "./protocol";
import { deepcopy } from "./utils";

export interface URLConfig {
  protocol?: string;
  hostname?: string;
  port?: string;
}

export interface ChatConfig extends URLConfig {
  rtc?: RTCConfiguration;
}

export interface RatelConfig extends ChatConfig {}

export interface Config extends URLConfig {
  debug?: boolean;

  apiKey?: ApiKey;
  sessionId?: ID;

  ratel?: RatelConfig;
  chat?: ChatConfig;
}

export const defaultConfig: Config = {
  debug: false,

  protocol: "https:",
  hostname: "api.dev.ratel.io",
  port: "",

  chat: {
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
  let cfg = merge(deepcopy(conf), deepcopy(defaultConfig));
  let url = {
    protocol: cfg.protocol,
    hostname: cfg.hostname,
    port: cfg.port
  };

  cfg.ratel = merge<URLConfig>(cfg.ratel || {}, url);
  cfg.chat = merge<URLConfig>(cfg.chat || {}, url);

  return cfg;
}
