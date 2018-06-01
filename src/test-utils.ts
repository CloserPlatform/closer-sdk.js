import {} from 'jasmine';

import { Config, load } from './config/config';
import * as logger from '../src/logger';
import { isBrowserSupported, isChrome, isFirefox } from './utils/utils';

export const log = new logger.ConsoleLogger(logger.LogLevel.WARN);

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

export function sleep(time: number): Promise<void> {
  return new Promise<void>(function(resolve, reject) {
    setTimeout(resolve, time);
  });
}

export function whenever(condition: boolean) {
  return condition ? it : xit;
}

export function isWebRTCSupported(): boolean {
  return isBrowserSupported();
}

export function getStream(onStream, onError, constraints?) {
  let cs: MediaStreamConstraints & { fake?: boolean } = constraints ? constraints : {
    video: true,
    audio: true
  };
  cs.fake = true; // NOTE For FireFox.
  log.info('Creating a stream with constraints: ' + JSON.stringify(cs));
  navigator.mediaDevices.getUserMedia(cs).then(onStream).catch(onError);
}
