// tslint:disable-next-line:no-implicit-dependencies
import {} from 'jasmine';

import { Config, load } from './config/config';
import * as logger from '../src/logger';
import { BrowserUtils } from './utils/browser-utils';

export const log = new logger.ConsoleLogger(logger.LogLevel.WARN);

// tslint:disable-next-line:no-object-literal-type-assertion
export const config: Config = load({
  debug: true,
  chat: {
    rtc: {
      iceServers: []
    }
  }
} as Config);

export const sessionIdMock = '12345678';
export const deviceIdMock = '6515ea03-7421-4fa5-b02c-bf339c18abbf';
export const apiKeyMock = '8615ea03-7421-4fa5-b02c-bf339c18abbf';

export const sleep = (time: number): Promise<void> =>
  new Promise<void>((resolve, reject): void => {
    setTimeout(resolve, time);
  });

export const whenever = (condition: boolean):
  (expectation: string, assertion?: (done: DoneFn) => void, timeout?: number) => void =>
  condition ? it : xit;

export const isWebRTCSupported = (): boolean =>
  BrowserUtils.isBrowserSupported();

export const getStream = (onStream: (stream: MediaStream) => void, onError: (err: Error) => void,
                          constraints?: MediaStreamConstraints): void => {
  const cs: MediaStreamConstraints & { fake?: boolean } = constraints ? constraints : {
    video: true,
    audio: true
  };
  cs.fake = true; // NOTE For FireFox.
  log.info('Creating a stream with constraints: ' + JSON.stringify(cs));
  navigator.mediaDevices.getUserMedia(cs).then(onStream).catch(onError);
};
