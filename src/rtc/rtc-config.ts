export interface RTCConfig extends RTCConfiguration {
    defaultOfferOptions?: RTCOfferOptions;
    defaultAnswerOptions?: RTCAnswerOptions;
    negotiationNeededDisabled?: boolean;
}
