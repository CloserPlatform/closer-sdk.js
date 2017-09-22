import {ApiKey} from "../auth";
import {URLConfig} from "../config";
import {ID} from "../protocol/protocol";

export interface Config {
  debug: boolean;

  apiKey?: ApiKey;
  sessionId?: ID;

  ws: URLConfig;
}

export const defaultConfig: Config = {
  debug: false,
  ws: {
    protocol: "https:",
    hostname: "meetme.ratel.io",
    port: ""
  },
};
