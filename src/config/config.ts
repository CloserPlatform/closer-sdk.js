import { ObjectUtils } from '../utils/object-utils';
import { LogLevel } from '../logger/log-level';
import { RTCConfig } from './rtc-config';

export interface UserArtichokeConfig {
  server?: string;
  reconnectDelayMs?: number;
  heartbeatTimeoutMultiplier?: number;
  apiPath?: string;
  wsPath?: string;
  askTimeoutMs?: number;
  reconnectionDisabled?: boolean;
}

export interface ArtichokeConfig {
  server: string;
  reconnectDelayMs: number;
  heartbeatTimeoutMultiplier: number;
  apiPath: string;
  wsPath: string;
  askTimeoutMs: number;
  reconnectionDisabled: boolean;
}

export interface UserSpinnerConfig {
  server?: string;
}

export interface SpinnerConfig {
  server: string;
}

export interface UserConfig {
  logLevel?: LogLevel;
  rtc?: RTCConfig;
  artichoke?: UserArtichokeConfig;
  spinner?: UserSpinnerConfig;
}

export interface Config {
  logLevel: LogLevel;
  rtc: RTCConfig;
  artichoke: ArtichokeConfig;
  spinner: SpinnerConfig;
}

// tslint:disable-next-line:only-arrow-functions
export function getDefaultConfig(): Config {
  return {
    logLevel: LogLevel.WARN,
    artichoke: {
      server: 'https://artichoke.closer.app',
      reconnectDelayMs: 2000,
      heartbeatTimeoutMultiplier: 2,
      reconnectionDisabled: false,
      askTimeoutMs: 5000,
      apiPath: 'api/',
      wsPath: 'ws/',
    },
    spinner: {
      server: 'https://spinner.closer.app',
    },
    rtc: {
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceServers: [{
        urls: ['stun:turn.closer.app:443', 'turn:turn.closer.app:443'],
        username: 'closer-user',
        credential: 'roxU2H%hJ7NNuiPlunS@zq+o'
      }],
    },
  };
}

export const load = (conf: UserConfig): Config => {

  // tslint:disable-next-line:no-any
  const merge = (a: any, b: any): any => {
    if (Array.isArray(a)) {
      // tslint:disable-next-line:no-unsafe-any
      return a.map((ai, i) => merge(ai, b[i]));
    } else if (typeof a === 'object') {
      const result = a;
      // tslint:disable-next-line:no-unsafe-any
      Object.getOwnPropertyNames(b).forEach((p) => result[p] = merge(a[p], b[p]));

      return result;
    } else if (typeof a === 'undefined') {
      return b;
    } else {
      return a;
    }
  };

  // tslint:disable-next-line:no-unsafe-any
  return merge(ObjectUtils.deepcopy(conf), ObjectUtils.deepcopy(getDefaultConfig()));
};
