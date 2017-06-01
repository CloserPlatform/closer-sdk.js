import { ApiKey } from "./auth";
import { ID } from "./protocol/protocol";
import { deepcopy } from "./utils";

export interface URLConfig {
  protocol: string;
  hostname: string;
  port: string;
}

export interface ChatConfig extends URLConfig {
  // FIXME @types/webrtc is lacking latest additions to the standard.
  rtc: RTCConfiguration & { rtcpMuxPolicy: "require" | "negotiate" };
}

export interface RatelConfig extends URLConfig {}

export interface Config {
  debug: boolean;

  apiKey?: ApiKey;
  sessionId?: ID;

  chat: ChatConfig;
  ratel: RatelConfig;
}

export const defaultConfig: Config = {
  debug: false,

  chat: {
    protocol: "https:",
    hostname: "artichoke.ratel.io",
    port: "",
    rtc: {
      rtcpMuxPolicy: "negotiate",
      iceServers: [{
        urls: ["stun:turn.ratel.im:3478", "turn:turn.ratel.im:3478"],
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
};

function merge<O>(a: O, b: O): O {
  let result = a;
  Object.getOwnPropertyNames(b).forEach((p) => result[p] = a[p] || b[p]);
  return result;
}

export function load(conf: Config): Config {
  return merge(deepcopy(conf), deepcopy(defaultConfig));
}
