// FIXME Can't extends RTCPeerConnection, cause createOffer & createAnswer are of the wrong type.
import { HackedMediaStreamEvent } from './hacked-mediastream-event';
import { HackedRTCOfferOptions } from './hacked-rtc-offer-options';
import { RTCAnswerOptions } from './rtc-answer-options';

export type HackedRTCPeerConnection = RTCPeerConnection & {
  connectionState: string; // FIXME RTCPeerConnectionState;
  // FIXME
  // tslint:disable-next-line:no-any
  new (config: RTCConfiguration): any;
  ontrack(event: HackedMediaStreamEvent): void;
  addTrack(track: MediaStreamTrack, stream?: MediaStream): RTCRtpSender;
  removeTrack(sender: RTCRtpSender): void;
  getSenders(): ReadonlyArray<RTCRtpSender>;
  createOffer(options?: HackedRTCOfferOptions): Promise<RTCSessionDescription>;
  createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescription>;
};
