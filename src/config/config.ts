import * as logger from '../logger';
import { RTCConfig } from '../rtc/rtc-config';
import { ObjectUtils } from '../utils/object-utils';

export interface URLConfig {
  protocol?: string;
  hostname?: string;
  pathname?: string;
  port?: string;
}

export interface UserChatConfig extends URLConfig {
  rtc?: RTCConfig;
}

export interface ChatConfig extends URLConfig {
  rtc: RTCConfig;
}

// tslint:disable-next-line:no-empty-interface
export interface RatelConfig extends URLConfig {}

export interface UserConfig {
  logLevel?: logger.LogLevel;
  chat?: UserChatConfig;
  ratel?: RatelConfig;
}

export interface Config {
  logLevel: logger.LogLevel;
  chat: ChatConfig;
  ratel: RatelConfig;
}

export const defaultConfig: Config = {
  logLevel: logger.LogLevel.WARN,

  chat: {
    protocol: 'https:',
    hostname: 'artichoke.ratel.io',
    port: '',
    rtc: {
      rtcpMuxPolicy: 'negotiate',
      bundlePolicy: 'balanced',
      iceServers: [{
        urls: ['stun:turn.ratel.im:3478', 'turn:turn.ratel.im:3478'],
        username: 'test123',
        credential: 'test456'
      }],
      defaultOfferOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      }
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
