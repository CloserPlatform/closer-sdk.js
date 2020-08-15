import { Config, getDefaultConfig, load, UserConfig } from '../../../src/config/config';
import { ObjectUtils } from '../../../src/utils/object-utils';
import { LogLevel } from '../../../src';

describe('Config', () => {
  it('should load with defaults', () => {
    const d = load({});

    const c = load({logLevel: LogLevel.INFO});

    expect(d).toEqual(getDefaultConfig());
    expect(c.logLevel).toBe(LogLevel.INFO);
    expect(c.rtc).toBeDefined();
    expect(c.artichoke).toBeDefined();
    expect(c.spinner).toBeDefined();
  });

  it('should not override provided service config', () => {
    const server = 'http://test.new';
    const c = load({
      artichoke: {
        server
      }
    });

    expect(c.artichoke.server).toEqual(server);
  });

  it('should not override defaultConfig', () => {
    const d = ObjectUtils.deepcopy(getDefaultConfig());
    load({});
    expect(getDefaultConfig()).toEqual(d);
  });

  it('should not override supplied in config', () => {
    const cfg: UserConfig = {
      artichoke: {
        server: 'http://test.new'
      }
    };

    const c = ObjectUtils.deepcopy(cfg);
    load(cfg);

    expect(cfg).toEqual(c);
  });

  it('should merge config deeply', () => {
    const userConfig = {
      rtc: {
        rtcpMuxPolicy: 'negotiate'
      }
    };

    const defaultConfig = ObjectUtils.deepcopy(getDefaultConfig());
    const userConfigCopy = ObjectUtils.deepcopy(userConfig);

    const config: Config = load(userConfig as UserConfig);

    expect(config.rtc.rtcpMuxPolicy).toEqual(userConfigCopy.rtc.rtcpMuxPolicy as 'negotiate');
    expect(config.rtc.rtcpMuxPolicy).not.toEqual(defaultConfig.rtc.rtcpMuxPolicy);
  });

  it('overwrite array in config', () => {
    const userUrl = 'stun:turn.anymind.com:80';
    const userConfig = {
      rtc: {
        rtcpMuxPolicy: 'negotiate',
        iceServers: [{
          urls: [
            userUrl,
          ],
          username: 'username',
          credential: 'password',
        }],
      }
    };

    const config = load(userConfig as UserConfig);

    expect(config.rtc.iceServers).toEqual(userConfig.rtc.iceServers);
  });
});
