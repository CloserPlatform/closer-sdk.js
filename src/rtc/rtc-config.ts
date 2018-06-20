export interface RTCConfig extends RTCConfiguration {
    defaultOfferOptions?: RTCOfferOptions;
    defaultAnswerOptions?: RTCAnswerOptions;
    rtcpMuxPolicy?: 'require' | 'negotiate';
    bundlePolicy?: 'balanced' | 'max-compat' | 'max-bundle';
}
