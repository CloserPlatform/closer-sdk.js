// FIXME Can't extends RTCPeerConnection, cause createOffer & createAnswer are of the wrong type.
import { HackedMediaStreamEvent } from './hacked-mediastream-event';
import { RTCConnectionConstraints } from './rtc-connection-constraints';
import { HackedRTCOfferOptions } from './hacked-rtc-offer-options';
import { RTCAnswerOptions } from './rtc-answer-options';

export type HackedRTCPeerConnection = RTCPeerConnection & {
    connectionState: string; // FIXME RTCPeerConnectionState;
    new (config: RTCConfiguration, constraints?: RTCConnectionConstraints);
    ontrack(event: HackedMediaStreamEvent): void;
    addTrack(track: MediaStreamTrack, stream?: MediaStream): RTCRtpSender;
    removeTrack(sender: RTCRtpSender): void;
    getSenders(): Array<RTCRtpSender>;
    createOffer(options?: HackedRTCOfferOptions): Promise<RTCSessionDescription>;
    createAnswer(options?: RTCAnswerOptions): Promise<RTCSessionDescription>;
};
