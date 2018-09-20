import { RTCConfig } from '../rtc/rtc-config';
import { ObjectUtils } from '../utils/object-utils';
import { LogLevel } from '../logger/log-level';

export interface URLConfig {
  protocol?: string;
  hostname?: string;
  pathname?: string;
  port?: string;
}

export interface UserChatConfig extends URLConfig {
  rtc?: RTCConfig;
  reconnectionDisabled?: boolean;
}

export interface ChatConfig extends URLConfig {
  rtc: RTCConfig;
  reconnectionDisabled: boolean;
}

// tslint:disable-next-line:no-empty-interface
export interface RatelConfig extends URLConfig {}

export interface UserConfig {
  logLevel?: LogLevel;
  chat?: UserChatConfig;
  ratel?: RatelConfig;
}

export interface Config {
  logLevel: LogLevel;
  chat: ChatConfig;
  ratel: RatelConfig;
}

export const defaultConfig: Config = {
  logLevel: LogLevel.WARN,
  chat: {
    reconnectionDisabled: false,
    protocol: 'https:',
    hostname: 'artichoke.ratel.io',
    port: '',
    rtc: {
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceServers: [{
        urls: ['stun:turn.ratel.im:3478', 'turn:turn.ratel.im:3478'],
        username: 'test123',
        credential: 'test456'
      }]
    }
  },
  ratel: {
    protocol: 'https:',
    hostname: 'api.dev.ratel.io',
    port: '',
  },
};

export const load = (conf: UserConfig): Config => {

  // tslint:disable-next-line:no-any
  const merge = (a: any, b: any): any => {
    if (Array.isArray(a)) {
      return a.map((ai, i) => merge(ai, b[i]));
    } else if (typeof a === 'object') {
      const result = a;
      Object.getOwnPropertyNames(b).forEach((p) => result[p] = merge(a[p], b[p]));

      return result;
    } else if (typeof a === 'undefined') {
      return b;
    } else {
      return a;
    }
  };

  return merge(ObjectUtils.deepcopy(conf), ObjectUtils.deepcopy(defaultConfig));
};
