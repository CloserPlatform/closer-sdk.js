export interface HackedRTCOfferOptions {
    // FIXME @types/webrtc defines this interface to use numbers instead of booleans.
    offerToReceiveAudio: boolean;
    offerToReceiveVideo: boolean;
}
