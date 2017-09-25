import {ApiKey} from "../auth";
import {URLConfig} from "../config";

export interface Config {
  debug: boolean;

  apiKey?: ApiKey;

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
