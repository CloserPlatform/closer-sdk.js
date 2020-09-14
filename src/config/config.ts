import { ObjectUtils } from '../utils/object-utils';
import { LogLevel } from '../logger/log-level';
import { RTCConfig } from './rtc-config';

export interface UserArtichokeConfig {
  readonly server?: string;
  readonly reconnectDelayMs?: number;
  readonly heartbeatTimeoutMultiplier?: number;
  readonly apiPath?: string;
  readonly wsPath?: string;
  readonly askTimeoutMs?: number;
  readonly reconnectionDisabled?: boolean;
}

export interface ArtichokeConfig {
  readonly server: string;
  readonly reconnectDelayMs: number;
  readonly heartbeatTimeoutMultiplier: number;
  readonly apiPath: string;
  readonly wsPath: string;
  readonly askTimeoutMs: number;
  readonly reconnectionDisabled: boolean;
}

export interface UserSpinnerConfig {
  readonly server?: string;
  readonly apiPath?: string;
}

export interface SpinnerConfig {
  readonly server: string;
  readonly apiPath: string;
}

export interface UserConfig {
  readonly logLevel?: LogLevel;
  readonly rtc?: RTCConfig;
  readonly artichoke?: UserArtichokeConfig;
  readonly spinner?: UserSpinnerConfig;
}

export interface Config {
  readonly logLevel: LogLevel;
  readonly rtc: RTCConfig;
  readonly artichoke: ArtichokeConfig;
  readonly spinner: SpinnerConfig;
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
      apiPath: 'api/',
    },
    rtc: {
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    },
  };
}

export const load = (conf: UserConfig): Config => {

  // tslint:disable-next-line
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
