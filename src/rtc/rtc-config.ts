import { HackedRTCOfferOptions } from './hacked-rtc-offer-options';
import { RTCAnswerOptions } from './rtc-answer-options';

export interface RTCConfig extends RTCConfiguration {
    defaultOfferOptions?: HackedRTCOfferOptions;
    defaultAnswerOptions?: RTCAnswerOptions;
    rtcpMuxPolicy?: 'require' | 'negotiate';
    bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
}
