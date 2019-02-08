export interface RTCConfig extends RTCConfiguration {
    defaultOfferOptions?: RTCOfferOptions;
    defaultAnswerOptions?: RTCAnswerOptions;
    negotiationNeededDisabled?: boolean;
    sdpSemantics?: 'plan-b' | 'unified-plan';
}
