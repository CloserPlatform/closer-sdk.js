/// <reference types="jasmine" />

import { Config, load } from "../src/config";
import * as logger from "../src/logger";

// tslint:disable-next-line
export const validSDP = "v=0\r\no=mozilla...THIS_IS_SDPARTA-48.0.2 7349388552458473530 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=fingerprint:sha-256 7E:FF:F7:C0:DE:DC:5F:61:5F:58:9D:98:EA:AF:50:F2:31:18:6C:1A:83:CC:35:1F:81:6F:25:2B:BF:24:C2:2A\r\na=group:BUNDLE sdparta_0 sdparta_1\r\na=ice-options:trickle\r\na=msid-semantic:WMS *\r\nm=audio 9 UDP/TLS/RTP/SAVPF 109\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=fmtp:109 maxplaybackrate=48000;stereo=1\r\na=ice-pwd:8bbbd0ccd83e22a2c73907c2357ae156\r\na=ice-ufrag:c93c7fba\r\na=mid:sdparta_0\r\na=msid:{787066e6-1670-4af3-9baf-2481b0e6f6e4} {43ed513c-c0df-443d-a2f9-05d5196efe9a}\r\na=rtcp-mux\r\na=rtpmap:109 opus/48000/2\r\na=setup:active\r\na=ssrc:440372546 cname:{18c89a75-3441-4413-9674-cb2f86e9e287}\r\nm=video 9 UDP/TLS/RTP/SAVPF 120\r\nc=IN IP4 0.0.0.0\r\na=sendrecv\r\na=fmtp:120 max-fs=12288;max-fr=60\r\na=ice-pwd:8bbbd0ccd83e22a2c73907c2357ae156\r\na=ice-ufrag:c93c7fba\r\na=mid:sdparta_1\r\na=msid:{787066e6-1670-4af3-9baf-2481b0e6f6e4} {67c49144-c9fa-43de-8245-136358eca457}\r\na=rtcp-fb:120 nack\r\na=rtcp-fb:120 nack pli\r\na=rtcp-fb:120 ccm fir\r\na=rtcp-mux\r\na=rtpmap:120 VP8/90000\r\na=setup:active\r\na=ssrc:3848411584 cname:{18c89a75-3441-4413-9674-cb2f86e9e287}\r\n";

// tslint:disable-next-line
export const invalidSDP = "v=0\r\no=- 9212849432138844847 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=msid-semantic: WMS\r\n";

export const log = logger.debugConsole;

export const config: Config = load({
  debug: true,
  hostname: "localhost",
  protocol: "http:",
  port: "5431"
} as Config);

export const sessionId = "12345678";
export const apiKey = "8615ea03-7421-4fa5-b02c-bf339c18abbf";

export function sleep(time: number): Promise<void> {
  return new Promise<void>(function(resolve, reject) {
    setTimeout(resolve, time);
  });
}

export function whenever(condition: boolean) {
  return condition ? it : xit;
}

export function isChrome() {
  return typeof window["chrome"] !== "undefined";
}

export function isFirefox() {
  return navigator.userAgent.indexOf("Firefox") !== -1;
}

export function isWebRTCSupported(): boolean {
  return [typeof RTCPeerConnection,
          typeof webkitRTCPeerConnection,
          typeof mozRTCPeerConnection].some((t) => t !== "undefined");
}

export function getStream(onStream, onError) {
  let constraints = {
    fake: true, // NOTE For FireFox.
    video: true,
    audio: true
  };
  if (typeof navigator.getUserMedia !== "undefined") {
    navigator.getUserMedia(constraints, onStream, onError);
  } else if (typeof navigator.mediaDevices.getUserMedia !== "undefined") {
    navigator.mediaDevices.getUserMedia(constraints).then(onStream).catch(onError);
  } else if (typeof navigator.mozGetUserMedia !== "undefined") {
    navigator.mozGetUserMedia(constraints, onStream, onError);
  } else if (typeof navigator.webkitGetUserMedia !== "undefined") {
    navigator.webkitGetUserMedia(constraints, onStream, onError);
  }
}
