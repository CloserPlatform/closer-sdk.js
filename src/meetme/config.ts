import { ApiKey } from "../auth";
import { URLConfig } from "../config";

export interface Config {
  apiKey?: ApiKey;

  ws: URLConfig;
}

export const defaultConfig: Config = {
  ws: {
    protocol: "https:",
    hostname: "meetme.ratel.io",
    port: ""
  },
};
