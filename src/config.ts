import { ApiKey } from "./auth";
import * as logger from "./logger";
import { ID } from "./protocol/protocol";
import { RTCConfig } from "./rtc";
import { deepcopy } from "./utils";

export interface URLConfig {
  protocol?: string;
  hostname?: string;
  port?: string;
}

export interface ChatConfig extends URLConfig {
  rtc?: RTCConfig;
}

export interface RatelConfig extends URLConfig {}

export interface Config {
  logLevel?: logger.LogLevel;

  apiKey?: ApiKey;
  sessionId?: ID;

  chat?: ChatConfig;
  ratel?: RatelConfig;
}

export const defaultConfig: Config = {
  logLevel: logger.LogLevel.WARN,

  chat: {
    protocol: "https:",
    hostname: "artichoke.ratel.io",
    port: "",
    rtc: {
      rtcpMuxPolicy: "negotiate",
      bundlePolicy: "balanced",
      iceServers: [{
        urls: ["stun:turn.ratel.im:3478", "turn:turn.ratel.im:3478"],
        username: "test123",
        credential: "test456"
      }],
      defaultOfferOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }
    }
  },

  ratel: {
    protocol: "https:",
    hostname: "api.dev.ratel.io",
    port: "",
  },
};

export function load(conf: Config): Config {

  function merge(a: any, b: any): any {
    if (Array.isArray(a)) {
      return a.map((ai, i) => merge(ai, b[i]));
    } else if (typeof a === "object") {
      const result = a;
      Object.getOwnPropertyNames(b).forEach((p) => result[p] = merge(a[p], b[p]));
      return result;
    } else if (typeof a === "undefined") {
      return b;
    } else {
      return a;
    }
  }

  return merge(deepcopy(conf), deepcopy(defaultConfig));
}
