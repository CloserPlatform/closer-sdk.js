import { VideoHint, AudioHint } from '../rtc/media-track-content-hint';

export interface RTCConfig extends RTCConfiguration {
    readonly degradationPreference?: RTCDegradationPreference; // default = 'balanced'
    readonly videoHint?: VideoHint;
    readonly audioHint?: AudioHint;
}
