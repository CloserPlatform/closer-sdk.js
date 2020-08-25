import { VideoHint, AudioHint } from '../rtc/media-track-content-hint';

export interface RTCConfig extends RTCConfiguration {
    readonly optimizeVideoForFPS?: boolean;
    readonly reconnectOnFailure?: boolean;
    readonly videoHint?: VideoHint;
    readonly audioHint?: AudioHint;
}
