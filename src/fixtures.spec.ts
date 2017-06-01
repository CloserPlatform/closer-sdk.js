/// <reference types="jasmine" />

import { Config, load } from "../src/config";
import * as logger from "../src/logger";
import { isBrowserSupported, isChrome, isFirefox } from "./utils";

export const log = logger.debugConsole;

export const config: Config = load({
  debug: true,
  chat: {
    rtc: {
      iceServers: []
    }
  }
} as Config);

export const sessionId = "12345678";
export const deviceId = "6515ea03-7421-4fa5-b02c-bf339c18abbf";
export const apiKey = "8615ea03-7421-4fa5-b02c-bf339c18abbf";

export function sleep(time: number): Promise<void> {
  return new Promise<void>(function(resolve, reject) {
    setTimeout(resolve, time);
  });
}

export function whenever(condition: boolean) {
  return condition ? it : xit;
}

export function isPhantomJS() {
  return !(isChrome() || isFirefox());
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
  log("Creating a stream with constraints: " + JSON.stringify(cs));
  navigator.mediaDevices.getUserMedia(cs).then(onStream).catch(onError);
}
