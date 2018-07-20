import { defaultConfig, load, UserConfig } from './config';
import { ObjectUtils } from '../utils/object-utils';
import { LogLevel } from '../logger/log-level';

describe('Config', () => {
  it('should load with defaults', () => {
    const d = load({});

    const c = load({logLevel: LogLevel.INFO});

    expect(d).toEqual(defaultConfig);
    expect(c.logLevel).toBe(LogLevel.INFO);
    expect(c.ratel).toBeDefined();
    expect(c.chat).toBeDefined();
  });

  it('should not override provided service config', () => {
    const c = load({
      chat: {
        hostname: 'chat-nonlocalhost'
      },
      ratel: {
        hostname: 'ratel-nonlocalhost'
      },
    });

    expect(c.chat.hostname).toBe('chat-nonlocalhost');
    expect(c.ratel.hostname).toBe('ratel-nonlocalhost');
  });

  it('should not override defaultConfig', () => {
    const d = ObjectUtils.deepcopy(defaultConfig);
    load({});
    expect(defaultConfig).toEqual(d);
  });

  it('should not override supplied in config', () => {
    const cfg: UserConfig = {
      ratel: {
        hostname: 'ratel-host'
      }
    };

    const c = ObjectUtils.deepcopy(cfg);
    load(cfg);

    expect(cfg).toEqual(c);
  });

  it('should merge config deeply', () => {
    // tslint:disable-next-line:no-any
    const cfg: any = {
      chat: {
        rtc: {
          rtcpMuxPolicy: 'negotiate',
          defaultOfferOptions: {
            offerToReceiveAudio: false,
            offerToReceiveVideo: false
          }
        }
      }
    };

    const d = ObjectUtils.deepcopy(defaultConfig);
    const copy = ObjectUtils.deepcopy(cfg);
    // tslint:disable-next-line:no-any
    const c: any = load(cfg);

    expect(c.chat.rtc.rtcpMuxPolicy).toEqual(copy.chat.rtc.rtcpMuxPolicy);
    expect(c.chat.rtc.rtcpMuxPolicy).not.toEqual(d.chat.rtc.rtcpMuxPolicy);
    expect(c.chat.rtc.defaultOfferOptions).toBeDefined();
    expect(c.chat.rtc.defaultOfferOptions.offerToReceiveAudio)
      .toEqual(cfg.chat.rtc.defaultOfferOptions.offerToReceiveAudio);
  });
});
