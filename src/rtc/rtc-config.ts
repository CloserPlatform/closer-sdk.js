import { HackedRTCOfferOptions } from './hacked-rtc-offer-options';
import { RTCAnswerOptions } from './rtc-answer-options';
import { RTCConnectionConstraints } from './rtc-connection-constraints';

export interface RTCConfig extends RTCConfiguration {
    defaultOfferOptions?: HackedRTCOfferOptions;
    defaultAnswerOptions?: RTCAnswerOptions;
    defaultConnectionConstraints?: RTCConnectionConstraints;
    rtcpMuxPolicy?: 'require' | 'negotiate';
    bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
}
