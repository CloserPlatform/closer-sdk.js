import { LogLevel } from '../../src';
import { Config, load } from '../../src/config/config';

export const getConfigMock = (): Config =>
  load({
    logLevel: LogLevel.DEBUG,
    artichoke: {},
    rtc: {
      iceServers: []
    }
  });
